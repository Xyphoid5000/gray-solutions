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
// never blocks the inquiry). A submission through a referral token gives
// the lead 10% off; the first submission through a token earns the
// referrer 10 more points off — on their install if it isn't billed
// yet, on future feature work if it is (established clients always
// earn it on features, taking their feature discount to 25% off list).
// Discounts are percents off list, added: a picked pricing tier quotes
// straight into the pricing row at tier price minus the total percent
// off.

import { json, clientIp } from './worker/http';
import { CHRIS_EMAIL, type D1Database, type Env } from './worker/env';
import { handleFeatured, handleFeaturedImage } from './worker/featured';
import {
  handlePricing,
  quotePriceCents,
  effectiveDiscountPct,
  REFERRAL_PCT,
  INSTALL_DISCOUNT_CAP,
  FEATURE_DISCOUNT_CAP,
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
  /** 'install' for a new site; 'feature' for work on an existing site. */
  projectType?: string;
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

async function sendReferrerEmail(
  env: Env,
  referrerEmail: string,
  referrerName: string,
  leadName: string,
  leadSite: string,
  reward: { type: 'install' | 'feature'; totalPct: number; isEstablished: boolean },
): Promise<void> {
  const greeting = referrerName ? `Hi ${referrerName},` : 'Hi,';
  const leadBit = leadSite ? `${leadName} (${leadSite})` : leadName;
  let subject: string;
  let rewardLine: string;
  if (reward.isEstablished) {
    subject = 'Your Gray Web Solutions share link was used — 25% off future feature work';
    rewardLine = `Your discount on future feature work is now ${FEATURE_DISCOUNT_CAP}% off list: the 15% returning-client rate, plus 10% for the referral. And they get 10% off theirs.`;
  } else if (reward.type === 'install') {
    subject = 'Your Gray Web Solutions share link was used — 10% more off your website';
    rewardLine = `That earns you 10% more off: your total discount is now ${reward.totalPct}% off your website. And they get 10% off theirs.`;
  } else {
    subject = 'Your Gray Web Solutions share link was used — 10% off future feature work';
    rewardLine =
      'Your install was already billed, so that earns you 10% off future feature work on your site instead. And they get 10% off theirs.';
  }
  const text = [
    greeting,
    '',
    `Good news — ${leadBit} reached out to Gray Web Solutions through the link you shared.`,
    '',
    rewardLine,
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
      to: [referrerEmail],
      subject,
      text,
    }),
  });
  if (!res.ok) {
    console.error('Referrer email failed:', res.status, await res.text().catch(() => ''));
    throw new Error('Referrer email failed');
  }
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
    projectType: string;
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
    .prepare('INSERT OR IGNORE INTO client_pricing (client_id) VALUES (?)')
    .bind(lead.id)
    .run();

  let discount = input.discountVerified ? 10 : 0;
  let firstUse: { tokenId: number; referrerId: number; referrerEmail: string; referrerName: string; isEstablished: boolean } | null = null;
  if (input.referralToken) {
    const tok = await db
      .prepare('SELECT id, client_id, used FROM referral_tokens WHERE token = ?')
      .bind(input.referralToken)
      .first<{ id: number; client_id: number; used: number }>();
    if (tok) {
      discount = Math.max(discount, 10);
      if (!tok.used) {
        const referrer = await db
          .prepare('SELECT id, email, contact_name, business_name, is_client FROM clients WHERE id = ?')
          .bind(tok.client_id)
          .first<{ id: number; email: string; contact_name: string; business_name: string; is_client: number }>();
        if (referrer) {
          firstUse = {
            tokenId: tok.id,
            referrerId: referrer.id,
            referrerEmail: referrer.email,
            referrerName: referrer.contact_name || referrer.business_name,
            isEstablished: referrer.is_client === 1,
          };
        }
      }
    }
  }

  // The lead's discount is for their new site — the install row
  // only. A feature row they may already hold keeps its own terms.
  if (discount > 0) {
    await db
      .prepare(
        `UPDATE client_pricing SET discount_pct = MAX(discount_pct, ?), updated_at = datetime('now') WHERE client_id = ? AND project_type = 'install'`,
      )
      .bind(discount, lead.id)
      .run();
  }

  // A picked tier quotes straight into the pricing row for this
  // (client, project type): tier price minus the total percent off.
  // The row stores the referral-earned portion only — the effective
  // percent (with the established feature baseline) prices the quote
  // but is never written back, so stored values stay inside the
  // CHECK (0,10,20). Its own try/catch — on the pre-v3 schema (no
  // composite key) the upsert fails, the discount recording above
  // already landed, and the quote is simply skipped until the schema
  // is upgraded.
  if (input.tierId) {
    try {
      const tier = await db
        .prepare('SELECT price_cents FROM pricing_tiers WHERE id = ?')
        .bind(input.tierId)
        .first<{ price_cents: number }>();
      if (tier) {
        const current = await db
          .prepare('SELECT discount_pct FROM client_pricing WHERE client_id = ? AND project_type = ?')
          .bind(lead.id, input.projectType)
          .first<{ discount_pct: number }>();
        const stored = current ? current.discount_pct : discount;
        const effective = effectiveDiscountPct(
          input.projectType,
          stored,
          lead.is_client === 1,
        );
        const quoted = quotePriceCents(tier.price_cents, effective);
        await db
          .prepare(
            `INSERT INTO client_pricing (client_id, project_type, tier_id, discount_pct, quoted_price_cents, billed)
             VALUES (?, ?, ?, ?, ?, 0)
             ON CONFLICT(client_id, project_type) DO UPDATE SET
               tier_id = excluded.tier_id,
               quoted_price_cents = excluded.quoted_price_cents,
               billed = 0,
               updated_at = datetime('now')`,
          )
          .bind(lead.id, input.projectType, input.tierId, stored, quoted)
          .run();
      }
    } catch (err) {
      console.error('Quote record skipped:', err);
    }
  }

  // The referrer's reward and the used-mark land only after their email
  // goes out — if the send fails, the token stays unused and a later
  // submission through it retries the notification. The reward is
  // +10 points, capped: established referrers earn it on future
  // feature work (25% off total with the baseline). Prospects earn it
  // on their install if it isn't billed yet (10% + 10% = 20% total
  // for token arrivals); a billed install banks it toward future
  // features instead.
  if (firstUse && env.RESEND_API_KEY) {
    let rewardType: 'install' | 'feature' = 'feature';
    let rewardTotal = FEATURE_DISCOUNT_CAP;
    if (!firstUse.isEstablished) {
      const install = await db
        .prepare("SELECT discount_pct, billed FROM client_pricing WHERE client_id = ? AND project_type = 'install'")
        .bind(firstUse.referrerId)
        .first<{ discount_pct: number; billed: number }>();
      if (install && install.billed === 1) {
        rewardType = 'feature';
        rewardTotal = REFERRAL_PCT;
      } else {
        rewardType = 'install';
        rewardTotal = Math.min((install?.discount_pct ?? 0) + REFERRAL_PCT, INSTALL_DISCOUNT_CAP);
      }
    }
    await sendReferrerEmail(
      env,
      firstUse.referrerEmail,
      firstUse.referrerName,
      input.name,
      input.siteUrl,
      { type: rewardType, totalPct: rewardTotal, isEstablished: firstUse.isEstablished },
    );
    await db
      .prepare('INSERT OR IGNORE INTO client_pricing (client_id, project_type) VALUES (?, ?)')
      .bind(firstUse.referrerId, rewardType)
      .run();
    if (rewardType === 'install') {
      await db
        .prepare(
          `UPDATE client_pricing SET discount_pct = MIN(discount_pct + ?, ?), updated_at = datetime('now') WHERE client_id = ? AND project_type = 'install'`,
        )
        .bind(REFERRAL_PCT, INSTALL_DISCOUNT_CAP, firstUse.referrerId)
        .run();
    } else {
      await db
        .prepare(
          `UPDATE client_pricing SET discount_pct = MAX(discount_pct, ?), updated_at = datetime('now') WHERE client_id = ? AND project_type = 'feature'`,
        )
        .bind(REFERRAL_PCT, firstUse.referrerId)
        .run();
    }
    await db
      .prepare(`UPDATE referral_tokens SET used = 1, used_at = datetime('now') WHERE id = ?`)
      .bind(firstUse.tokenId)
      .run();
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
  const projectType = payload.projectType === 'feature' ? 'feature' : 'install';

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
        projectType,
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
