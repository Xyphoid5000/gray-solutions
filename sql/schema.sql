-- gray-solutions-db: clients, referral tokens, and pricing.
-- Shared by the gray-solutions Worker (token lookup + contact form)
-- and the demos Worker (token minting). Run once in the D1 Console.
-- Emails match case-insensitively (COLLATE NOCASE); Workers lowercase
-- them before binding.

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

CREATE TABLE IF NOT EXISTS client_pricing (
  client_id INTEGER PRIMARY KEY REFERENCES clients(id),
  -- 0, 10, or 20. 10 = referred lead or hidden-code finder; 20 = a
  -- share of theirs brought in a lead. 20 is the cap — never stacks.
  discount_pct INTEGER NOT NULL DEFAULT 0 CHECK (discount_pct IN (0, 10, 20)),
  -- Before discount, in cents. NULL until Chris quotes.
  quoted_price_cents INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_referral_tokens_token ON referral_tokens(token);
