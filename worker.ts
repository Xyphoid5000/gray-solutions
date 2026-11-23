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
// account row is created BEFORE the confirmation email goes out,
// so a signup that can't create an account never looks like it
// succeeded. The row is PENDING until the visitor confirms their
// email: the confirmation link (12 hours, single-use) signs them
// straight into their dashboard, and only then does the signup
// finish — the discussion seed, the inquiry email to Chris, the
// new-lead push, and any referrer reward all wait for the
// confirmation. A pending account can't sign in and stays out of
// the admin lists; an hourly cleanup deletes pending accounts
// whose link expired. The form is for NEW signups only: an email
// that already has a confirmed account is rejected with a 409,
// before anything is sent or recorded — existing clients use
// their dashboard. An email with a pending account re-submits
// to get a fresh confirmation link, with the original password
// standing. A submission through a referral token or the hidden
// on-site code gives the lead 10% off, kept in the `discounts`
// table. Every confirmed lead a token brings in earns the
// referrer more off — 10 points for the first lead, 5 per lead
// after, capped at 50% — and a discount-status email each time.
// The signup seeds the discussion thread with the visitor's
// message once confirmed; no project is created — projects come
// later, from the dashboard conversation. The form can pre-check
// an email through GET /api/contact/check-email, which answers
// whether the email already has an account, and whether that
// account is still waiting on confirmation.

import { json, clientIp, makeThrottle } from './worker/http';
import { hashPassword, randomToken, sha256Hex, timingSafeEqual } from './worker/crypto';
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
  /** The company name, stored as the client's business_name. */
  businessName?: string;
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

/** Whether the email already has a client row, and whether that
    account is still waiting on its email confirmation. The email
    column is COLLATE NOCASE, so the match is case-insensitive.
    A row with a password that hasn't confirmed yet reads
    'pending': the visitor can re-submit to get a fresh
    confirmation link, but the original password stands — a
    re-submit never overwrites it. A row with no password (Chris
    created it by hand) reads 'verified': it belongs in the
    dashboard, and the form turns it away. */
