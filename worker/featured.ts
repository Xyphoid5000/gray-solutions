// Featured sites: the public read side of the client_features table.
// The book and the projects page read these rows; the admin dashboard
// (on its own subdomain) writes them. A row exists only when Chris
// picks a client to feature — nothing creates rows automatically.
// A missing table (the migration hasn't run yet) reads as an empty
// list, never an error, so the site falls back to its hardcoded
// projects.

import { json, makeThrottle, clientIp } from './http';
import type { D1Database, Env } from './env';

export interface FeaturedSite {
  id: number;
  name: string;
  /** The client's live site — only when they consented to the link
      (show_link) and a site URL is on file: the production URL from
      their domain rows first, the legacy clients.site_url fallback. */
  siteUrl: string | null;
  tags: string[];
  /** The book chapter's panel copy. */
  booktext: string;
  /** The projects page copy. */
  pagetext: string;
  /** The "How the story was written" copy — empty until the admin
      fills it in; the site falls back to its hardcoded copy then. */
  story: string;
  showInBook: boolean;
  /** The featured-image route, or null when no image was uploaded. */
  imageUrl: string | null;
}

interface FeatureRow {
  id: number;
  name: string;
  image_key: string | null;
  show_link: number;
  tags: string;
  booktext: string;
  pagetext: string;
  show_in_book: number;
  site_url: string | null;
  /** Absent until the story migration runs — read as ''. */
  story?: string | null;
}

export async function listFeatures(db: D1Database): Promise<FeaturedSite[]> {
  // The story column arrives via a one-time migration; until it
  // runs, the same query without it keeps the features live.
  const select = (withStory: boolean) =>
    `SELECT f.id AS id, f.name AS name, f.image_key AS image_key, f.show_link AS show_link,
       f.tags AS tags, f.booktext AS booktext, f.pagetext AS pagetext,
       f.show_in_book AS show_in_book,${withStory ? ' f.story AS story,' : ''}
       COALESCE(
         (SELECT d.production_url FROM client_domains d
           WHERE d.client_id = c.id
             AND d.production_url IS NOT NULL AND d.production_url != ''
           ORDER BY d.id LIMIT 1),
         c.site_url
       ) AS site_url
     FROM client_features f LEFT JOIN clients c ON c.id = f.client_id
     ORDER BY f.id`;
  let res;
  try {
    res = await db.prepare(select(true)).all<FeatureRow>();
  } catch (err) {
    if (!(err instanceof Error && err.message.includes('no such column'))) throw err;
    res = await db.prepare(select(false)).all<FeatureRow>();
  }
  return res.results.map((r) => ({
    id: r.id,
    name: r.name,
    siteUrl: r.show_link === 1 && r.site_url ? r.site_url : null,
    tags: (r.tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    booktext: r.booktext ?? '',
    pagetext: r.pagetext ?? '',
    story: r.story ?? '',
    showInBook: r.show_in_book === 1,
    imageUrl: r.image_key ? `/api/featured-image?key=${encodeURIComponent(r.image_key)}` : null,
  }));
}

const featuredThrottle = makeThrottle(30, 15 * 60 * 1000);

export async function handleFeatured(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }
  const ip = clientIp(request);
  if (featuredThrottle.blocked(ip)) {
    return json({ ok: false, error: 'Too many requests.' }, 429);
  }
  featuredThrottle.record(ip);
  if (!env.DB_CLIENTS) {
    return json({ ok: true, features: [] });
  }
  try {
    return json({ ok: true, features: await listFeatures(env.DB_CLIENTS) });
  } catch (err) {
    // Pre-migration database (no client_features table): an empty
    // list, so the site renders its hardcoded projects.
    console.error('Featured lookup failed:', err);
    return json({ ok: true, features: [] });
  }
}

const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
};

function contentTypeFor(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_TYPES[ext] ?? 'application/octet-stream';
}

export async function handleFeaturedImage(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  }
  const key = new URL(request.url).searchParams.get('key') ?? '';
  if (!key || key.length > 512 || !env.DB_CLIENTS || !env.R2_UPLOADS) {
    return json({ ok: false, error: 'Not found.' }, 404);
  }
  try {
    // The key must belong to a featured site — arbitrary R2 keys are
    // never served through this route.
    const ref = await env.DB_CLIENTS.prepare(
      'SELECT 1 AS one FROM client_features WHERE image_key = ? LIMIT 1',
    )
      .bind(key)
      .first<{ one: number }>();
    if (!ref) {
      return json({ ok: false, error: 'Not found.' }, 404);
    }
    const obj = await env.R2_UPLOADS.get(key);
    if (!obj) {
      return json({ ok: false, error: 'Not found.' }, 404);
    }
    return new Response(await obj.arrayBuffer(), {
      headers: {
        'content-type': contentTypeFor(key),
        'cache-control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    // A missing table included: nothing to verify the key against,
    // so the answer is 404 either way.
    console.error('Featured image lookup failed:', err);
    return json({ ok: false, error: 'Not found.' }, 404);
  }
}
