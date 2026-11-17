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
// Every signup is also recorded in the client database — the
// account row is created BEFORE the email to Chris goes out, so
// a signup that can't create an account never looks like it
// succeeded. The form is for NEW signups only: an email that
// already has an account is rejected with a 409, before anything
// is sent or recorded — existing clients use their dashboard.
// A submission through a referral token or the hidden on-site
// code gives the lead 10% off, kept in the `discounts` table.
// Every fresh lead a token brings in earns the referrer more
// off — 10 points for the first lead, 5 per lead after, capped
// at 50% — and a discount-status email each time. The signup
// seeds the discussion thread with the visitor's message; no
// project is created — projects come later, from the dashboard
// conversation. The form can pre-check an email through
// GET /api/contact/check-email, which answers whether the email
// already has an account.

import { json, clientIp, makeThrottle } from './worker/http';
import { hashPassword } from './worker/crypto';
import { CHRIS_EMAIL, type D1Database, type Env } from './worker/env';
import { handleFeatured, handleFeaturedImage } from './worker/featured';
import {
  handlePricing,
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
  /** The password for the new dashboard login. Never logged,
      never emailed — only its hash is stored. */
  password?: string;
  /** Must match `password`; checked client- and server-side. */
  confirmPassword?: string;
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

/** Whether the email already has a client row — an account. The
    email column is COLLATE NOCASE, so the match is
    case-insensitive. */
async function emailHasAccount(db: D1Database, email: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 FROM clients WHERE email = ? LIMIT 1')
    .bind(email)
    .first();
  return row !== null;
}

// Email-check throttle: 10 checks / 15 min / IP — generous for
// blur-triggered checks, tight enough to blunt enumeration.
const checkEmailThrottle = makeThrottle(10, 15 * 60 * 1000);

/** GET /api/contact/check-email?email= — the contact form's
    pre-check: does this email already have an account? Anything
    inconclusive (no DB binding, a lookup failure, throttling)
    fails open toward "no account", so the form lets the submit
    through and the /api/contact handler — which enforces the same
    rule authoritatively — decides. */
async function handleCheckEmail(request: Request, env: Env): Promise<Response> {
  const email = (new URL(request.url).searchParams.get('email') ?? '').trim();
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'A valid email is required.' }, 400);
  }
  const ip = clientIp(request);
  if (checkEmailThrottle.blocked(ip)) {
    return json({ ok: false, error: 'Too many requests.' }, 429);
  }
  checkEmailThrottle.record(ip);
  if (!env.DB_CLIENTS) {
    return json({ ok: true, exists: false });
  }
  try {
    return json({ ok: true, exists: await emailHasAccount(env.DB_CLIENTS, email) });
  } catch (err) {
    console.error('Email check failed:', err);
    return json({ ok: true, exists: false });
  }
}

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

/** Records a signup in the client database. The client INSERT is
    required: it throws on failure, and the caller answers 503
    without sending the inquiry email — a signup with no account
    must never look like it succeeded. Everything after the
    insert is best-effort, each step in its own try/catch: the
    account exists and the inquiry email carries the full
    message, so a discounts, referral, or discussion failure is
    logged and the signup still succeeds. */
async function recordSubmission(
  env: Env,
  db: D1Database,
  input: {
    name: string;
    email: string;
    siteUrl: string;
    comments: string;
    passwordHash: string;
    discountVerified: boolean;
    referralToken: string;
    requestedTierId: number | null;
  },
): Promise<void> {
  const email = input.email.toLowerCase();
  const businessName = businessNameFor(input.name, input.siteUrl);
  // Plain INSERT, no ON CONFLICT: the handler already rejected
  // emails with an account, so a conflict here is a race — it
  // throws, and the caller answers 409. Dual-write: status and
  // is_client are set together, always ('onboarding' ⇔ 0).
  await db
    .prepare(
      `INSERT INTO clients (business_name, contact_name, email, status, is_client, password_hash, requested_tier_id)
       VALUES (?, ?, ?, 'onboarding', 0, ?, ?)`,
    )
    .bind(businessName, input.name, email, input.passwordHash, input.requestedTierId)
    .run();
  const lead = await db
    .prepare('SELECT id, is_client FROM clients WHERE email = ?')
    .bind(email)
    .first<{ id: number; is_client: number }>();
  if (!lead) throw new Error('Signup record not found after insert');

  // A valid token identifies the referrer. An unknown token confers
  // nothing — only a real share link (or the verified on-site code)
  // earns the lead 10%.
  let tokenRow: { id: number; client_id: number; used: number } | null = null;
  try {
    await db
      .prepare('INSERT OR IGNORE INTO discounts (client_id) VALUES (?)')
      .bind(lead.id)
      .run();
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
  } catch (err) {
    console.error('Signup discount record skipped:', err);
  }

  // The referrer's reward: one attribution per lead, recorded in
  // referral_leads, so the ladder counts each lead exactly once no
  // matter how often a token is used. The discount-status email
  // goes out BEFORE the rows land — if the send fails, nothing is
  // recorded. A client submitting through their own link keeps
  // the 10% arrival discount but earns no referral reward.
  try {
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
  } catch (err) {
    console.error('Referrer reward skipped:', err);
  }

  // The discussion thread starts here: the visitor's project
  // details become the first comment, owned by their email. A
  // missing table (the onboarding migration hasn't run) never
  // fails the signup — the inquiry email carries the same
  // message to Chris.
  try {
    await db
      .prepare(
        'INSERT INTO discussion_comments (client_id, comment_owner, comment_text) VALUES (?, ?, ?)',
      )
      .bind(lead.id, email, input.comments)
      .run();
  } catch (err) {
    console.error('Discussion seed skipped:', err);
  }
}

