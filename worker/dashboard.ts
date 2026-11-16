// Client + admin dashboards. Admin (Chris) sees every client, their
// pricing, and every request. A client sees only their own record,
// pricing, and requests — and only established clients (is_client)
// can submit change/feature requests. Image attachments live in R2
// when the bucket is bound; without it, requests still work, just
// without images.

import { json, readJson, makeThrottle, clientIp } from './http';
import { CHRIS_EMAIL, type D1Database, type Env } from './env';
import type { Session } from './auth';
import { randomToken } from './crypto';
import { listTiers } from './pricing';

const MAX_DETAILS = 4000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const STATUSES = ['new', 'in_progress', 'done', 'declined'] as const;

interface ClientRow {
  id: number;
  business_name: string;
  contact_name: string;
  email: string;
  is_client: number;
  site_url: string | null;
}

/** Client selects, with a pre-migration fallback: site_url doesn't
    exist until the column migration runs, and the dashboards must
    keep working until then — they just show no link. */
async function allClients(db: D1Database): Promise<ClientRow[]> {
  try {
    const res = await db
      .prepare('SELECT id, business_name, contact_name, email, is_client, site_url FROM clients ORDER BY business_name')
      .all<ClientRow>();
    return res.results;
  } catch {
    const res = await db
      .prepare('SELECT id, business_name, contact_name, email, is_client FROM clients ORDER BY business_name')
      .all<ClientRow>();
    return res.results.map((c) => ({ ...c, site_url: null }));
  }
}

async function oneClient(db: D1Database, email: string): Promise<ClientRow | null> {
  try {
    return await db
      .prepare('SELECT id, business_name, contact_name, email, is_client, site_url FROM clients WHERE email = ?')
      .bind(email.toLowerCase())
      .first<ClientRow>();
  } catch {
    const row = await db
      .prepare('SELECT id, business_name, contact_name, email, is_client FROM clients WHERE email = ?')
      .bind(email.toLowerCase())
      .first<ClientRow>();
    return row ? { ...row, site_url: null } : null;
  }
}

interface PricingRow {
  client_id: number;
  project_type: string;
  tier_id: number | null;
  discount_pct: number;
  quoted_price_cents: number | null;
  billed: number;
}

interface RequestRow {
  id: number;
  client_id: number;
  type: string;
  details: string;
  image_key: string | null;
  status: string;
  tier_id: number | null;
  created_at: string;
}

function shapePricing(p: PricingRow, tierNames: Map<number, string>) {
  return {
    projectType: p.project_type,
    tierId: p.tier_id,
    tierName: p.tier_id ? (tierNames.get(p.tier_id) ?? null) : null,
    discountPct: p.discount_pct,
    quotedPriceCents: p.quoted_price_cents,
    billed: p.billed === 1,
  };
}

/** Install first, then feature — the order both dashboards show.
    An established client's row with no quoted rate is assumed free:
    it shows the Free tier at $0. A prospect's unquoted row stays
    unquoted — "no quote yet", never $0. */
function shapePricings(
  rows: PricingRow[],
  tierNames: Map<number, string>,
  isClient: boolean,
  freeTierName: string,
) {
  return rows
    .slice()
    .sort((a, b) => Number(a.project_type !== 'install') - Number(b.project_type !== 'install'))
    .map((p) => {
      const assumedFree = isClient && p.quoted_price_cents === null;
      const shaped = shapePricing(p, tierNames);
      return {
        ...shaped,
        tierName: shaped.tierName ?? (assumedFree ? freeTierName : null),
        quotedPriceCents: shaped.quotedPriceCents ?? (assumedFree ? 0 : null),
      };
    });
}

function shapeRequest(
  r: RequestRow,
  clientName: string,
  tierNames: Map<number, string>,
) {
  return {
    id: r.id,
    clientId: r.client_id,
    clientName,
    type: r.type,
    details: r.details,
    hasImage: !!r.image_key,
    imageKey: r.image_key,
    status: r.status,
    tierId: r.tier_id,
    tierName: r.tier_id ? (tierNames.get(r.tier_id) ?? null) : null,
    createdAt: r.created_at,
  };
}

