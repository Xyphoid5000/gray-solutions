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
  component: Component;
}

export const chapters: Chapter[] = [
  { num: 1, label: 'Chapter 01 — The Premise', component: Premise },
  { num: 2, label: 'Chapter 02 — The Craft', component: Craft },
  { num: 3, label: 'Chapter 03 — The Proof', component: Proof },
  { num: 4, label: 'Chapter 04 — The Arc', component: StoryArc },
  { num: 5, label: 'The End', component: Finale },
];