async function accountStatus(
  db: D1Database,
  email: string,
): Promise<{ state: 'none' | 'verified' | 'pending'; id: number | null }> {
  try {
    const row = await db
      .prepare('SELECT id, password_hash, email_verified FROM clients WHERE email = ?')
      .bind(email)
      .first<{ id: number; password_hash: string | null; email_verified: number | null }>();
    if (!row) return { state: 'none', id: null };
    if (!row.password_hash) return { state: 'verified', id: row.id };
    if ((row.email_verified ?? 1) === 0) return { state: 'pending', id: row.id };
    return { state: 'verified', id: row.id };
  } catch (err) {
    if (!(err instanceof Error && /no such column/i.test(err.message))) throw err;
    // Pre-migration: no verification column, so every account
    // reads verified and the old check decides.
    const row = await db
      .prepare('SELECT 1 FROM clients WHERE email = ? LIMIT 1')
      .bind(email)
      .first();
    return row ? { state: 'verified', id: null } : { state: 'none', id: null };
  }
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
    const status = await accountStatus(env.DB_CLIENTS, email);
    return json({ ok: true, exists: status.state !== 'none', pending: status.state === 'pending' });
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
    without sending the confirmation email — a signup with no
    account must never look like it succeeded. The row is created
    PENDING (email_verified = 0) with a 12-hour confirmation
    token; the discussion seed, the inquiry email, the push, and
    any referrer reward all wait for the confirmation and run in
    finalizeSignup instead. Everything after the insert is
    best-effort, each step in its own try/catch: the account
    exists and the confirmation email carries the link, so a
    discounts failure is logged and the signup still succeeds. */
async function recordSubmission(
  env: Env,
  db: D1Database,
  input: {
    name: string;
    businessName: string;
    email: string;
    phone: string;
    hasSite: boolean;
    siteUrl: string;
    comments: string;
    passwordHash: string;
    discountLine: string;
    tierLine: string;
    discountVerified: boolean;
    referralToken: string;
    requestedTierId: number | null;
  },
): Promise<{ id: number; token: string }> {
  const email = input.email.toLowerCase();
  // Plain INSERT, no ON CONFLICT: the handler already rejected
  // emails with an account, so a conflict here is a race — it
  // throws, and the caller answers 409. Dual-write: status and
  // is_client are set together, always ('onboarding' ⇔ 0). The
  // row starts unverified: the confirmation link flips it.
  await db
    .prepare(
      `INSERT INTO clients (business_name, contact_name, email, phone, status, is_client, password_hash, requested_tier_id, email_verified)
       VALUES (?, ?, ?, ?, 'onboarding', 0, ?, ?, 0)`,
    )
    .bind(input.businessName, input.name, email, input.phone || null, input.passwordHash, input.requestedTierId)
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

  // The referrer's reward waits for the confirmation — a lead
  // that never confirms earns nobody anything. finalizeSignup
  // runs it from the stored payload.

  // The discussion seed waits for the confirmation too — the
  // thread starts when the email proves real. finalizeSignup
  // writes it from the stored payload.
  const token = await createConfirmationToken(db, lead.id, {
    name: input.name,
    businessName: input.businessName,
    email,
    phone: input.phone,
    hasSite: input.hasSite,
    siteUrl: input.siteUrl,
    comments: input.comments,
    discountLine: input.discountLine,
    tierLine: input.tierLine,
    discountVerified: input.discountVerified,
    referralToken: input.referralToken,
    requestedTierId: input.requestedTierId,
  });
  return { id: lead.id, token };
}

/** The confirmation token: a random 32-byte value, stored as a
    SHA-256 hash (the raw token only ever travels in the email),
    good for 12 hours, single-use. The signup payload rides along
    as JSON so the confirmation can finish the signup — discussion
    seed, inquiry email, push, referrer reward — without trusting
    anything the confirming request sends. */
const CONFIRM_TTL = "datetime('now', '+12 hours')";

async function createConfirmationToken(
  db: D1Database,
  clientId: number,
  payload: Record<string, unknown>,
): Promise<string> {
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  await db
    .prepare(
      `INSERT INTO email_confirmations (client_id, token_hash, expires_at, data) VALUES (?, ?, ${CONFIRM_TTL}, ?)`,
    )
    .bind(clientId, tokenHash, JSON.stringify(payload))
    .run();
  return token;
}

/** A fresh confirmation link for a pending account: the old
    unused tokens die, so only one link is ever live per client.
    The original password stands — the re-submit's password is
    never stored. */
async function rotateConfirmationToken(
  db: D1Database,
  clientId: number,
  payload: Record<string, unknown>,
): Promise<string> {
  await db
    .prepare('DELETE FROM email_confirmations WHERE client_id = ? AND used = 0')
    .bind(clientId)
    .run();
  return createConfirmationToken(db, clientId, payload);
}

/** The confirmation email to the visitor. Throws when Resend
    refuses it — the caller answers 502 and the visitor retries
    through the re-submit path, which rotates the token and
    sends again. */
async function sendConfirmationEmail(
  env: Env,
  email: string,
  name: string,
  token: string,
): Promise<void> {
  const link = `https://dashboard.graywebsolutions.com/confirm?token=${token}`;
  const text = [
    `Hi ${name || 'there'},`,
    '',
    'Thanks for reaching out to Gray Web Solutions. One quick step before we get started:',
    '',
    `Confirm your email: ${link}`,
    '',
    'The link is good for 12 hours. Once you confirm, you will land straight in your client dashboard, where we will pick up the conversation about your project.',
    '',
    'If you did not ask for this, you can ignore it — the account is deleted automatically when the link expires.',
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
      from: 'Gray Web Solutions <donotreply@graywebsolutions.com>',
      to: [email],
      subject: 'Confirm your email — Gray Web Solutions',
      text,
    }),
  });
  if (!res.ok) {
    console.error('Confirmation email failed:', res.status, await res.text().catch(() => ''));
    throw new Error('CONFIRM_EMAIL_FAILED');
  }
}

