// Dashboard client: session-token storage, authed requests, and the
// shapes the dashboard API returns. The token lives in localStorage
// (a dashboard sign-in should survive a refresh) and travels as a
// Bearer header — except request-image links, which open in a new
// tab and carry it as a query param.

import type { PricingTier } from './pricing';

export interface DashboardPricing {
  projectType: string;
  tierId: number | null;
  tierName: string | null;
  discountPct: number;
  quotedPriceCents: number | null;
  billed: boolean;
}

export interface DashboardClient {
  id: number;
  businessName: string;
  contactName: string;
  email: string;
  isClient: boolean;
  pricing: DashboardPricing | null;
}

export interface DashboardRequest {
  id: number;
  clientId: number;
  clientName: string;
  type: string;
  details: string;
  hasImage: boolean;
  imageKey: string | null;
  status: string;
  tierId: number | null;
  tierName: string | null;
  createdAt: string;
}

export interface DashboardMe {
  role: 'admin' | 'client';
  email: string;
  /** The signed-in client (null when no client record exists yet). */
  client: DashboardClient | null;
  /** Admin only: every client. */
  clients?: DashboardClient[];
  pricing: DashboardPricing | null;
  requests: DashboardRequest[];
  tiers: PricingTier[];
  uploadsEnabled: boolean;
}

const TOKEN_KEY = 'gs-dashboard-token';

export function getDashboardToken(): string {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setDashboardToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage blocked — the session lasts until the tab closes */
  }
}

export function clearDashboardToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function dashboardFetch(
  path: string,
  init: RequestInit = {},
): Promise<{ res: Response; data: Record<string, unknown> }> {
  const headers = new Headers(init.headers);
  const token = getDashboardToken();
  if (token) headers.set('authorization', `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { res, data };
}

export function imageUrl(imageKey: string): string {
  return `/api/request-image?key=${encodeURIComponent(imageKey)}&token=${encodeURIComponent(getDashboardToken())}`;
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'in_progress':
      return 'In progress';
    case 'done':
      return 'Done';
    case 'declined':
      return 'Declined';
    default:
      return 'New';
  }
}

export function requestTypeLabel(type: string): string {
  return type === 'feature' ? 'Feature' : 'Change';
}
