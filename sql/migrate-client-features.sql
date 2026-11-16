-- Featured sites (2026-11-16): client_features holds one row per
-- client Chris picks to feature — the book and the projects page
-- read these rows. Run once in the D1 Console (gray-solutions-db).
-- Safe to re-run: the CREATE is IF NOT EXISTS, and each seed skips
-- a client that already has a feature row.

CREATE TABLE IF NOT EXISTS client_features (
  id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  image_key TEXT,
  show_link INTEGER NOT NULL DEFAULT 0 CHECK (show_link IN (0, 1)),
  tags TEXT NOT NULL DEFAULT '',
  booktext TEXT NOT NULL DEFAULT '',
  pagetext TEXT NOT NULL DEFAULT '',
  show_in_book INTEGER NOT NULL DEFAULT 0 CHECK (show_in_book IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seeds: the three current clients, with the copy already on the
-- site. booktext is the book chapter's panel copy; pagetext is the
-- projects page description. image_key stays NULL until Chris
-- uploads a screenshot in admin. Four Corners gets no row — it has
-- no clients row yet; it enters when Chris features it.

INSERT INTO client_features (client_id, name, image_key, show_link, tags, booktext, pagetext, show_in_book)
SELECT id, 'Burning River Auto Glass', NULL, 0, 'Vue 3,Vite,GSAP,Design',
  'A local auto glass company on a generic Squarespace template. I rebuilt it as a cinematic custom site — the same business, an entirely different first impression. Scroll-driven storytelling, built to make a cracked windshield feel like the start of an adventure.',
  'A local auto glass company stuck on a generic Squarespace template. I rebuilt it as a cinematic custom site — the same business, an entirely different first impression.',
  1
FROM clients
WHERE email = 'ian@burningriverautoglass.com'
  AND NOT EXISTS (SELECT 1 FROM client_features cf WHERE cf.client_id = clients.id);

INSERT INTO client_features (client_id, name, image_key, show_link, tags, booktext, pagetext, show_in_book)
SELECT id, 'Pro Bros', NULL, 0, 'Vue 3,TypeScript,Vite,GSAP',
  'A landscaping company with no site at all. I built them a cinematic one — a short film, services, and a way to get in touch — so the first impression matches the work.',
  'A landscaping company with no site at all. I built them a cinematic one — a short film, services, and a way to get in touch — so the first impression matches the work.',
  1
FROM clients
WHERE email = 'ProBrosSvcs@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM client_features cf WHERE cf.client_id = clients.id);

INSERT INTO client_features (client_id, name, image_key, show_link, tags, booktext, pagetext, show_in_book)
SELECT id, 'The Punctuation', NULL, 0, 'Vue 3,TypeScript,Vite,Pinia',
  'A band that needed a home for its music, its studio, and its gigs. I built them a record store you walk through — every wall is a different room of the band.',
  'A band that needed a home for its music, its studio, and its gigs. I built them a record store you walk through — every wall is a different room of the band.',
  1
FROM clients
WHERE email = 'thepunctuationband@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM client_features cf WHERE cf.client_id = clients.id);