/** Finishes a signup whose email just confirmed: the referrer
    reward (one attribution per lead), the discussion seed, the
    inquiry email to Chris, and the new-lead push — everything
    the signup held back. Called only from the internal
    /api/internal/confirmed endpoint, which the dashboard Worker
    hits after it flips the account verified. */
async function finalizeSignup(
  env: Env,
  db: D1Database,
  confirmation: { id: number; client_id: number; data: string },
): Promise<void> {
  const input = JSON.parse(confirmation.data) as {
    name: string;
    businessName: string;
    email: string;
    phone: string;
    hasSite: boolean;
    siteUrl: string;
    comments: string;
    discountLine: string;
    tierLine: string;
    discountVerified: boolean;
    referralToken: string;
    requestedTierId: number | null;
  };
  const leadId = confirmation.client_id;
  const email = input.email.toLowerCase();

  // The referrer's reward: one attribution per lead, recorded in
  // referral_leads, so the ladder counts each lead exactly once no
  // matter how often a token is used. The discount-status email
  // goes out BEFORE the rows land — if the send fails, nothing is
  // recorded. A client submitting through their own link keeps
  // the 10% arrival discount but earns no referral reward.
  try {
    let tokenRow: { id: number; client_id: number; used: number } | null = null;
    if (input.referralToken) {
      tokenRow = await db
        .prepare('SELECT id, client_id, used FROM referral_tokens WHERE token = ?')
        .bind(input.referralToken)
        .first<{ id: number; client_id: number; used: number }>();
    }
    if (tokenRow && env.RESEND_API_KEY) {
      const attributed = await db
        .prepare('SELECT id FROM referral_leads WHERE lead_client_id = ?')
        .bind(leadId)
        .first<{ id: number }>();
      if (!attributed) {
        const referrer = await db
          .prepare('SELECT id, email, contact_name, business_name FROM clients WHERE id = ?')
          .bind(tokenRow.client_id)
          .first<{ id: number; email: string; contact_name: string; business_name: string }>();
        if (referrer && referrer.id !== leadId) {
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
              .bind(referrer.id, leadId, input.referralToken)
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
  // details become the first comment, owned by their email, with
  // their existing site and phone number (when given) as a header
  // so the context travels with the conversation.
  const header = [
    input.siteUrl ? `Existing website: ${input.siteUrl}` : '',
    input.phone ? `Phone: ${input.phone}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const seedText = header ? `${header}\n\n${input.comments}` : input.comments;
  try {
    await db
      .prepare(
        'INSERT INTO discussion_comments (client_id, comment_owner, comment_text) VALUES (?, ?, ?)',
      )
      .bind(leadId, email, seedText)
      .run();
  } catch (err) {
    console.error('Discussion seed skipped:', err);
  }

  // The inquiry email to Chris — the same message the signup
  // used to send immediately, now only after the email proves
  // real.
  const to = env.CONTACT_TO || CHRIS_EMAIL;
  const from = env.CONTACT_FROM || 'website@graywebsolutions.com';
  const text = [
    `Name: ${input.name}`,
    `Company: ${input.businessName}`,
    `Email: ${email}`,
    `Phone: ${input.phone || '—'}`,
    `Existing site: ${input.hasSite ? `Yes — ${input.siteUrl || '—'}` : 'No'}`,
    input.discountLine,
    input.tierLine,
    input.referralToken ? `Referral token: ${input.referralToken}` : '',
    'Onboarding signup — an account was created for this email (status: onboarding).',
    '',
    input.comments,
  ]
    .filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n');
  try {
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
        subject: `Website inquiry from ${input.name}`,
        text,
      }),
    });
    if (!res.ok) {
      console.error('Resend error:', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.error('Inquiry email failed:', err);
  }

  // New-lead push: tell the dashboard Worker to notify the admin
  // right now, the same moment the inquiry email lands. The
  // dashboard Worker owns the push subscriptions and the VAPID
  // key; this Worker just calls its internal notify endpoint
  // with the shared secret. Best-effort and never blocks the
  // confirmation: a missing secret, a failed call, or a
  // not-yet-deployed endpoint just logs.
  try {
    const secret = (env.INTERNAL_PUSH_SECRET ?? '').trim();
    if (secret) {
      const pushUrl =
        (env.DASHBOARD_PUSH_URL ?? 'https://dashboard.graywebsolutions.com').replace(/\/$/, '') +
        '/api/push/notify';
      const pushRes = await fetch(pushUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          title: `New lead: ${input.businessName}`,
          body: `${input.name} — ${input.tierLine || 'website inquiry'}`,
          url: '/dashboard',
        }),
      });
      if (!pushRes.ok) {
        console.error('New-lead push failed:', pushRes.status);
      }
    }
  } catch (err) {
    console.error('New-lead push failed:', err);
  }
}

/** Internal endpoint (POST /api/internal/confirmed): the
    dashboard Worker calls this after a visitor confirms their
    email, so the signup finishes — discussion seed, inquiry
    email, push, referrer reward. Guarded by the shared internal
    secret, the same one this Worker sends with its push calls.
    Idempotent: the first call claims finalized_at, later calls
    answer already-finalized without repeating anything. */
async function handleInternalConfirmed(request: Request, env: Env): Promise<Response> {
  const secret = (env.INTERNAL_PUSH_SECRET ?? '').trim();
  if (!secret) {
    return json({ ok: false, error: 'Internal endpoint is not configured yet.' }, 503);
  }
  const presented = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!timingSafeEqual(presented, secret)) {
    return json({ ok: false, error: 'Unauthorized.' }, 401);
  }
  let body: { confirmationId?: unknown };
  try {
    body = (await request.json()) as { confirmationId?: unknown };
  } catch {
    return json({ ok: false, error: 'Invalid request body.' }, 400);
  }
  const confirmationId = typeof body.confirmationId === 'number' ? body.confirmationId : NaN;
  if (!Number.isInteger(confirmationId) || confirmationId <= 0) {
    return json({ ok: false, error: 'A confirmation id is required.' }, 400);
  }
  const db = env.DB_CLIENTS;
  if (!db) {
    return json({ ok: false, error: 'The dashboard is not configured yet.' }, 503);
  }
  try {
    const row = await db
      .prepare('SELECT id, client_id, data, used, finalized_at FROM email_confirmations WHERE id = ?')
      .bind(confirmationId)
      .first<{ id: number; client_id: number; data: string; used: number; finalized_at: string | null }>();
    if (!row) {
      return json({ ok: false, error: 'Confirmation not found.' }, 404);
    }
    if (row.used !== 1) {
      return json({ ok: false, error: 'This confirmation has not been used yet.' }, 409);
    }
    if (row.finalized_at) {
      return json({ ok: true, already: true });
    }
    const claimed = await db
      .prepare("UPDATE email_confirmations SET finalized_at = datetime('now') WHERE id = ? AND finalized_at IS NULL")
      .bind(confirmationId)
      .run();
    if ((claimed.meta?.changes ?? 0) !== 1) {
      return json({ ok: true, already: true });
    }
    await finalizeSignup(env, db, row);
    return json({ ok: true });
  } catch (err) {
    console.error('Confirm-finalize failed:', err);
    if (err instanceof Error && /no such (column|table)/i.test(err.message)) {
      return json({ ok: false, error: 'Account sign-up is not set up yet. Please try again later.' }, 503);
    }
    return json({ ok: false, error: 'Something went wrong finishing the signup.' }, 503);
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
  const businessName = (payload.businessName ?? '').trim().slice(0, 200);
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

  if (!name || !businessName || !EMAIL_RE.test(email) || !comments) {
    return json({ ok: false, error: 'Please fill in your name, company name, a valid email, and your project details.' }, 400);
  }
  if (password.length < 8) {
    return json({ ok: false, error: 'Your password must be at least 8 characters.' }, 400);
  }
  if (password !== confirmPassword) {
    return json({ ok: false, error: "Your passwords don't match." }, 400);
  }

  // Signup needs the database: without it no account can be
  // created, and sending a confirmation email would pretend one
  // was. The 409 check below is authoritative for emails that
  // already have a confirmed account; a lookup failure fails open
  // toward attempting the insert, and a duplicate there surfaces
  // as a UNIQUE error, answered 409. A pending account takes the
  // re-submit path below instead: a fresh confirmation link, same
  // password.
  const db = env.DB_CLIENTS;
  if (!db) {
    return json({ ok: false, error: SIGNUP_SETUP_ERROR }, 503);
  }
  let pendingId: number | null = null;
  try {
    const status = await accountStatus(db, email);
    if (status.state === 'verified') {
      return json({ ok: false, error: 'An account already exists for this email.' }, 409);
    }
    pendingId = status.state === 'pending' ? status.id : null;
  } catch (err) {
    console.error('Account check failed:', err);
  }

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

  // The payload the confirmation stores, so the confirm step can
  // finish the signup without trusting the confirming request.
  const confirmationPayload = {
    name,
    businessName,
    email,
    phone,
    hasSite,
    siteUrl,
    comments,
    discountLine,
    tierLine,
    discountVerified,
    referralToken,
    requestedTierId,
  };

  // A pending account re-submitting: rotate the token, re-send
  // the confirmation email, and leave everything else — password
  // included — exactly as the first submit left it.
  if (pendingId !== null) {
    try {
      const token = await rotateConfirmationToken(db, pendingId, confirmationPayload);
      await sendConfirmationEmail(env, email, name, token);
    } catch (err) {
      console.error('Confirmation resend failed:', err);
      if (err instanceof Error && /no such (column|table)/i.test(err.message)) {
        return json({ ok: false, error: SIGNUP_SETUP_ERROR }, 503);
      }
      return json({ ok: false, error: 'We could not send the confirmation email. Please try again.' }, 502);
    }
    return json({ ok: true, pending: true, resent: true });
  }

  // The account is created BEFORE the confirmation email goes
  // out: a signup that can't create an account (the onboarding
  // migration hasn't run, the insert fails) answers 503 with
  // nothing written and no email sent as if it succeeded.
  const passwordHash = await hashPassword(password);
  try {
    const { token } = await recordSubmission(env, db, {
      name,
      businessName,
      email,
      phone,
      hasSite,
      siteUrl,
      comments,
      passwordHash,
      discountLine,
      tierLine,
      discountVerified,
      referralToken,
      requestedTierId,
    });
    await sendConfirmationEmail(env, email, name, token);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (/UNIQUE constraint failed/i.test(message)) {
      return json({ ok: false, error: 'An account already exists for this email.' }, 409);
    }
    console.error('Signup record failed:', err);
    if (/no such (column|table)/i.test(message)) {
      return json({ ok: false, error: SIGNUP_SETUP_ERROR }, 503);
    }
    if (message === 'CONFIRM_EMAIL_FAILED') {
      return json({ ok: false, error: 'We could not send the confirmation email. Please try again.' }, 502);
    }
    return json({ ok: false, error: 'Something went wrong creating your account. Please try again.' }, 503);
  }

  // No session is minted here: the confirmation link signs the
  // visitor straight into their dashboard once they confirm.
  // Until then the account is pending — it can't sign in and
  // stays out of the admin lists.
  return json({ ok: true, pending: true });
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
    if (url.pathname === '/api/internal/confirmed') {
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'Method not allowed.' }, 405);
      }
      return handleInternalConfirmed(request, env);
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
