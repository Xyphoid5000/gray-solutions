// Random tokens, hashes, and HMAC-signed dashboard sessions.
// The session key is the Resend API key itself, used only for HMAC —
// no second secret to manage, and the signed payload carries its own
// version tag so a session token is never valid anywhere else.

const enc = new TextEncoder();
const dec = new TextDecoder();

export function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unbase64url(value: string): Uint8Array {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Unpredictable token for magic links (32 bytes → 43 chars). */
export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64url(buf);
}

/** PBKDF2 iteration count for password hashes. 100000 is the
    Workerd WebCrypto cap — never exceed it (Node accepts higher
    counts, so a Node test will not catch an over-cap value). The
    dashboard Worker verifies these hashes and rejects anything
    over the cap, so this number is part of the shared format. */
export const PASSWORD_HASH_ITERATIONS = 100000;

/** Hashes a password for dashboard sign-in, in the format the
    dashboard Worker verifies:
    `pbkdf2$<iterations>$<salt-b64url>$<hash-b64url>` — PBKDF2
    with SHA-256, a 16-byte random salt, and a 32-byte derived
    key; base64url without padding. Verification lives on the
    dashboard side; this Worker only ever creates hashes. */
export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PASSWORD_HASH_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return `pbkdf2$${PASSWORD_HASH_ITERATIONS}$${base64url(salt)}$${base64url(new Uint8Array(derived))}`;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant-time string comparison for secrets — never use ===
    on a password or token, where the early exit leaks position. */
export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  const len = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export interface SessionPayload {
  email: string;
  role: 'admin' | 'client';
  exp: number;
}

export async function signSession(secret: string, payload: SessionPayload): Promise<string> {
  const body = base64url(enc.encode(JSON.stringify({ v: 1, ...payload })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body));
  return `${body}.${base64url(new Uint8Array(sig))}`;
}

export async function verifySession(
  secret: string,
  token: string,
): Promise<SessionPayload | null> {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let ok = false;
  try {
    ok = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      unbase64url(sig) as BufferSource,
      enc.encode(body),
    );
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    const parsed = JSON.parse(dec.decode(unbase64url(body))) as { v?: number } & SessionPayload;
    if (
      parsed.v !== 1 ||
      typeof parsed.email !== 'string' ||
      (parsed.role !== 'admin' && parsed.role !== 'client') ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (parsed.exp * 1000 <= Date.now()) return null;
    return { email: parsed.email, role: parsed.role, exp: parsed.exp };
  } catch {
    return null;
  }
}
