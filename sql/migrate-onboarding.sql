-- Onboarding signup (2026-11-16): the contact form becomes the
-- signup form. Run once in the D1 Console (gray-solutions-db).
-- The ALTERs are not idempotent: a "duplicate column name" error
-- means that column already exists — skip that line and run the
-- rest. The UPDATE backfills status from is_client: established
-- clients become 'current', everyone else 'prospective'. New
-- signups arrive as 'onboarding'. The dashboard Worker writes
-- the identical migration; keep the two copies in step.
ALTER TABLE clients ADD COLUMN status TEXT NOT NULL DEFAULT 'prospective' CHECK (status IN ('onboarding','prospective','current'));
UPDATE clients SET status = CASE WHEN is_client = 1 THEN 'current' ELSE 'prospective' END;
ALTER TABLE clients ADD COLUMN requested_tier_id INTEGER REFERENCES pricing_tiers(id);
CREATE TABLE IF NOT EXISTS discussion_comments (id INTEGER PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, comment_owner TEXT NOT NULL, comment_text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), read_at TEXT);
CREATE INDEX IF NOT EXISTS idx_discussion_comments_client ON discussion_comments(client_id);
DROP TABLE IF EXISTS comment_notifications;
CREATE TABLE IF NOT EXISTS comment_notifications (thread_kind TEXT NOT NULL CHECK (thread_kind IN ('project','request','discussion')), thread_id TEXT NOT NULL, recipient_email TEXT NOT NULL, last_sent_at TEXT NOT NULL, PRIMARY KEY (thread_kind, thread_id, recipient_email));
