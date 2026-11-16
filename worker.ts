// Cloudflare Worker entry: serves the static site, plus the contact-form
// API, the referral-token API, and the pricing API. The client/admin
// dashboard lives on its own subdomain (dashboard.graywebsolutions.com,
// served by the dashboard-template Worker) — /dashboard paths redirect
// there, preserving the query string so old magic links keep working.
//
// Non-API requests fall through to the static assets (same behavior as the
// dashboard-managed assets-only setup). POST /api/contact sends the inquiry
// to chris@graywebsolutions.com via Resend. GET /api/referral?token=xxx
// looks a share-link token up in the shared client database
// (gray-solutions-db, bound as DB_CLIENTS) and marks it opened.
// GET /api/pricing returns the pricing tiers from the same database.
// GET /api/featured returns the featured client sites (the
// client_features table) for the book and the projects page, and
// GET /api/featured-image?key= serves a featured site's screenshot
// from R2 — only keys the table references.
//
// Every contact submission is also recorded in the client database
// (best-effort, after the email to Chris goes out — a database failure
// never blocks the inquiry). A submission through a referral token or
// the hidden on-site code gives the lead 10% off, kept in the
// `discounts` table. Every fresh lead a token brings in earns the
// referrer more off — 10 points for the first lead, 5 per lead after,
// capped at 50% — and a discount-status email each time. The lead's
// submission also creates (or refreshes) their install project in
// `client_project`: a picked tier quotes at tier price minus the
// lead's discount, capped at 25% for installs.

import { json, clientIp } from './worker/http';
import { CHRIS_EMAIL, type D1Database, type Env } from './worker/env';
import { handleFeatured, handleFeaturedImage } from './worker/featured';
import {
  handlePricing,
  quotePriceCents,
  clampDiscountPct,
  applyLeadReward,
  nextLeadIncrement,
  REFERRAL_PCT,
  DISCOUNT_CAP_PCT,
} from './worker/pricing';

interface ContactPayload {
  name?: string;
  email?: string;
  phone?: string;
  hasSite?: string;
  siteUrl?: string;
  comments?: string;
  discountLine?: string;
  /** True when the visitor's discount code matched the live code. */
  discountVerified?: boolean;
  /** Referral token from ?ref=, when the visit came through a share link. */
  referralToken?: string;
  /** Pricing tier the visitor picked, when they picked one. */
  tierId?: unknown;
  /** Honeypot — real users leave this empty. */
  company?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Referral-lookup throttle: per-isolate in-memory map, 30 lookups /
// 15 min / IP. Tokens are unguessable, so this only blunts scanning.
const lookups = new Map<string, { count: number; resetAt: number }>();
const MAX_LOOKUPS = 30;
const WINDOW_MS = 15 * 60 * 1000;

function lookupThrottled(ip: string): boolean {
  const entry = lookups.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    lookups.delete(ip);
    return false;
  }
  return entry.count >= MAX_LOOKUPS;
}

