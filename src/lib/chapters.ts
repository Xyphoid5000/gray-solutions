import type { Component } from 'vue';
import Premise from '../components/Premise.vue';
import Craft from '../components/Craft.vue';
import Proof from '../components/Proof.vue';
import StoryArc from '../components/StoryArc.vue';
import Finale from '../components/Finale.vue';

export interface Chapter {
  /** 1-based chapter number for tabs and pile. */
  num: number;
  label: string;
  logline: string;
  component: Component;
}

export const chapters: Chapter[] = [
  {
    num: 1,
    label: 'Chapter 01 — The Premise',
    logline: 'Nobody remembers a brochure. They remember a story.',
    component: Premise,
  },
  {
    num: 2,
    label: 'Chapter 02 — The Craft',
    logline: 'Four disciplines, one obsession: a website that reads like it was written.',
    component: Craft,
  },
  {
    num: 3,
    label: 'Chapter 03 — The Proof',
    logline: "Don't take my word for it. Take theirs.",
    component: Proof,
  },
  {
    num: 4,
    label: 'Chapter 04 — The Arc',
    logline: 'Every project follows the same arc: listen, shape, build, launch.',
    component: StoryArc,
  },
  {
    num: 5,
    label: 'The End',
    logline: "Let's write your story.",
    component: Finale,
  },
];
