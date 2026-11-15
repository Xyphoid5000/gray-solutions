// Dashboard sign-in: email + magic link, no passwords. A link is
// single-use and expires after 15 minutes; only the hash is stored.
// Verifying a link issues an HMAC-signed session token (30 days).
// Chris's own email signs in as admin; every other client email
// signs in as a client scoped to its own record.

import { json, readJson, makeThrottle, clientIp } from './http';
import { CHRIS_EMAIL, type Env } from './env';
import { randomToken, sha256Hex, signSession, verifySession } from './crypto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const magicThrottle = makeThrottle(5, 15 * 60 * 1000);

export interface Session {
  email: string;
  role: 'admin' | 'client';
}

export async function handleMagicLink(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }
  if (!env.DB_CLIENTS || !env.RESEND_API_KEY) {
    return json({ ok: false, error: 'Sign-in is not configured yet.' }, 503);
  }
  const ip = clientIp(request);
  if (magicThrottle.blocked(ip)) {
    return json({ ok: false, error: 'Too many sign-in attempts. Try again in a few minutes.' }, 429);
  }
  magicThrottle.record(ip);

  const body = await readJson(request);
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'Enter a valid email address.' }, 400);
  }

  // Only clients on file (or Chris) get a link — but the response is
  // identical either way, so the endpoint never confirms whether an
  // email has an account.
  let token: string | null = null;
  try {
    const isChris = email === CHRIS_EMAIL;
    const row = isChris
      ? null
      : await env.DB_CLIENTS.prepare('SELECT id FROM clients WHERE email = ?')
          .bind(email)
          .first<{ id: number }>();
    if (isChris || row) {
      token = randomToken(32);
      const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString();
      await env.DB_CLIENTS.prepare(
        'INSERT INTO magic_tokens (email, token_hash, expires_at) VALUES (?, ?, ?)',
      )
        .bind(email, await sha256Hex(token), expiresAt)
        .run();
    }
  } catch (err) {
    console.error('Magic-link setup failed:', err);
    return json({ ok: false, error: 'Sign-in is not configured yet.' }, 503);
  }

  if (token) {
    const link = `${new URL(request.url).origin}/dashboard?token=${token}`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Gray Solutions <${CHRIS_EMAIL}>`,
        to: [email],
        subject: 'Your Gray Solutions dashboard sign-in link',
        text: [
          'Hi,',
          '',
          'Here is your sign-in link for the Gray Solutions client dashboard:',
          '',
          link,
          '',
          'It expires in 15 minutes and works once. If you did not ask for this, just ignore it.',
          '',
          '— Chris',
          'Gray Solutions',
        ].join('\n'),
      }),
    });
    if (!res.ok) {
      console.error('Magic-link email failed:', res.status, await res.text().catch(() => ''));
      return json({ ok: false, error: 'Could not send the sign-in email. Try again.' }, 502);
    }
  }
  return json({ ok: true });
}

export async function handleVerify(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }
  if (!env.DB_CLIENTS || !env.RESEND_API_KEY) {
    return json({ ok: false, error: 'Sign-in is not configured yet.' }, 503);
  }
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!token || token.length > 128) {
    return json({ ok: false, error: 'This sign-in link is invalid.' }, 401);
  }
  let row: { id: number; email: string; expires_at: string; used: number } | null = null;
  try {
    row = await env.DB_CLIENTS.prepare(
      'SELECT id, email, expires_at, used FROM magic_tokens WHERE token_hash = ?',
    )
      .bind(await sha256Hex(token))
      .first<{ id: number; email: string; expires_at: string; used: number }>();
  } catch (err) {
    console.error('Magic-link lookup failed:', err);
    return json({ ok: false, error: 'Sign-in is not configured yet.' }, 503);
  }
  if (!row || row.used || new Date(row.expires_at).getTime() <= Date.now()) {
    return json(
      { ok: false, error: 'This sign-in link has expired or was already used. Request a new one.' },
      401,
    );
  }
  await env.DB_CLIENTS.prepare('UPDATE magic_tokens SET used = 1 WHERE id = ?')
    .bind(row.id)
    .run();
  const role = row.email === CHRIS_EMAIL ? 'admin' : 'client';
  const session = await signSession(env.RESEND_API_KEY, {
    email: row.email,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
  return json({ ok: true, token: session, role, email: row.email });
}

/** Validates the Bearer session token. The `?token=` query fallback
    exists only for the request-image endpoint, whose links open in a
    new tab — every other endpoint requires the header. */
export async function authenticateSession(
  request: Request,
  env: Env,
  opts?: { allowQueryToken?: boolean },
): Promise<Session | null> {
  const auth = request.headers.get('authorization') ?? '';
  const match = /^Bearer (.+)$/.exec(auth);
  const token =
    match?.[1] ?? (opts?.allowQueryToken ? new URL(request.url).searchParams.get('token') : null);
  if (!token || !env.RESEND_API_KEY) return null;
  const payload = await verifySession(env.RESEND_API_KEY, token);
  if (!payload) return null;
  return { email: payload.email, role: payload.role };
}