/** The setup message for signup when the account schema isn't in
    place yet (no database binding, or the onboarding migration
    hasn't run): the visitor did nothing wrong, and no account
    was created. */
const SIGNUP_SETUP_ERROR = 'Account sign-up is not set up yet. Please try again later.';

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
  // Passwords are never trimmed: leading/trailing spaces are part
  // of the password the visitor chose.
  const password = payload.password ?? '';
  const confirmPassword = payload.confirmPassword ?? '';

  if (!name || !EMAIL_RE.test(email) || !comments) {
    return json({ ok: false, error: 'Please fill in your name, a valid email, and your project details.' }, 400);
  }
  if (password.length < 8) {
    return json({ ok: false, error: 'Your password must be at least 8 characters.' }, 400);
  }
  if (password !== confirmPassword) {
    return json({ ok: false, error: "Your passwords don't match." }, 400);
  }

  // Signup needs the database: without it no account can be
  // created, and sending the inquiry email would pretend one
  // was. The 409 check below is authoritative for emails that
  // already have an account; a lookup failure fails open toward
  // attempting the insert, and a duplicate there surfaces as a
  // UNIQUE error, answered 409.
  const db = env.DB_CLIENTS;
  if (!db) {
    return json({ ok: false, error: SIGNUP_SETUP_ERROR }, 503);
  }
  try {
    if (await emailHasAccount(db, email)) {
      return json({ ok: false, error: 'An account already exists for this email.' }, 409);
    }
  } catch (err) {
    console.error('Account check failed:', err);
  }

  const to = env.CONTACT_TO || CHRIS_EMAIL;
  const from = env.CONTACT_FROM || 'website@graywebsolutions.com';

  // Name the picked tier in the inquiry email when the tier table
  // exists; a missing table just omits the line. The requested
  // tier is recorded only when the tier actually exists.
  let tierLine = '';
  let requestedTierId: number | null = null;
  if (tierId) {
    try {
      const tier = await db.prepare('SELECT name FROM pricing_tiers WHERE id = ?')
        .bind(tierId)
        .first<{ name: string }>();
      if (tier) {
        tierLine = `Pricing tier: ${tier.name}`;
        requestedTierId = tierId;
      }
    } catch {
      /* pre-v2 schema — omit the line, record no tier */
    }
  }

  // The account is created BEFORE the inquiry email goes out: a
  // signup that can't create an account (the onboarding migration
  // hasn't run, the insert fails) answers 503 with nothing
  // written and no email sent as if it succeeded.
  const passwordHash = await hashPassword(password);
  try {
    await recordSubmission(env, db, {
      name,
      email,
      siteUrl,
      comments,
      passwordHash,
      discountVerified,
      referralToken,
      requestedTierId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (/UNIQUE constraint failed/i.test(message)) {
      return json({ ok: false, error: 'An account already exists for this email.' }, 409);
    }
    console.error('Signup record failed:', err);
    if (/no such (column|table)/i.test(message)) {
      return json({ ok: false, error: SIGNUP_SETUP_ERROR }, 503);
    }
    return json({ ok: false, error: 'Something went wrong creating your account. Please try again.' }, 503);
  }

  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || '—'}`,
    `Existing site: ${hasSite ? `Yes — ${siteUrl || '—'}` : 'No'}`,
    discountLine,
    tierLine,
    referralToken ? `Referral token: ${referralToken}` : '',
    'Onboarding signup — an account was created for this email (status: onboarding).',
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

  // No session is minted here: the success screen links to the
  // dashboard, where the visitor signs in with the login they
  // just created.
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
    if (url.pathname === '/api/contact/check-email') {
      if (request.method !== 'GET') {
        return json({ ok: false, error: 'Method not allowed.' }, 405);
      }
      return handleCheckEmail(request, env);
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
