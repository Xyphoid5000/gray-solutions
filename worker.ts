// Cloudflare Worker entry: serves the static site, plus the contact-form
// API and the referral-token API.
//
// Non-API requests fall through to the static assets (same behavior as the
// dashboard-managed assets-only setup). POST /api/contact sends the inquiry
// to chris@graywebsolutions.com via Resend. GET /api/referral?token=xxx
// looks a share-link token up in the shared client database
// (gray-solutions-db, bound as DB_CLIENTS) and marks it opened.
//
// Every contact submission is also recorded in the client database
// (best-effort, after the email to Chris goes out — a database failure
// never blocks the inquiry). A submission through a referral token gives
// the lead 10% off; the first submission through a token sets the
// referrer to 20% off and emails them from chris@graywebsolutions.com.

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<{
    success: boolean;
    meta?: { last_row_id?: number; changes?: number };
  }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface Env {
  ASSETS: Fetcher;
  DB_CLIENTS?: D1Database;
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
}

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
  /** Honeypot — real users leave this empty. */
  company?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHRIS_EMAIL = 'chris@graywebsolutions.com';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Referral-lookup throttle: per-isolate in-memory map, 30 lookups /
// 15 min / IP. Tokens are unguessable, so this only blunts scanning.
const lookups = new Map<string, { count: number; resetAt: number }>();
const MAX_LOOKUPS = 30;
const WINDOW_MS = 15 * 60 * 1000;

function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? 'unknown';
}

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
): Promise<void> {
  const greeting = referrerName ? `Hi ${referrerName},` : 'Hi,';
  const leadBit = leadSite ? `${leadName} (${leadSite})` : leadName;
  const text = [
    greeting,
    '',
    `Good news — ${leadBit} reached out to Gray Solutions through the link you shared.`,
    '',
    'Your 20% off is locked in: if you go with Gray Solutions for your website, you will get 20% off. And they get 10% off theirs.',
    '',
    'Thanks for spreading the word.',
    '',
    '— Chris',
    'Gray Solutions',
  ].join('\n');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Gray Solutions <${CHRIS_EMAIL}>`,
      to: [referrerEmail],
      subject: 'Your Gray Solutions share link was used — 20% off your website',
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
    .prepare('SELECT id FROM clients WHERE email = ?')
    .bind(email)
    .first<{ id: number }>();
  if (!lead) return;
  await db
    .prepare('INSERT OR IGNORE INTO client_pricing (client_id) VALUES (?)')
    .bind(lead.id)
    .run();

  let discount = input.discountVerified ? 10 : 0;
  let firstUse: { tokenId: number; referrerId: number; referrerEmail: string; referrerName: string } | null = null;
  if (input.referralToken) {
    const tok = await db
      .prepare('SELECT id, client_id, used FROM referral_tokens WHERE token = ?')
      .bind(input.referralToken)
      .first<{ id: number; client_id: number; used: number }>();
    if (tok) {
      discount = Math.max(discount, 10);
      if (!tok.used) {
        const referrer = await db
          .prepare('SELECT id, email, contact_name, business_name FROM clients WHERE id = ?')
          .bind(tok.client_id)
          .first<{ id: number; email: string; contact_name: string; business_name: string }>();
        if (referrer) {
          firstUse = {
            tokenId: tok.id,
            referrerId: referrer.id,
            referrerEmail: referrer.email,
            referrerName: referrer.contact_name || referrer.business_name,
          };
        }
      }
    }
  }

  if (discount > 0) {
    await db
      .prepare(
        `UPDATE client_pricing SET discount_pct = MAX(discount_pct, ?), updated_at = datetime('now') WHERE client_id = ?`,
      )
      .bind(discount, lead.id)
      .run();
  }

  // The referrer's 20% and the used-mark land only after their email
  // goes out — if the send fails, the token stays unused and a later
  // submission through it retries the notification.
  if (firstUse && env.RESEND_API_KEY) {
    await sendReferrerEmail(
      env,
      firstUse.referrerEmail,
      firstUse.referrerName,
      input.name,
      input.siteUrl,
    );
    await db
      .prepare('INSERT OR IGNORE INTO client_pricing (client_id) VALUES (?)')
      .bind(firstUse.referrerId)
      .run();
    await db
      .prepare(
        `UPDATE client_pricing SET discount_pct = MAX(discount_pct, 20), updated_at = datetime('now') WHERE client_id = ?`,
      )
      .bind(firstUse.referrerId)
      .run();
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

  if (!name || !EMAIL_RE.test(email) || !comments) {
    return json({ ok: false, error: 'Please fill in your name, a valid email, and your project details.' }, 400);
  }

  const to = env.CONTACT_TO || CHRIS_EMAIL;
  const from = env.CONTACT_FROM || 'website@graywebsolutions.com';

  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || '—'}`,
    `Existing site: ${hasSite ? `Yes — ${siteUrl || '—'}` : 'No'}`,
    discountLine,
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
      from: `Gray Solutions <${from}>`,
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
    return env.ASSETS.fetch(request);
  },
};
