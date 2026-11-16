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
--
-- v3 (2026-11-15): client_pricing holds one row per (client,
-- project type) — a client's install quote and their standing
-- enhancement terms are separate records, so an established
-- client's referral reward lands as a new feature row and never
-- touches their install row. Upgrading: run
-- sql/migrate-v2-to-v3.sql (it COPIES the rows — do not DROP).
--
-- pricing_tiers gained is_public + the Free tier (2026-11-15):
-- Free ($0) is dashboard-only — the public pricing endpoint
-- filters it out. Upgrading: run sql/migrate-tiers-free.sql.
--
-- client_features (2026-11-16): one row per client Chris picks to
-- feature — the book and the projects page read these rows.
-- Upgrading: run sql/migrate-client-features.sql (it also seeds
-- the current clients).
--
-- client_project, discounts, project_comments, referral_leads
-- (2026-11-16): the dashboard redesign — per-client project
-- history replacing client_pricing, earned discounts keyed by
-- client, comment threads, and one attribution per referral lead.
-- Upgrading: run sql/migrate-client-projects.sql (it copies
-- client_pricing rows — do not DROP client_pricing until Phase 2
-- is verified live).

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  -- 1 once they've agreed to use Gray Web Solutions.
  is_client INTEGER NOT NULL DEFAULT 0,
  -- 1 for the permanent test client: hidden from the admin list
  -- unless testing mode is on.
  is_test INTEGER NOT NULL DEFAULT 0,
  -- Link shown in their client dashboard: their live site, or their
  -- demo on demos.graywebsolutions.com while it's still a preview.
  site_url TEXT,
  -- Demo slug this client record is linked to (demos Worker sets it
  -- when the prospect provides their info at the demo gate).
  demo_slug TEXT,
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
  description TEXT NOT NULL DEFAULT '',
  -- 1 = listed on the public pricing page and contact form; 0 =
  -- dashboard-only (the Free tier).
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1))
);

-- The three tiers, approved 2026-11-15. One-time prices, no monthly
-- fee. A feature on an established site prices from the same tiers
-- at the returning-client rate (x0.85, applied by the Worker).
-- Free ($0, dashboard-only) marks no-cost builds; an established
-- client's row with no quoted rate is assumed free (see the
-- dashboard Worker).
INSERT OR IGNORE INTO pricing_tiers (id, name, price_cents, description, is_public) VALUES
  (1, 'Static page', 80000, 'A custom-designed, hand-coded site with no backend.', 1),
  (2, 'Web application', 220000, 'A static site plus backend features — forms that save, logins, updatable content.', 1),
  (3, 'Payment processing', 300000, 'A web application with payment processing — checkout and invoices, built in.', 1),
  (4, 'Free', 0, 'A free build — no charge.', 0);