function recordLookup(ip: string): void {
  const now = Date.now();
  const entry = lookups.get(ip);
  if (!entry || now > entry.resetAt) {
    lookups.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

async function handleReferral(request: Request, env: Env): Promise<Response> {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!token || token.length > 128 || !env.DB_CLIENTS) {
    return json({ ok: true, valid: false });
  }
  const ip = clientIp(request);
  if (lookupThrottled(ip)) {
    return json({ ok: true, valid: false });
  }
  recordLookup(ip);

  const row = await env.DB_CLIENTS.prepare(
    `SELECT t.opened AS opened, c.business_name AS businessName
     FROM referral_tokens t JOIN clients c ON c.id = t.client_id
     WHERE t.token = ?`,
  )
    .bind(token)
    .first<{ opened: number; businessName: string }>();
  if (!row) return json({ ok: true, valid: false });

  // First open stamps the token; later visits are no-ops.
  if (!row.opened) {
    try {
      await env.DB_CLIENTS.prepare(
        `UPDATE referral_tokens SET opened = 1, opened_at = datetime('now') WHERE token = ?`,
      )
        .bind(token)
        .run();
    } catch (err) {
      console.error('Referral open-mark failed:', err);
    }
  }
  return json({ ok: true, valid: true, referrer: row.businessName, discountPct: 10 });
}

function businessNameFor(name: string, siteUrl: string): string {
  if (siteUrl) {
    try {
      const host = new URL(siteUrl).hostname.replace(/^www\./, '');
      if (host) return host.slice(0, 200);
    } catch {
      /* fall through to the contact name */
    }
  }
  return name.slice(0, 200);
}

/** A referrer's discount-status email: their current total, how it
    was earned, what the next referral earns, and their share link.
    The lead is never named. This is the one discount email the
    marketing Worker sends — it supersedes the old first-use-only
    referrer email: every fresh lead earns one. The dashboard Worker
    sends the same email when a project completion sets the 15%
    floor. */
async function sendDiscountStatusEmail(
  env: Env,
  referrer: { email: string; contact_name: string; business_name: string },
  newPct: number,
  leadsCount: number,
  token: string,
): Promise<void> {
  const name = referrer.contact_name || referrer.business_name;
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const nextLine =
    newPct >= DISCOUNT_CAP_PCT
      ? `You've reached the maximum discount of ${DISCOUNT_CAP_PCT}% off — thank you for spreading the word.`
      : `Your next referral earns you ${nextLeadIncrement(leadsCount)}% more off, up to ${DISCOUNT_CAP_PCT}% off.`;
  const text = [
    greeting,
    '',
    'Good news — a new lead came in through the link you shared.',
    '',
    `Your total discount is now ${newPct}% off. ${nextLine}`,
    '',
    `Your share link: https://graywebsolutions.com/?ref=${token}`,
    '',
    'Thanks for spreading the word.',
    '',
    '— Chris',
    'Gray Web Solutions',
  ].join('\n');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Gray Web Solutions <${CHRIS_EMAIL}>`,
      to: [referrer.email],
      subject: `Your Gray Web Solutions discount: ${newPct}% off`,
      text,
    }),
  });
  if (!res.ok) {
    console.error('Discount email failed:', res.status, await res.text().catch(() => ''));
    throw new Error('Discount email failed');
  }
}

/** A client_project id: a 7-character lowercase hex "short SHA",
    like a short git hash — short enough to quote in email subjects
    and reply-to addresses. */
function newProjectId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 7);
}

/** Records a contact submission in the client database. Best-effort:
    throws nothing — callers log and continue, because the email to
    Chris already went out. */
async function recordSubmission(
  env: Env,
  db: D1Database,
  input: {
    name: string;
    email: string;
    siteUrl: string;
    discountVerified: boolean;
    referralToken: string;
    tierId: number | null;
  },
): Promise<void> {
  const email = input.email.toLowerCase();
  const businessName = businessNameFor(input.name, input.siteUrl);
  await db
    .prepare(
      `INSERT INTO clients (business_name, contact_name, email) VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         contact_name = CASE WHEN contact_name = '' THEN excluded.contact_name ELSE contact_name END,
         updated_at = datetime('now')`,
    )
    .bind(businessName, input.name, email)
    .run();
  const lead = await db
    .prepare('SELECT id, is_client FROM clients WHERE email = ?')
    .bind(email)
    .first<{ id: number; is_client: number }>();
  if (!lead) return;
  await db
    .prepare('INSERT OR IGNORE INTO discounts (client_id) VALUES (?)')
    .bind(lead.id)
    .run();

  // A valid token identifies the referrer. An unknown token confers
  // nothing — only a real share link (or the verified on-site code)
  // earns the lead 10%.
  let tokenRow: { id: number; client_id: number; used: number } | null = null;
  if (input.referralToken) {
    tokenRow = await db
      .prepare('SELECT id, client_id, used FROM referral_tokens WHERE token = ?')
      .bind(input.referralToken)
      .first<{ id: number; client_id: number; used: number }>();
  }
  if (tokenRow || input.discountVerified) {
    await db
      .prepare(
        `UPDATE discounts SET discount_pct = MAX(discount_pct, ?), updated_at = datetime('now') WHERE client_id = ?`,
      )
      .bind(REFERRAL_PCT, lead.id)
      .run();
  }
  const leadDiscount = await db
    .prepare('SELECT id, discount_pct FROM discounts WHERE client_id = ?')
    .bind(lead.id)
    .first<{ id: number; discount_pct: number }>();

  // The install project: every inquiry lands as one (or refreshes
  // the open one). A picked tier quotes at tier price minus the
  // lead's discount, capped at 25% for installs; no tier means an
  // unquoted project for Chris to price by hand. An existing
  // project is touched only while its status is 'new' or 'quoted'
  // — in-flight or completed work is never clobbered, and a
  // tier-less repeat submission never wipes a quote already
  // recorded. Its own try/catch, so a project-table problem never
  // blocks the referral reward below.
  try {
    let tierPrice: number | null = null;
    if (input.tierId) {
      const tier = await db
        .prepare('SELECT price_cents FROM pricing_tiers WHERE id = ?')
        .bind(input.tierId)
        .first<{ price_cents: number }>();
      if (tier) tierPrice = tier.price_cents;
    }
    const existing = await db
      .prepare(
        `SELECT id, status FROM client_project WHERE client_id = ? AND type = 'install' ORDER BY rowid DESC LIMIT 1`,
      )
      .bind(lead.id)
      .first<{ id: string; status: string }>();
    if (!existing) {
      const appliedPct = leadDiscount ? clampDiscountPct('install', leadDiscount.discount_pct) : 0;
      const price = tierPrice === null ? null : quotePriceCents(tierPrice, appliedPct);
      let created = false;
      for (let attempt = 0; attempt < 3 && !created; attempt++) {
        try {
          await db
            .prepare(
              `INSERT INTO client_project (id, client_id, type, name, description, tier_id, price_cents, status, remaining_balance_cents, discount_id, request_id, completion_reward_applied)
               VALUES (?, ?, 'install', 'Website install', '', ?, ?, 'new', ?, ?, NULL, 0)`,
            )
            .bind(newProjectId(), lead.id, tierPrice === null ? null : input.tierId, price, price, leadDiscount?.id ?? null)
            .run();
          created = true;
        } catch (err) {
          if (attempt === 2) throw err;
        }
      }
    } else if ((existing.status === 'new' || existing.status === 'quoted') && tierPrice !== null) {
      const appliedPct = leadDiscount ? clampDiscountPct('install', leadDiscount.discount_pct) : 0;
      const price = quotePriceCents(tierPrice, appliedPct);
      await db
        .prepare(
          `UPDATE client_project SET tier_id = ?, price_cents = ?, remaining_balance_cents = ?, discount_id = ?, updated_at = datetime('now') WHERE id = ?`,
        )
        .bind(input.tierId, price, price, leadDiscount?.id ?? null, existing.id)
        .run();
    }
  } catch (err) {
    console.error('Install project record skipped:', err);
  }

  // The referrer's reward: one attribution per lead, recorded in
  // referral_leads, so the ladder counts each lead exactly once no
  // matter how often a token is used or a form re-submitted. The
  // discount-status email goes out BEFORE the rows land — if the
  // send fails, nothing is recorded and a later submission retries
  // the notification. A client submitting through their own link
  // keeps the 10% arrival discount but earns no referral reward.
  if (tokenRow && env.RESEND_API_KEY) {
    const attributed = await db
      .prepare('SELECT id FROM referral_leads WHERE lead_client_id = ?')
      .bind(lead.id)
      .first<{ id: number }>();
    if (!attributed) {
      const referrer = await db
        .prepare('SELECT id, email, contact_name, business_name FROM clients WHERE id = ?')
        .bind(tokenRow.client_id)
        .first<{ id: number; email: string; contact_name: string; business_name: string }>();
      if (referrer && referrer.id !== lead.id) {
        await db
          .prepare('INSERT OR IGNORE INTO discounts (client_id) VALUES (?)')
          .bind(referrer.id)
          .run();
        const referrerDiscount = await db
          .prepare('SELECT id, discount_pct, leads_count FROM discounts WHERE client_id = ?')
          .bind(referrer.id)
          .first<{ id: number; discount_pct: number; leads_count: number }>();
        if (referrerDiscount) {
          const reward = applyLeadReward(referrerDiscount.discount_pct, referrerDiscount.leads_count);
          await sendDiscountStatusEmail(
            env,
            referrer,
            reward.pct,
            referrerDiscount.leads_count + 1,
            input.referralToken,
          );
          await db
            .prepare('INSERT OR IGNORE INTO referral_leads (referrer_client_id, lead_client_id, token) VALUES (?, ?, ?)')
            .bind(referrer.id, lead.id, input.referralToken)
            .run();
          await db
            .prepare(
              `UPDATE discounts SET discount_pct = ?, leads_count = ?, updated_at = datetime('now') WHERE client_id = ?`,
            )
            .bind(reward.pct, referrerDiscount.leads_count + 1, referrer.id)
            .run();
          await db
            .prepare(`UPDATE referral_tokens SET used = 1, used_at = datetime('now') WHERE id = ?`)
            .bind(tokenRow.id)
            .run();
        }
      }
    }
  }
}

async function handleContact(request: Request, env: Env): Promise<Response> {
  if (!env.RESEND_API_KEY) {
    return json({ ok: false, error: 'Email service is not configured yet.' }, 503);
  }

  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return json({ ok: false, error: 'Invalid request body.' }, 400);
  }

  // Honeypot: bots fill this in, humans never see it.
  if (payload.company) {
    return json({ ok: true });
  }

  const name = (payload.name ?? '').trim();
  const email = (payload.email ?? '').trim();
  const phone = (payload.phone ?? '').trim();
  const hasSite = payload.hasSite === 'yes';
  const siteUrl = (payload.siteUrl ?? '').trim();
  const comments = (payload.comments ?? '').trim();
  const discountLine = (payload.discountLine ?? '').trim() || 'Discount code: —';
  const discountVerified = payload.discountVerified === true;
  const referralToken = (payload.referralToken ?? '').trim().slice(0, 128);
  const tierIdRaw = typeof payload.tierId === 'number' ? payload.tierId : NaN;
  const tierId = Number.isInteger(tierIdRaw) && tierIdRaw > 0 ? tierIdRaw : null;

  if (!name || !EMAIL_RE.test(email) || !comments) {
    return json({ ok: false, error: 'Please fill in your name, a valid email, and your project details.' }, 400);
  }

  const to = env.CONTACT_TO || CHRIS_EMAIL;
  const from = env.CONTACT_FROM || 'website@graywebsolutions.com';

  // Name the picked tier in the inquiry email when the tier table
  // exists; a missing table just omits the line.
  let tierLine = '';
  if (tierId && env.DB_CLIENTS) {
    try {
      const tier = await env.DB_CLIENTS.prepare('SELECT name FROM pricing_tiers WHERE id = ?')
        .bind(tierId)
        .first<{ name: string }>();
      if (tier) tierLine = `Pricing tier: ${tier.name}`;
    } catch {
      /* pre-v2 schema — omit the line */
    }
  }

  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || '—'}`,
    `Existing site: ${hasSite ? `Yes — ${siteUrl || '—'}` : 'No'}`,
    discountLine,
    tierLine,
    referralToken ? `Referral token: ${referralToken}` : '',
    '',
    comments,
  ]
    .filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Gray Web Solutions <${from}>`,
      to: [to],
      reply_to: email,
      subject: `Website inquiry from ${name}`,
      text,
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = await res.text();
    }
    console.error('Resend error:', res.status, detail);
    return json({ ok: false, error: 'Something went wrong sending your message. Please try again.' }, 502);
  }

  // Record the inquiry in the client database. Failures here never
  // fail the submission — the email above already went out.
  if (env.DB_CLIENTS) {
    try {
      await recordSubmission(env, env.DB_CLIENTS, {
        name,
        email,
        siteUrl,
        discountVerified,
        referralToken,
        tierId,
      });
    } catch (err) {
      console.error('Client record failed:', err);
    }
  }

  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'Method not allowed.' }, 405);
      }
      return handleContact(request, env);
    }
    if (url.pathname === '/api/referral') {
      if (request.method !== 'GET') {
        return json({ ok: false, error: 'Method not allowed.' }, 405);
      }
      return handleReferral(request, env);
    }
    if (url.pathname === '/api/pricing') {
      return handlePricing(request, env);
    }
    if (url.pathname === '/api/featured') {
      return handleFeatured(request, env);
    }
    if (url.pathname === '/api/featured-image') {
      return handleFeaturedImage(request, env);
    }
    // The dashboard moved to its own subdomain. Old /dashboard URLs —
    // including emailed magic links, which carry ?token= — redirect
    // there with the path and query intact (same DB, same HMAC key on
    // the new Worker, so the tokens still verify).
    if (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/')) {
      return Response.redirect(
        `https://dashboard.graywebsolutions.com${url.pathname}${url.search}`,
        302,
      );
    }
    return env.ASSETS.fetch(request);
  },
};
