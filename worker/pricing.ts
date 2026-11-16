// Pricing tiers: the database is the source of truth — the public
// pricing page, the contact form, and the dashboards all read these
// rows. The frontend keeps a built-in copy as a fallback for when
// the lookup fails.

import { json, makeThrottle, clientIp } from './http';
import type { D1Database, Env } from './env';

/** Discounts are percents off the LIST price, added — never
    multiplied — and they live in the `discounts` table: one row per
    client holding their total earned percent and how many leads
    they have generated. The ladder: a lead who arrives through a
    referral token (or the hidden on-site code) starts at 10%; a
    client's first generated lead adds 10 points; each lead after
    that adds 5; the total never passes 50%. A completed-and-paid
    project sets a 15% floor (the dashboard Worker applies that —
    never a reduction: a larger earned total is never lowered to
    it). Quote-time caps apply per project type: installs cap at
    25%, feature and upgrade work at 50%. */
export const REFERRAL_PCT = 10;
export const FIRST_LEAD_PCT = 10;
export const FURTHER_LEAD_PCT = 5;
export const DISCOUNT_CAP_PCT = 50;
export const INSTALL_DISCOUNT_CAP = 25;
export const FEATURE_DISCOUNT_CAP = 50;

/** The percent a quote may actually apply: the earned total,
    clamped to the cap for the project type. Unknown types price
    like an install (the conservative cap). */
export function clampDiscountPct(projectType: string, earnedPct: number): number {
  const cap = projectType === 'feature' || projectType === 'upgrade' ? FEATURE_DISCOUNT_CAP : INSTALL_DISCOUNT_CAP;
  return Math.max(0, Math.min(cap, earnedPct));
}

/** What one more generated lead earns: 10 points for the first
    lead, 5 for every lead after that. */
export function nextLeadIncrement(leadsCount: number): number {
  return leadsCount <= 0 ? FIRST_LEAD_PCT : FURTHER_LEAD_PCT;
}

/** The referrer's new total after one fresh lead: the increment
    for that lead, capped at 50%. Returns the new total and the
    points actually added (0 once the cap is reached). */
export function applyLeadReward(
  currentPct: number,
  leadsCount: number,
): { pct: number; increment: number } {
  const pct = Math.min(DISCOUNT_CAP_PCT, currentPct + nextLeadIncrement(leadsCount));
  return { pct, increment: pct - currentPct };
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
