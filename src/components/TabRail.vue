<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { chapters, type ChapterMeta } from '../router';

const route = useRoute();
const emit = defineEmits<{
  select: [chapter: ChapterMeta];
  contact: [];
}>();

const props = defineProps<{
  /** Chapter indices currently in the read pile — their tabs live there. */
  piled: Set<number>;
}>();

interface RailTab {
  ch: ChapterMeta;
  chIndex: number;
  active: boolean;
  /** 1-based grid row — every page owns its row. */
  row: number;
  /** Distance from the current page — drives the depth shadow. */
  depth: number;
}

const currentIndex = computed(() =>
  chapters.findIndex((c) => c.path === route.path),
);
const rowOf = (ch: ChapterMeta) => chapters.indexOf(ch) + 1;
const currentRow = computed(() => currentIndex.value + 1);

/**
 * Tabs on the right: only for pages NOT in the read pile.
 * Piled pages keep their tabs attached to the pile card (left).
 */
const allTabs = computed<RailTab[]>(() => {
  const tabs: RailTab[] = [];
  chapters.forEach((ch, i) => {
    if (props.piled.has(i)) return;
    tabs.push({
      ch,
      chIndex: i,
      active: i === currentIndex.value,
      row: rowOf(ch),
      depth: Math.abs(i - currentIndex.value),
    });
  });
  return tabs;
});
/** The contact envelope sits in its own row beneath the last page. */
const contactRow = computed(() => chapters.length + 1);

type Glyph = 'num' | 'avatar' | 'mark';
function glyph(ch: ChapterMeta): Glyph {
  if (/^\d+$/.test(ch.num)) return 'num';
  if (ch.path === '/finale') return 'avatar';
  return 'mark';
}

function tabNum(ch: ChapterMeta): string {
  return String(parseInt(ch.num, 10));
}

function tabLabel(ch: ChapterMeta): string {
  if (glyph(ch) === 'num') return `Chapter ${tabNum(ch)}: ${ch.label}`;
  return ch.label;
}
</script>

<template>
  <div class="tab-rails" aria-hidden="false">
    <nav class="tab-rail tab-rail-right" aria-label="Pages">
      <button
        v-for="(t, idx) in allTabs"
        :key="t.ch.path"
        class="tab"
        :data-tab-ch="t.chIndex"
        :class="{ active: t.active }"
        :style="{ gridRow: t.row, '--depth': t.depth }"
        :aria-label="
          t.active ? `${tabLabel(t.ch)} (current page)` : tabLabel(t.ch)
        "
        :aria-current="t.active ? 'page' : undefined"
        :title="t.ch.label"
        @click="emit('select', t.ch)"
      >
        <span v-if="glyph(t.ch) === 'num'" class="tab-num" aria-hidden="true">{{
          tabNum(t.ch)
        }}</span>
        <svg
          v-else-if="glyph(t.ch) === 'avatar'"
          class="tab-icon"
          viewBox="0 0 24 24"
          width="17"
          height="17"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8.2" r="3.4" />
          <path d="M5.8 19.2c1.1-3.2 3.4-4.9 6.2-4.9s5.1 1.7 6.2 4.9" />
        </svg>
        <span v-else class="tab-num" aria-hidden="true">{{ t.ch.num }}</span>
      </button>
      <button
        class="tab tab-contact"
        :style="{ gridRow: contactRow, '--depth': contactRow - currentRow }"
        aria-label="Contact — open the contact form"
        title="Contact"
        @click="emit('contact')"
      >
        <span class="tab-num" aria-hidden="true">&#9993;</span>
      </button>
    </nav>
  </div>
</template>