async function clientIdFor(
  db: D1Database,
  email: string,
): Promise<{ id: number; is_client: number } | null> {
  return db
    .prepare('SELECT id, is_client FROM clients WHERE email = ?')
    .bind(email.toLowerCase())
    .first<{ id: number; is_client: number }>();
}

export async function handleMe(
  request: Request,
  env: Env,
  session: Session,
): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }
  if (!env.DB_CLIENTS) {
    return json({ ok: false, error: 'The dashboard is not configured yet.' }, 503);
  }
  const db = env.DB_CLIENTS;
  const uploadsEnabled = !!env.R2_UPLOADS;
  try {
    const tiers = await listTiers(db).catch(() => []);
    const tierNames = new Map(tiers.map((t) => [t.id, t.name]));
    // The $0 tier's name, for the assumed-free display — 'Free'
    // when the tier row doesn't exist yet.
    const freeTierName = tiers.find((t) => t.priceCents === 0)?.name ?? 'Free';

    if (session.role === 'admin') {
      const clientRows = await allClients(db);
      const pricingRes = await db
        .prepare('SELECT client_id, project_type, tier_id, discount_pct, quoted_price_cents, billed FROM client_pricing')
        .all<PricingRow>();
      const requestsRes = await db
        .prepare('SELECT id, client_id, type, details, image_key, status, tier_id, created_at FROM client_requests ORDER BY id DESC')
        .all<RequestRow>();
      const pricingByClient = new Map<number, PricingRow[]>();
      for (const p of pricingRes.results) {
        const rows = pricingByClient.get(p.client_id) ?? [];
        rows.push(p);
        pricingByClient.set(p.client_id, rows);
      }
      const namesById = new Map(clientRows.map((c) => [c.id, c.business_name]));
      return json({
        ok: true,
        role: 'admin',
        email: session.email,
        clients: clientRows.map((c) => ({
          id: c.id,
          businessName: c.business_name,
          contactName: c.contact_name,
          email: c.email,
          isClient: c.is_client === 1,
          siteUrl: c.site_url ?? null,
          pricings: shapePricings(pricingByClient.get(c.id) ?? [], tierNames, c.is_client === 1, freeTierName),
        })),
        requests: requestsRes.results.map((r) =>
          shapeRequest(r, namesById.get(r.client_id) ?? '', tierNames),
        ),
        tiers,
        uploadsEnabled,
      });
    }

    const client = await oneClient(db, session.email);
    if (!client) {
      return json({
        ok: true,
        role: 'client',
        email: session.email,
        client: null,
        pricings: [],
        requests: [],
        tiers,
        uploadsEnabled,
      });
    }
    const pricingRes = await db
      .prepare('SELECT client_id, project_type, tier_id, discount_pct, quoted_price_cents, billed FROM client_pricing WHERE client_id = ?')
      .bind(client.id)
      .all<PricingRow>();
    const requestsRes = await db
      .prepare('SELECT id, client_id, type, details, image_key, status, tier_id, created_at FROM client_requests WHERE client_id = ? ORDER BY id DESC')
      .bind(client.id)
      .all<RequestRow>();
    return json({
      ok: true,
      role: 'client',
      email: session.email,
      client: {
        id: client.id,
        businessName: client.business_name,
        contactName: client.contact_name,
        email: client.email,
        isClient: client.is_client === 1,
        siteUrl: client.site_url ?? null,
      },
      pricings: shapePricings(pricingRes.results, tierNames, client.is_client === 1, freeTierName),
      requests: requestsRes.results.map((r) => shapeRequest(r, client.business_name, tierNames)),
      tiers,
      uploadsEnabled,
    });
  } catch (err) {
    console.error('Dashboard lookup failed:', err);
    return json({ ok: false, error: 'The dashboard is not configured yet.' }, 503);
  }
}

