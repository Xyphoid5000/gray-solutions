// Pricing tiers: the database is the source of truth — the public
// pricing page, the contact form, and the dashboards all read these
// rows. The frontend keeps a built-in copy as a fallback for when
// the lookup fails.

import { json, makeThrottle, clientIp } from './http';
import type { D1Database, Env } from './env';

/** Discounts are percents off the LIST price, added — never
    multiplied — and they live in the `discounts` table: one row per
    client holding their total earned percent and how many leads
    they have generated. The model: a lead who arrives through a
    referral token (10%), the hidden on-site code (10%), or a
    global code such as HOLIDAY25 (25%) starts at the best of those
    — an arrival discount, never gated, never capped by status, and
    spent when it is applied to a project. Every generated lead
    then earns the referrer a flat +5%, gated by the referrer's
    status: onboarding banks 0, prospective banks at most 2,
    current banks at most 5 — the referral COUNT is the bound, so
    there is no percentage cap anywhere in the code. A
    published current client (live site) has a 15% floor. In
    practice a total never exceeds 50 (max arrival 25 + max earned
    25); the discounts table CHECK (0-50) is the backstop, a
    data-integrity ceiling, not a business cap. When a discount is
    applied to a project that is then completed AND fully paid, the
    total falls back to the floor (0, or 15% once current) and
    leads_count resets to 0 — the dashboard Worker applies that
    reset, never this one. */
export const REFERRAL_PCT = 10;
/** Arrival percent for a lead who comes through a share link. */
export const REFERRAL_ARRIVAL_PCT = 10;
/** Flat percent one generated lead earns the referrer. */
export const REFERRAL_EARN_PCT = 5;
/** Referral-count caps by client status — the only caps. */
export const REFERRAL_CAP_ONBOARDING = 0;
export const REFERRAL_CAP_PROSPECTIVE = 2;
export const REFERRAL_CAP_CURRENT = 5;
/** Floor for a published current client (live site). */
export const COMPLETION_FLOOR_PCT = 15;

/** What one more generated lead earns: a flat 5 points, whatever
    the referrer has banked so far. The status gate in the caller
    is the bound — there is no percentage cap. */
export function nextLeadIncrement(_leadsCount: number): number {
  return REFERRAL_EARN_PCT;
}

/** The referrer's new total after one fresh lead: a flat +5 on
    whatever they hold. Returns the new total and the points
    actually added (always 5 — the caller gates by status cap
    before calling). */
export function applyLeadReward(
  currentPct: number,
  leadsCount: number,
): { pct: number; increment: number } {
  const increment = nextLeadIncrement(leadsCount);
  return { pct: currentPct + increment, increment };
}

/** The final quoted price: tier price minus the total percent off.
    The earned percent applies in full — no clamp. */
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