-- DEPRECATED (2026-11-16): pending drop once Phase 2 is verified
-- live against client_project. Do not write new code against this
-- table; see sql/migrate-client-projects.sql.
CREATE TABLE IF NOT EXISTS client_pricing (
  -- One row per (client, project type): the install row carries the
  -- site quote, the feature row carries the standing enhancement
  -- terms (a referral reward, a future quote). Neither row's writes
  -- touch the other.
  client_id INTEGER NOT NULL REFERENCES clients(id),
  -- 'install' = a new site build; 'feature' = a feature on an
  -- established client's site (priced from the tier at the
  -- returning-client rate).
  project_type TEXT NOT NULL DEFAULT 'install' CHECK (project_type IN ('install', 'feature')),
  -- The tier this quote prices from. NULL until a tier is picked.
  tier_id INTEGER REFERENCES pricing_tiers(id),
  -- 0, 10, or 20. On the install row: 10 = referred lead or
  -- hidden-code finder; 20 = a share of theirs brought in a lead.
  -- On the feature row: 10 = an established client's reward for a
  -- share that brought in a lead. 20 is the cap — never stacks.
  discount_pct INTEGER NOT NULL DEFAULT 0 CHECK (discount_pct IN (0, 10, 20)),
  -- After any discount, in cents — the number the client saw. NULL
  -- until quoted. The pre-discount price is the tier's price (see
  -- tier_id). A custom quote that matches no tier exactly keeps
  -- tier_id NULL and carries the agreed number here.
  quoted_price_cents INTEGER CHECK (quoted_price_cents IS NULL OR quoted_price_cents >= 0),
  -- 1 once Chris has billed the client for this quote. A fresh
  -- submission resets its own row to 0 — a new inquiry means a new,
  -- unbilled quote.
  billed INTEGER NOT NULL DEFAULT 0 CHECK (billed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (client_id, project_type)
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

CREATE TABLE IF NOT EXISTS client_features (
  id INTEGER PRIMARY KEY,
  -- One row per featured client, created only when Chris picks the
  -- client in admin — nothing creates rows automatically. Deleting
  -- the client removes the feature row with it.
  client_id INTEGER NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  -- Display name on the book and projects page.
  name TEXT NOT NULL DEFAULT '',
  -- R2 object key for the site screenshot, uploaded in admin. NULL
  -- until an image is uploaded; the site renders without one.
  image_key TEXT,
  -- The client's own switch (their dashboard): 1 links the feature
  -- to their live site, 0 shows it unlinked. Opt-in — featuring a
  -- site never links it until the client toggles the link on.
  show_link INTEGER NOT NULL DEFAULT 0 CHECK (show_link IN (0, 1)),
  -- Comma-separated tech tags.
  tags TEXT NOT NULL DEFAULT '',
  -- The book chapter's panel copy.
  booktext TEXT NOT NULL DEFAULT '',
  -- The projects page copy.
  pagetext TEXT NOT NULL DEFAULT '',
  -- 1 = the site appears in the book (about three, plus the
  -- portfolio itself); 0 = projects page only.
  show_in_book INTEGER NOT NULL DEFAULT 0 CHECK (show_in_book IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Discounts: one row per client holding their total earned
-- discount percent and how many leads they've generated. The
-- percent is a total: 15 when a project completes and is paid (a
-- floor), +10 on the first generated lead, +5 per lead after,
-- capped at 50. Quote-time caps apply per project type (install
-- 25%, feature/upgrade 50%) — the cap lives in the quoting code,
-- not here.
CREATE TABLE IF NOT EXISTS discounts (
  id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL UNIQUE REFERENCES clients(id),
  -- Total earned percent off, 0-50.
  discount_pct INTEGER NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 50),
  -- Leads this client has generated (rows in referral_leads).
  leads_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Client projects: the per-client project history. The id is a
-- 7-character lowercase hex "short SHA", generated by the Workers
-- (and by the migration copy for migrated rows) — short enough to
-- quote in email subjects and reply-to addresses.
CREATE TABLE IF NOT EXISTS client_project (
  -- Short SHA id, e.g. 'a3f9c21'. TEXT PRIMARY KEY: ids are
  -- generated, never sequential.
  id TEXT PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  -- 'install' = the first project, a new site build; 'feature' =
  -- new capability on an existing site; 'upgrade' = moving the
  -- site to a higher tier; 'change' = a free small change on an
  -- existing site.
  type TEXT NOT NULL CHECK (type IN ('install', 'feature', 'upgrade', 'change')),
  -- Display name, e.g. 'Website install'. Admin-editable.
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- The tier this project prices from. NULL until a tier is
  -- picked; the tier is only the default cost basis — price_cents
  -- is the authoritative quote and may differ.
  tier_id INTEGER REFERENCES pricing_tiers(id),
  -- The quoted price after discount, in cents. NULL = unquoted.
  price_cents INTEGER,
  -- In order: new, designing, quoted, in_progress, pending_payment
  -- (a downpayment is required before the site ships),
  -- pending_approval, complete.
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'designing', 'quoted', 'in_progress', 'pending_payment', 'pending_approval', 'complete')),
  -- What the client still owes, in cents. NULL = unset. Updated by
  -- hand until a payment system lands.
  remaining_balance_cents INTEGER,
  -- The discounts row whose percent was applied to this project's
  -- quote (a snapshot link, not a live join).
  discount_id INTEGER REFERENCES discounts(id),
  -- The client request this project came from, if any. NULL for
  -- projects created directly by the admin or copied here.
  request_id INTEGER REFERENCES client_requests(id),
  -- 1 once the completion reward (the 15% floor + referral token)
  -- has been applied for this project — it must fire exactly once.
  completion_reward_applied INTEGER NOT NULL DEFAULT 0 CHECK (completion_reward_applied IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_client_project_client ON client_project(client_id);

-- Project comments: the conversation thread on a project. Comments
-- send emails and drive notification badges on both dashboards.
CREATE TABLE IF NOT EXISTS project_comments (
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES client_project(id) ON DELETE CASCADE,
  -- The commenter's email address (chris@ or the client's).
  comment_owner TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  -- R2 object key for an attached image, if any. NULL = no image.
  image_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- When the counterparty read it. NULL = unread; the owner never
  -- needs to read their own comment.
  read_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_project_comments_project ON project_comments(project_id);

-- Referral leads: one row per lead a client's sharing brought in.
-- lead_client_id is UNIQUE: one attribution per lead, so the
-- +10/+5 discount ladder counts each lead exactly once no matter
-- how many times a token is opened or a contact form is submitted.
CREATE TABLE IF NOT EXISTS referral_leads (
  id INTEGER PRIMARY KEY,
  referrer_client_id INTEGER NOT NULL REFERENCES clients(id),
  lead_client_id INTEGER NOT NULL UNIQUE REFERENCES clients(id),
  -- The token the lead arrived with.
  token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_referral_tokens_token ON referral_tokens(token);

-- The Workers never DELETE from these tables. Magic tokens are
-- single-use and expire after 15 minutes; stale rows are harmless
-- and nothing prunes them yet.