export async function handleCreateRequest(
  request: Request,
  env: Env,
  session: Session,
): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }
  if (session.role !== 'client') {
    return json({ ok: false, error: 'Only client accounts can submit requests.' }, 403);
  }
  if (!env.DB_CLIENTS) {
    return json({ ok: false, error: 'Requests are not configured yet.' }, 503);
  }
  const db = env.DB_CLIENTS;
  const me = await clientIdFor(db, session.email);
  if (!me) {
    return json({ ok: false, error: 'No client record for this email yet.' }, 403);
  }
  if (!me.is_client) {
    return json(
      { ok: false, error: 'Requests are for established clients — your site is not live yet.' },
      403,
    );
  }

  const contentType = request.headers.get('content-type') ?? '';
  let type = '';
  let details = '';
  let tierId: number | null = null;
  let image: File | null = null;
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    type = String(form.get('type') ?? '');
    details = String(form.get('details') ?? '');
    const tierRaw = String(form.get('tierId') ?? '');
    tierId = tierRaw ? Number(tierRaw) : null;
    const file = form.get('image');
    if (file instanceof File && file.size > 0) image = file;
  } else {
    const body = await readJson(request);
    type = String(body.type ?? '');
    details = String(body.details ?? '');
    tierId = typeof body.tierId === 'number' ? body.tierId : null;
  }
  type = type.trim();
  details = details.trim();
  if (type !== 'change' && type !== 'feature') {
    return json({ ok: false, error: 'Pick a request type.' }, 400);
  }
  if (!details || details.length > MAX_DETAILS) {
    return json({ ok: false, error: 'Describe the request (under 4,000 characters).' }, 400);
  }
  if (type === 'feature') {
    if (!tierId || !Number.isInteger(tierId)) {
      return json({ ok: false, error: 'Pick a pricing tier for the feature.' }, 400);
    }
  } else {
    tierId = null;
  }
  if (image) {
    if (!env.R2_UPLOADS) {
      return json(
        { ok: false, error: 'Image upload is not configured yet. Send the request without an image.' },
        503,
      );
    }
    if (!IMAGE_TYPES.has(image.type) || image.size > MAX_IMAGE_BYTES) {
      return json({ ok: false, error: 'Attach a JPEG, PNG, WebP, or GIF under 5 MB.' }, 400);
    }
  }

  try {
    if (type === 'feature' && tierId) {
      const tier = await db
        .prepare('SELECT id FROM pricing_tiers WHERE id = ?')
        .bind(tierId)
        .first<{ id: number }>();
      if (!tier) {
        return json({ ok: false, error: 'Unknown pricing tier.' }, 400);
      }
    }
    let imageKey: string | null = null;
    if (image && env.R2_UPLOADS) {
      const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'image';
      imageKey = `requests/${me.id}/${Date.now()}-${randomToken(8)}-${safeName}`;
      await env.R2_UPLOADS.put(imageKey, await image.arrayBuffer(), {
        httpMetadata: { contentType: image.type },
      });
    }
    const res = await db
      .prepare(
        'INSERT INTO client_requests (client_id, type, details, image_key, tier_id) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(me.id, type, details, imageKey, tierId)
      .run();
    return json({ ok: true, id: res.meta?.last_row_id ?? null });
  } catch (err) {
    console.error('Request creation failed:', err);
    return json({ ok: false, error: 'Requests are not configured yet.' }, 503);
  }
}

