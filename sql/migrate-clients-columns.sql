-- Clients columns: site_url (dashboard link) + demo_slug (demo-gate link).
-- Run in the D1 console for gray-solutions-db. Neither ALTER is
-- idempotent: a "duplicate column name" error means that column
-- already exists — skip that line and run the rest.
ALTER TABLE clients ADD COLUMN site_url TEXT;
ALTER TABLE clients ADD COLUMN demo_slug TEXT;
