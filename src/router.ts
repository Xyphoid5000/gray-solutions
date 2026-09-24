import { createRouter, createWebHistory } from 'vue-router';
import { ref, type Component } from 'vue';
import Cover from './components/Cover.vue';
import About from './components/About.vue';
import Premise from './components/Premise.vue';
import Craft from './components/Craft.vue';
import Proof from './components/Proof.vue';
import StoryArc from './components/StoryArc.vue';
import Author from './components/Author.vue';
import Epilogue from './components/Epilogue.vue';

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
  '/premise': Premise,
  '/craft': Craft,
  '/proof': Proof,
  '/arc': StoryArc,
  '/author': Author,
  '/epilogue': Epilogue,
};

export const chapters: ChapterMeta[] = [
  { path: '/', num: '\u2726', label: 'Cover', short: 'Cover', logline: 'Gray Solutions — open the book.' },
  { path: '/about', num: '\u00A7', label: 'About the author', short: 'About', logline: 'The guy behind the book.' },
  { path: '/premise', num: '01', label: 'Chapter 01 — The Premise', short: '01 · Premise', logline: 'Nobody remembers a brochure.' },
  { path: '/craft', num: '02', label: 'Chapter 02 — The Craft', short: '02 · Craft', logline: 'What I actually do.' },
  { path: '/proof', num: '03', label: 'Chapter 03 — The Proof', short: '03 · Proof', logline: "Don't take my word for it." },
  { path: '/arc', num: '04', label: 'Chapter 04 — The Arc', short: '04 · Arc', logline: 'Every project follows the arc.' },
  { path: '/author', num: '05', label: 'Chapter 05 — The Author', short: '05 · Author', logline: "Hi, I'm Chris." },
  { path: '/epilogue', num: '\u00B6', label: 'Epilogue', short: 'Epilogue', logline: "Let's write yours." },
];

/** Which way the page turns: forward (next page) or back (previous page). */
export const navDirection = ref<'forward' | 'back'>('forward');

export const router = createRouter({
  history: createWebHistory(),
  routes: chapters.map((c) => ({
    path: c.path,
    component: components[c.path],
  })),
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
