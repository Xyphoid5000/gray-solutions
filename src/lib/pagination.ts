/**
 * usePagination — splits chapter content into screen-sized pages.
 *
 * Takes the chapter's content wrapper and groups its block-level children
 * into pages that fit the available height. Returns the pages as arrays
 * of elements. The caller moves the actual elements (no clones).
 */

export interface Page {
  elements: HTMLElement[];
}

export function paginateContent(
  wrapEl: HTMLElement,
  availableHeight: number,
): Page[] {
  const children = Array.from(wrapEl.children) as HTMLElement[];
  const pages: Page[] = [];
  let currentPage: HTMLElement[] = [];
  let currentHeight = 0;

  for (const child of children) {
    // Measure the child. If it's not in the layout yet, use a fallback.
    const h = child.offsetHeight || 100;

    // If adding this child would overflow, start a new page —
    // unless the current page is empty (single tall element gets its own page).
    if (currentPage.length > 0 && currentHeight + h > availableHeight) {
      pages.push({ elements: currentPage });
      currentPage = [];
      currentHeight = 0;
    }

    currentPage.push(child);
    currentHeight += h;
  }

  if (currentPage.length > 0) {
    pages.push({ elements: currentPage });
  }

  return pages.length > 0 ? pages : [{ elements: [] }];
}
