-- gray-solutions-db: clients, referral tokens, pricing, requests, and
-- dashboard sign-in tokens. Shared by the gray-solutions Worker
-- (token lookup + contact form + dashboards) and the demos Worker
-- (token minting). Run once in the D1 Console. Emails match
-- case-insensitively (COLLATE NOCASE); Workers lowercase them
-- before binding.
--
-- v2 (2026-11-15): pricing_tiers, client_requests, and magic_tokens
-- added; client_pricing reshaped (project_type, tier_id, billed).
-- Upgrading an existing database: DROP TABLE client_pricing first,
-- then run this file — the other tables keep their rows.

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  -- 1 once they've agreed to use Gray Solutions.
  is_client INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referral_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  -- Which demo minted it ('' if minted elsewhere). One token per
  -- client per demo: re-sharing returns the same link.
  demo_slug TEXT NOT NULL DEFAULT '',
  opened INTEGER NOT NULL DEFAULT 0,
  opened_at TEXT,
  used INTEGER NOT NULL DEFAULT 0,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(client_id, demo_slug)
);

CREATE TABLE IF NOT EXISTS pricing_tiers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  -- Starting price, in cents. The public pricing page and the
  -- contact form read these rows — change a price here and the
  -- site follows.
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  description TEXT NOT NULL DEFAULT ''
);

-- The three tiers, approved 2026-11-15. One-time prices, no monthly
-- fee. A feature on an established site prices from the same tiers
-- at the returning-client rate (x0.85, applied by the Worker).
INSERT OR IGNORE INTO pricing_tiers (id, name, price_cents, description) VALUES
  (1, 'Static page', 80000, 'A custom-designed, hand-coded site with no backend.'),
  (2, 'Web application', 220000, 'A static site plus backend features — forms that save, logins, updatable content.'),
  (3, 'Payment processing', 300000, 'A web application with payment processing — checkout and invoices, built in.');

CREATE TABLE IF NOT EXISTS client_pricing (
  client_id INTEGER PRIMARY KEY REFERENCES clients(id),
  -- 'install' = a new site build; 'feature' = a feature on an
  -- established client's site (priced from the tier at the
  -- returning-client rate).
  project_type TEXT NOT NULL DEFAULT 'install' CHECK (project_type IN ('install', 'feature')),
  -- The tier this quote prices from. NULL until a tier is picked.
  tier_id INTEGER REFERENCES pricing_tiers(id),
  -- 0, 10, or 20. 10 = referred lead or hidden-code finder; 20 = a
  -- share of theirs brought in a lead (10 off future enhancements
  -- for established clients). 20 is the cap — never stacks.
  discount_pct INTEGER NOT NULL DEFAULT 0 CHECK (discount_pct IN (0, 10, 20)),
  -- After any discount, in cents — the number the client saw. NULL
  -- until quoted. The pre-discount price is the tier's price (see
  -- tier_id). A custom quote that matches no tier exactly keeps
  -- tier_id NULL and carries the agreed number here.
  quoted_price_cents INTEGER CHECK (quoted_price_cents IS NULL OR quoted_price_cents >= 0),
  -- 1 once Chris has billed the client for this quote. A fresh
  -- submission resets it to 0 — a new inquiry means a new,
  -- unbilled quote.
  billed INTEGER NOT NULL DEFAULT 0 CHECK (billed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS client_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  -- 'change' = a free tweak to an existing site (text, image swap);
  -- 'feature' = new capability, priced from a tier.
  type TEXT NOT NULL CHECK (type IN ('change', 'feature')),
  details TEXT NOT NULL,
  -- R2 object key for an attached image, if any. NULL when the
  -- request has no image or image upload isn't configured.
  image_key TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'done', 'declined')),
  -- The tier a feature request prices from. NULL for changes.
  tier_id INTEGER REFERENCES pricing_tiers(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS magic_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  -- SHA-256 hex of the token. The plain token only ever travels in
  -- the sign-in email.
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_referral_tokens_token ON referral_tokens(token);

-- The Workers never DELETE from these tables. Magic tokens are
-- single-use and expire after 15 minutes; stale rows are harmless
-- and nothing prunes them yet.