export async function handleUpdateRequest(
  request: Request,
  env: Env,
  session: Session,
  id: number,
): Promise<Response> {
  if (request.method !== 'PATCH') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }
  if (session.role !== 'admin') {
    return json({ ok: false, error: 'Only the admin can update requests.' }, 403);
  }
  if (!env.DB_CLIENTS) {
    return json({ ok: false, error: 'The dashboard is not configured yet.' }, 503);
  }
  const body = await readJson(request);
  const status = String(body.status ?? '');
  if (!(STATUSES as readonly string[]).includes(status)) {
    return json({ ok: false, error: 'Unknown status.' }, 400);
  }
  try {
    const row = await env.DB_CLIENTS.prepare('SELECT id FROM client_requests WHERE id = ?')
      .bind(id)
      .first<{ id: number }>();
    if (!row) {
      return json({ ok: false, error: 'Request not found.' }, 404);
    }
    await env.DB_CLIENTS.prepare(
      `UPDATE client_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    )
      .bind(status, id)
      .run();
    return json({ ok: true });
  } catch (err) {
    console.error('Request update failed:', err);
    return json({ ok: false, error: 'The dashboard is not configured yet.' }, 503);
  }
}

export async function handleSetBilled(
  request: Request,
  env: Env,
  session: Session,
  clientId: number,
): Promise<Response> {
  if (request.method !== 'PATCH') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }
  if (session.role !== 'admin') {
    return json({ ok: false, error: 'Only the admin can update billing.' }, 403);
  }
  if (!env.DB_CLIENTS) {
    return json({ ok: false, error: 'The dashboard is not configured yet.' }, 503);
  }
  const body = await readJson(request);
  const billed = body.billed;
  if (billed !== 0 && billed !== 1 && billed !== true && billed !== false) {
    return json({ ok: false, error: 'Send billed as true or false.' }, 400);
  }
  const projectType = body.projectType === 'feature' ? 'feature' : 'install';
  try {
    const client = await env.DB_CLIENTS.prepare('SELECT id FROM clients WHERE id = ?')
      .bind(clientId)
      .first<{ id: number }>();
    if (!client) {
      return json({ ok: false, error: 'Client not found.' }, 404);
    }
    await env.DB_CLIENTS.prepare('INSERT OR IGNORE INTO client_pricing (client_id, project_type) VALUES (?, ?)')
      .bind(clientId, projectType)
      .run();
    await env.DB_CLIENTS.prepare(
      `UPDATE client_pricing SET billed = ?, updated_at = datetime('now') WHERE client_id = ? AND project_type = ?`,
    )
      .bind(billed ? 1 : 0, clientId, projectType)
      .run();
    return json({ ok: true });
  } catch (err) {
    console.error('Billing update failed:', err);
    return json({ ok: false, error: 'The dashboard is not configured yet.' }, 503);
  }
}

export async function handleRequestImage(
  request: Request,
  env: Env,
  session: Session,
): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }
  if (!env.R2_UPLOADS || !env.DB_CLIENTS) {
    return json({ ok: false, error: 'Image serving is not configured yet.' }, 503);
  }
  const key = new URL(request.url).searchParams.get('key') ?? '';
  if (!key || key.length > 512) {
    return json({ ok: false, error: 'Missing image key.' }, 400);
  }
  const row = await env.DB_CLIENTS.prepare(
    'SELECT client_id FROM client_requests WHERE image_key = ?',
  )
    .bind(key)
    .first<{ client_id: number }>();
  if (!row) {
    return json({ ok: false, error: 'Image not found.' }, 404);
  }
  if (session.role === 'client') {
    const me = await clientIdFor(env.DB_CLIENTS, session.email);
    // 404, not 403 — don't confirm the key exists for someone else's image.
    if (!me || me.id !== row.client_id) {
      return json({ ok: false, error: 'Image not found.' }, 404);
    }
  }
  const obj = await env.R2_UPLOADS.get(key);
  if (!obj) {
    return json({ ok: false, error: 'Image not found.' }, 404);
  }
  return new Response(await obj.arrayBuffer(), {
    headers: {
      'content-type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
      'cache-control': 'private, max-age=3600',
    },
  });
}

// Dashboard share links: a signed-in client mints their own referral
// link from the dashboard — the same token system the demo exit form
// uses, keyed to the demo_slug 'dashboard' so one token per client
// covers dashboard shares. The reward logic lives on the contact
// submission (first use of the token), keyed off the token alone, so
// nothing else needs to know where the link came from. The link
// always points at the canonical home, never a preview host — the
// demos Worker hardcodes the same origin for its share links.
const GS_HOME = 'https://graywebsolutions.com';
const SHARE_SLUG = 'dashboard';
const shareThrottle = makeThrottle(5, 15 * 60 * 1000);

export async function handleMintShareToken(
  request: Request,
  env: Env,
  session: Session,
): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }
  if (session.role !== 'client') {
    return json({ ok: false, error: 'Only client accounts can share a referral link.' }, 403);
  }
  if (!env.DB_CLIENTS) {
    return json({ ok: false, error: 'Sharing is not configured yet.' }, 503);
  }
  const ip = clientIp(request);
  if (shareThrottle.blocked(ip)) {
    return json({ ok: false, error: 'Too many requests. Try again in a few minutes.' }, 429);
  }
  shareThrottle.record(ip);

  const db = env.DB_CLIENTS;
  try {
    const me = await clientIdFor(db, session.email);
    if (!me) {
      return json({ ok: false, error: 'No client record for this email yet.' }, 403);
    }
    // One token per client for dashboard shares — return the existing
    // one if the client already shared from here.
    const existing = await db
      .prepare('SELECT token FROM referral_tokens WHERE client_id = ? AND demo_slug = ?')
      .bind(me.id, SHARE_SLUG)
      .first<{ token: string }>();
    let token = existing?.token ?? '';
    if (!token) {
      token = randomToken(16);
      await db
        .prepare(
          'INSERT OR IGNORE INTO referral_tokens (token, client_id, demo_slug) VALUES (?, ?, ?)',
        )
        .bind(token, me.id, SHARE_SLUG)
        .run();
      const minted = await db
        .prepare('SELECT token FROM referral_tokens WHERE client_id = ? AND demo_slug = ?')
        .bind(me.id, SHARE_SLUG)
        .first<{ token: string }>();
      if (!minted) {
        return json({ ok: false, error: 'Could not create your link. Please try again.' }, 502);
      }
      token = minted.token;
    }
    const pricing = await db
      .prepare("SELECT discount_pct FROM client_pricing WHERE client_id = ? AND project_type = 'install'")
      .bind(me.id)
      .first<{ discount_pct: number }>();
    return json({
      ok: true,
      token,
      url: `${GS_HOME}/?ref=${encodeURIComponent(token)}`,
      discountPct: pricing?.discount_pct ?? 0,
    });
  } catch (err) {
    console.error('Share-link mint failed:', err);
    return json({ ok: false, error: 'Sharing is not configured yet.' }, 503);
  }
}

// "Lock it in": a prospect's dashboard button for moving forward.
// It only emails Chris — it never flips is_client, which stays a
// hand-set flag. Chris confirms the client himself after talking
// to them, and the request forms unlock from there.
const lockInThrottle = makeThrottle(5, 15 * 60 * 1000);

export async function handleLockIn(
  request: Request,
  env: Env,
  session: Session,
): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }
  if (session.role !== 'client') {
    return json({ ok: false, error: 'Only client accounts can lock in.' }, 403);
  }
  if (!env.DB_CLIENTS || !env.RESEND_API_KEY) {
    return json({ ok: false, error: 'Lock-in is not configured yet.' }, 503);
  }
  const ip = clientIp(request);
  if (lockInThrottle.blocked(ip)) {
    return json({ ok: false, error: 'Too many requests. Try again in a few minutes.' }, 429);
  }
  lockInThrottle.record(ip);

  const client = await oneClient(env.DB_CLIENTS, session.email);
  if (!client) {
    return json({ ok: false, error: 'No client record for this email yet.' }, 403);
  }
  if (client.is_client === 1) {
    return json({ ok: false, error: 'Your site is already confirmed.' }, 403);
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Gray Solutions <${CHRIS_EMAIL}>`,
      to: [CHRIS_EMAIL],
      reply_to: client.email,
      subject: `Lock it in: ${client.business_name}`,
      text: [
        `${client.contact_name || client.business_name} (${client.email}) locked in from their client dashboard — they want to move forward with ${client.business_name}.`,
        '',
        'Set is_client = 1 for their row when you have confirmed them, and the request forms unlock on their dashboard.',
        '',
        '— Gray Solutions dashboard',
      ].join('\n'),
    }),
  });
  if (!res.ok) {
    console.error('Lock-in email failed:', res.status, await res.text().catch(() => ''));
    return json({ ok: false, error: 'Could not send the lock-in. Try again.' }, 502);
  }
  return json({ ok: true });
}
