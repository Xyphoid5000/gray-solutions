// Pricing tiers: the database is the source of truth — the public
// pricing page, the contact form, and the dashboards all read these
// rows. The frontend keeps a built-in copy as a fallback for when
// the lookup fails.

import { json, makeThrottle, clientIp } from './http';
import type { D1Database, Env } from './env';

/** A feature on an established client's site prices at 85% of the tier. */
export const FEATURE_RATE = 0.85;

export interface PricingTier {
  id: number;
  name: string;
  priceCents: number;
  description: string;
}

/** The final quoted price: tier price, feature rate when it applies,
    then the discount. Rounded to the cent. */
export function quotePriceCents(
  tierPriceCents: number,
  projectType: string,
  discountPct: number,
): number {
  const base = projectType === 'feature' ? tierPriceCents * FEATURE_RATE : tierPriceCents;
  return Math.round(base * (1 - discountPct / 100));
}

export async function listTiers(db: D1Database): Promise<PricingTier[]> {
  const res = await db
    .prepare('SELECT id, name, price_cents, description FROM pricing_tiers ORDER BY id')
    .all<{ id: number; name: string; price_cents: number; description: string }>();
  return res.results.map((r) => ({
    id: r.id,
    name: r.name,
    priceCents: r.price_cents,
    description: r.description ?? '',
  }));
}

const pricingThrottle = makeThrottle(30, 15 * 60 * 1000);

export async function handlePricing(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }
  if (!env.DB_CLIENTS) {
    return json({ ok: false, error: 'Pricing is not configured yet.' }, 503);
  }
  const ip = clientIp(request);
  if (pricingThrottle.blocked(ip)) {
    return json({ ok: false, error: 'Too many requests.' }, 429);
  }
  pricingThrottle.record(ip);
  try {
    return json({ ok: true, tiers: await listTiers(env.DB_CLIENTS) });
  } catch (err) {
    console.error('Pricing lookup failed:', err);
    return json({ ok: false, error: 'Pricing is not configured yet.' }, 503);
  }
}
