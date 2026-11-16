// Pricing tiers: the database is the source of truth (GET /api/pricing),
// with a built-in copy as the fallback for when the lookup fails — the
// page and the form never render without prices.

export interface PricingTier {
  id: number;
  name: string;
  priceCents: number;
  description: string;
  /** False for dashboard-only tiers (Free) — forms never offer them. */
  isPublic: boolean;
}

export const FALLBACK_TIERS: PricingTier[] = [
  {
    id: 1,
    name: 'Static page',
    priceCents: 80000,
    description: 'A custom-designed, hand-coded site with no backend.',
    isPublic: true,
  },
  {
    id: 2,
    name: 'Web application',
    priceCents: 220000,
    description: 'A static site plus backend features — forms that save, logins, updatable content.',
    isPublic: true,
  },
  {
    id: 3,
    name: 'Payment processing',
    priceCents: 300000,
    description: 'A web application with payment processing — checkout and invoices, built in.',
    isPublic: true,
  },
];

export function formatPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}

export function discountedPrice(cents: number, discountPct: number): number {
  return Math.round(cents * (1 - discountPct / 100));
}

export async function fetchPricingTiers(): Promise<PricingTier[]> {
  try {
    const res = await fetch('/api/pricing');
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; tiers?: unknown };
    if (res.ok && data.ok === true && Array.isArray(data.tiers) && data.tiers.length > 0) {
      const tiers = data.tiers.filter(
        (t): t is PricingTier =>
          !!t &&
          typeof t === 'object' &&
          typeof (t as PricingTier).id === 'number' &&
          typeof (t as PricingTier).name === 'string' &&
          typeof (t as PricingTier).priceCents === 'number',
      );
      if (tiers.length > 0) return tiers;
    }
  } catch {
    /* fall through to the built-in tiers */
  }
  return FALLBACK_TIERS;
}
