-- v2 -> v3: client_pricing gains one row per (client, project type).
-- Run once in the D1 Console (gray-solutions-db). Existing rows are
-- COPIED into the new table, not dropped: every v2 row becomes the
-- client's row for its own project_type, so billed flags and quotes
-- survive. Safe to run twice — a second run just copies the v3 rows
-- into a fresh v3 table.
CREATE TABLE client_pricing_new (
  client_id INTEGER NOT NULL REFERENCES clients(id),
  project_type TEXT NOT NULL DEFAULT 'install' CHECK (project_type IN ('install', 'feature')),
  tier_id INTEGER REFERENCES pricing_tiers(id),
  discount_pct INTEGER NOT NULL DEFAULT 0 CHECK (discount_pct IN (0, 10, 20)),
  quoted_price_cents INTEGER CHECK (quoted_price_cents IS NULL OR quoted_price_cents >= 0),
  billed INTEGER NOT NULL DEFAULT 0 CHECK (billed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (client_id, project_type)
);
INSERT INTO client_pricing_new (client_id, project_type, tier_id, discount_pct, quoted_price_cents, billed, created_at, updated_at)
  SELECT client_id, project_type, tier_id, discount_pct, quoted_price_cents, billed, created_at, updated_at FROM client_pricing;
DROP TABLE client_pricing;
ALTER TABLE client_pricing_new RENAME TO client_pricing;
