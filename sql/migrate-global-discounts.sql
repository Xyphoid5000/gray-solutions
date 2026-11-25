CREATE TABLE IF NOT EXISTS global_discounts (
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  discount_pct INTEGER NOT NULL CHECK (discount_pct BETWEEN 0 AND 50),
  start_date TEXT NOT NULL DEFAULT (date('now')),
  expiration_date TEXT NOT NULL
);
INSERT OR IGNORE INTO global_discounts (code, discount_pct, start_date, expiration_date) VALUES ('HOLIDAY25', 25, '2026-11-24', '2026-12-25');
CREATE TABLE IF NOT EXISTS client_pricing_new (
  client_id INTEGER NOT NULL REFERENCES clients(id),
  project_type TEXT NOT NULL DEFAULT 'install' CHECK (project_type IN ('install', 'feature')),
  tier_id INTEGER REFERENCES pricing_tiers(id),
  discount_pct INTEGER NOT NULL DEFAULT 0 CHECK (discount_pct BETWEEN 0 AND 50),
  quoted_price_cents INTEGER CHECK (quoted_price_cents IS NULL OR quoted_price_cents >= 0),
  billed INTEGER NOT NULL DEFAULT 0 CHECK (billed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (client_id, project_type)
);
INSERT INTO client_pricing_new SELECT * FROM client_pricing;
DROP TABLE client_pricing;
ALTER TABLE client_pricing_new RENAME TO client_pricing;
