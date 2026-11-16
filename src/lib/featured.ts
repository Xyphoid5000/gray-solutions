// Featured sites: the database is the source of truth (GET
// /api/featured), with the hardcoded project list as the fallback
// for when the lookup fails or no client is featured yet — the book
// and the projects page never render without exhibits, and the two
// lists are never mixed: a loaded list replaces the static client
// entries wholesale (the portfolio-itself entry always stays
// static, appended by the caller).

import type { Project } from './projects';

/** One row from GET /api/featured. */
export interface FeaturedSite {
  id: number;
  name: string;
  siteUrl: string | null;
  tags: string[];
  booktext: string;
  pagetext: string;
  showInBook: boolean;
  imageUrl: string | null;
}

function isFeaturedSite(v: unknown): v is FeaturedSite {
  if (!v || typeof v !== 'object') return false;
  const s = v as FeaturedSite;
  return (
    typeof s.id === 'number' &&
    typeof s.name === 'string' &&
    (s.siteUrl === null || typeof s.siteUrl === 'string') &&
    Array.isArray(s.tags) &&
    s.tags.every((t) => typeof t === 'string') &&
    typeof s.booktext === 'string' &&
    typeof s.pagetext === 'string' &&
    typeof s.showInBook === 'boolean' &&
    (s.imageUrl === null || typeof s.imageUrl === 'string')
  );
}

async function fetchFeaturedRows(): Promise<FeaturedSite[] | null> {
  try {
    const res = await fetch('/api/featured');
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; features?: unknown };
    if (res.ok && data.ok === true && Array.isArray(data.features)) {
      return data.features.filter(isFeaturedSite);
    }
  } catch {
    /* fall through to the static list */
  }
  return null;
}

/** A featured row as a Project: the book surface reads booktext,
    the projects page reads pagetext. The table carries no story
    text and no image is guaranteed, so those come back empty and
    the showcase omits those blocks. */
function toProject(row: FeaturedSite, surface: 'book' | 'page'): Project {
  return {
    slug: `feature-${row.id}`,
    name: row.name,
    kicker: 'Client work',
    url: row.siteUrl ?? '',
    image: row.imageUrl ?? '',
    imageAlt: `${row.name} website`,
    description: surface === 'book' ? row.booktext : row.pagetext,
    tech: row.tags,
    story: '',
  };
}

/** The featured list for one surface, or null when the caller
    should render the static list instead: the lookup failed, or
    no client is featured yet. The book surface keeps show_in_book
    rows only; the page surface keeps every row. */
export async function loadFeaturedProjects(
  surface: 'book' | 'page',
): Promise<Project[] | null> {
  const rows = await fetchFeaturedRows();
  if (!rows || rows.length === 0) return null;
  const picked = surface === 'book' ? rows.filter((r) => r.showInBook) : rows;
  return picked.map((r) => toProject(r, surface));
}
