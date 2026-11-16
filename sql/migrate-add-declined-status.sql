-- Add 'declined' to the client_project status CHECK (and preserve
-- the 'change' type from migrate-add-change-type.sql). SQLite
-- cannot alter a CHECK in place, so this rebuilds the table.
-- Safe to run whether or not migrate-add-change-type.sql ran: it
-- rebuilds from whatever client_project currently holds.
-- project_comments is dropped and recreated by this script; it
-- holds no rows at this point in history.

DROP TABLE IF EXISTS project_comments;
ALTER TABLE client_project RENAME TO client_project_old;
CREATE TABLE client_project (
  id TEXT PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  type TEXT NOT NULL CHECK (type IN ('install', 'feature', 'upgrade', 'change')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tier_id INTEGER REFERENCES pricing_tiers(id),
  price_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'designing', 'quoted', 'in_progress', 'pending_payment', 'pending_approval', 'complete', 'declined')),
  remaining_balance_cents INTEGER,
  discount_id INTEGER REFERENCES discounts(id),
  request_id INTEGER REFERENCES client_requests(id),
  completion_reward_applied INTEGER NOT NULL DEFAULT 0 CHECK (completion_reward_applied IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO client_project (id, client_id, type, name, description, tier_id, price_cents, status, remaining_balance_cents, discount_id, request_id, completion_reward_applied, created_at, updated_at)
SELECT id, client_id, type, name, description, tier_id, price_cents, status, remaining_balance_cents, discount_id, request_id, completion_reward_applied, created_at, updated_at FROM client_project_old;
DROP TABLE client_project_old;
CREATE INDEX idx_client_project_client ON client_project(client_id);
CREATE TABLE project_comments (
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES client_project(id) ON DELETE CASCADE,
  comment_owner TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  image_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT
);
CREATE INDEX idx_project_comments_project ON project_comments(project_id);
