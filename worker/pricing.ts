// Pricing tiers: the database is the source of truth — the public
// pricing page, the contact form, and the dashboards all read these
// rows. The frontend keeps a built-in copy as a fallback for when
// the lookup fails.

import { json, makeThrottle, clientIp } from './http';
import type { D1Database, Env } from './env';

/** Discounts are percents off the LIST price, added — never
    multiplied. An established client's feature work starts at 15%
    off; a referral reward adds 10 points, for 25% off total.
    First-time customers start at 0 (10% if they arrived through a
    referral token) and add 10 points by generating a lead before
    billing, for 20% off total.
    The database stores only the referral-earned portion on feature
    rows (0 or 10) — the 15% baseline is derived here, so flipping a
    client to established needs no row update and old rows read
    correctly. Stored values stay inside the CHECK (0,10,20). */
export const ESTABLISHED_FEATURE_BASE_PCT = 15;
export const REFERRAL_PCT = 10;
export const INSTALL_DISCOUNT_CAP = 20;
export const FEATURE_DISCOUNT_CAP = 25;

/** The discount a row actually confers: the stored value, plus the
    15% established baseline on feature rows of established clients
    (capped at 25%). Install rows have no baseline. */
export function effectiveDiscountPct(
  projectType: string,
  storedPct: number,
  isClient: boolean,
): number {
  if (projectType === 'feature' && isClient) {
    return Math.min(FEATURE_DISCOUNT_CAP, ESTABLISHED_FEATURE_BASE_PCT + storedPct);
  }
  return storedPct;
}

/** The final quoted price: tier price minus the total percent off. */
export function quotePriceCents(tierPriceCents: number, effectivePct: number): number {
  return Math.round(tierPriceCents * (1 - effectivePct / 100));
}

export interface PricingTier {
  id: number;
  name: string;
  priceCents: number;
  description: string;
  /** False for dashboard-only tiers (Free) — forms never offer them. */
  isPublic: boolean;
}

export async function listTiers(db: D1Database, publicOnly = false): Promise<PricingTier[]> {
  const base = 'SELECT id, name, price_cents, description, is_public FROM pricing_tiers';
  const sql = publicOnly ? `${base} WHERE is_public = 1 ORDER BY id` : `${base} ORDER BY id`;
  try {
    const res = await db.prepare(sql).all<{ id: number; name: string; price_cents: number; description: string; is_public: number }>();
    return res.results.map((r) => ({
      id: r.id,
      name: r.name,
      priceCents: r.price_cents,
      description: r.description ?? '',
      isPublic: r.is_public === 1,
    }));
  } catch (err) {
    // Pre-migration schema (no is_public column): every tier that
    // exists is public, so the unfiltered list is the right answer.
    const res = await db.prepare('SELECT id, name, price_cents, description FROM pricing_tiers ORDER BY id').all<{ id: number; name: string; price_cents: number; description: string }>();
    return res.results.map((r) => ({
      id: r.id,
      name: r.name,
      priceCents: r.price_cents,
      description: r.description ?? '',
      isPublic: true,
    }));
  }
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
    // Public endpoint: dashboard-only tiers (Free) stay out.
    return json({ ok: true, tiers: await listTiers(env.DB_CLIENTS, true) });
  } catch (err) {
    console.error('Pricing lookup failed:', err);
    return json({ ok: false, error: 'Pricing is not configured yet.' }, 503);
  }
}
