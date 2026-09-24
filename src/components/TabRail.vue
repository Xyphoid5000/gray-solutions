<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { chapters, type ChapterMeta } from '../router';

const route = useRoute();
const emit = defineEmits<{
  select: [chapter: ChapterMeta];
  contact: [];
}>();

interface RailTab {
  ch: ChapterMeta;
  active: boolean;
  /** 1-based grid row — every page owns its row on either rail. */
  row: number;
}

const currentIndex = computed(() =>
  chapters.findIndex((c) => c.path === route.path),
);
const rowOf = (ch: ChapterMeta) => chapters.indexOf(ch) + 1;

/** Pages behind the reader — backward navigation. */
const leftTabs = computed<RailTab[]>(() =>
  chapters
    .slice(0, currentIndex.value)
    .map((ch) => ({ ch, active: false, row: rowOf(ch) })),
);
/**
 * The current page first and highlighted, then the pages ahead —
 * forward navigation.
 */
const rightTabs = computed<RailTab[]>(() => {
  const tabs: RailTab[] = [];
  const current = chapters[currentIndex.value];
  if (current) tabs.push({ ch: current, active: true, row: rowOf(current) });
  for (const ch of chapters.slice(currentIndex.value + 1)) {
    tabs.push({ ch, active: false, row: rowOf(ch) });
  }
  return tabs;
});
/** The contact envelope sits in its own row beneath the last page. */
const contactRow = computed(() => chapters.length + 1);

type Glyph = 'num' | 'avatar' | 'mark';
function glyph(ch: ChapterMeta): Glyph {
  if (/^\d+$/.test(ch.num)) return 'num';
  if (ch.path === '/about') return 'avatar';
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
    <nav class="tab-rail tab-rail-left" aria-label="Previous pages">
      <button
        v-for="t in leftTabs"
        :key="t.ch.path"
        class="tab"
        :style="{ gridRow: t.row }"
        :aria-label="tabLabel(t.ch)"
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
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 20.5c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6" />
        </svg>
        <span v-else class="tab-num" aria-hidden="true">{{ t.ch.num }}</span>
      </button>
    </nav>
    <nav class="tab-rail tab-rail-right" aria-label="Current and next pages">
      <button
        v-for="t in rightTabs"
        :key="t.ch.path"
        class="tab"
        :class="{ active: t.active }"
        :style="{ gridRow: t.row }"
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
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 20.5c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6" />
        </svg>
        <span v-else class="tab-num" aria-hidden="true">{{ t.ch.num }}</span>
      </button>
      <button
        class="tab tab-contact"
        :style="{ gridRow: contactRow }"
        aria-label="Contact — open the contact form"
        title="Contact"
        @click="emit('contact')"
      >
        <span class="tab-num" aria-hidden="true">&#9993;</span>
      </button>
    </nav>
  </div>
</template>
