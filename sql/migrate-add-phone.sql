-- Client phone numbers: the number from the signup form, stored
-- on the client row so the admin sees it (with a tel: link) on
-- the client page and in the masked dashboard. NULL when the
-- visitor left it blank. The dashboards read it with a
-- pre-migration fallback, so this can run after the code lands;
-- the marketing Worker stores it only once the column exists.
ALTER TABLE clients ADD COLUMN phone TEXT;
