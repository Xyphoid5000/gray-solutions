import { createRouter, createWebHistory } from 'vue-router';
import { ref, type Component } from 'vue';
import Cover from './components/Cover.vue';
import About from './components/About.vue';
import Finale from './components/Finale.vue';
import Premise from './components/Premise.vue';
import Craft from './components/Craft.vue';
import Proof from './components/Proof.vue';
import StoryArc from './components/StoryArc.vue';

export interface ChapterMeta {
  path: string;
  /** Index numeral shown in the table of contents. */
  num: string;
  /** Full label, e.g. "Chapter 01 — The Premise". */
  label: string;
  /** Compact label for the page-turner bar. */
  short: string;
  /** One-line logline for the Chapters index. */
  logline: string;
}

const components: Record<string, Component> = {
  '/': Cover,
  '/about': About,
  '/finale': Finale,
  '/premise': Premise,
  '/craft': Craft,
  '/proof': Proof,
  '/arc': StoryArc,
};

export const chapters: ChapterMeta[] = [
  { path: '/', num: '\u2726', label: 'Cover', short: 'Cover', logline: 'Gray Solutions — open the book.' },
  { path: '/premise', num: '01', label: 'Chapter 01 — The Premise', short: '01 · Premise', logline: 'Nobody remembers a brochure.' },
  { path: '/craft', num: '02', label: 'Chapter 02 — The Craft', short: '02 · Craft', logline: 'What I actually do.' },
  { path: '/proof', num: '03', label: 'Chapter 03 — The Proof', short: '03 · Proof', logline: "Don't take my word for it." },
  { path: '/arc', num: '04', label: 'Chapter 04 — The Arc', short: '04 · Arc', logline: 'Every project follows the arc.' },
  { path: '/finale', num: '\u2712', label: 'The end', short: 'The End', logline: 'Let\u2019s write yours.' },
];

/**
 * The book's chapter sequence. /about is intentionally NOT a chapter —
 * it lives off the book as a standalone details page.
 */
export function isChapter(path: string): boolean {
  return chapters.some((c) => c.path === path);
}

/** Which way the page turns: forward (next page) or back (previous page). */
export const navDirection = ref<'forward' | 'back'>('forward');

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    // The book, in order…
    ...chapters.map((c) => ({
      path: c.path,
      component: components[c.path],
    })),
    // …plus the about page, which lives off the book entirely.
    { path: '/about', component: components['/about'] },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

const order = chapters.map((c) => c.path);

router.beforeEach((to, from) => {
  const ti = order.indexOf(to.path);
  const fi = order.indexOf(from.path);
  navDirection.value = ti < fi ? 'back' : 'forward';
});

export function chapterMeta(path: string): ChapterMeta {
  return chapters.find((c) => c.path === path) ?? chapters[0];
}

export function neighbor(path: string, delta: -1 | 1): ChapterMeta | null {
  const i = order.indexOf(path);
  const n = chapters[i + delta];
  return n ?? null;
}
