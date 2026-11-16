-- pricing_tiers: add the dashboard-only Free ($0) tier.
-- Run once in the D1 Console (gray-solutions-db). The ALTER fails
-- with "duplicate column name" if it already ran — that just means
-- the column exists; run the INSERT on its own in that case.
ALTER TABLE pricing_tiers ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1));
INSERT OR IGNORE INTO pricing_tiers (id, name, price_cents, description, is_public) VALUES (4, 'Free', 0, 'A free build — no charge.', 0);
