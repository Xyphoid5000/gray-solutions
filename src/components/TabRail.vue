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
}

const currentIndex = computed(() =>
  chapters.findIndex((c) => c.path === route.path),
);
/** Pages behind the reader — backward navigation. */
const leftTabs = computed<RailTab[]>(() =>
  chapters.slice(0, currentIndex.value).map((ch) => ({ ch, active: false })),
);
/**
 * The current page first and highlighted, then the pages ahead —
 * forward navigation.
 */
const rightTabs = computed<RailTab[]>(() => {
  const tabs: RailTab[] = [];
  const current = chapters[currentIndex.value];
  if (current) tabs.push({ ch: current, active: true });
  for (const ch of chapters.slice(currentIndex.value + 1)) {
    tabs.push({ ch, active: false });
  }
  return tabs;
});

const isChapter = (ch: ChapterMeta) => /^\d+$/.test(ch.num);
const isAbout = (ch: ChapterMeta) => ch.path === '/about';

function tabNum(ch: ChapterMeta): string {
  return String(parseInt(ch.num, 10));
}

function tabLabel(ch: ChapterMeta): string {
  if (isChapter(ch)) return `Chapter ${tabNum(ch)}: ${ch.label}`;
  return ch.label;
}
</script>

<template>
  <nav
    v-if="leftTabs.length"
    class="tab-rail tab-rail-left"
    aria-label="Previous pages"
  >
    <button
      v-for="t in leftTabs"
      :key="t.ch.path"
      class="tab"
      :aria-label="tabLabel(t.ch)"
      :title="t.ch.label"
      @click="emit('select', t.ch)"
    >
      <span
        v-if="isChapter(t.ch)"
        class="tab-num"
        aria-hidden="true"
        >{{ tabNum(t.ch) }}</span
      >
      <svg
        v-else-if="isAbout(t.ch)"
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
      <span v-else class="tab-num" aria-hidden="true">&#10002;&#65038;</span>
    </button>
  </nav>
  <nav class="tab-rail tab-rail-right" aria-label="Next pages">
    <button
      v-for="t in rightTabs"
      :key="t.ch.path"
      class="tab"
      :class="{ active: t.active }"
      :aria-label="
        t.active ? `${tabLabel(t.ch)} (current page)` : tabLabel(t.ch)
      "
      :aria-current="t.active ? 'page' : undefined"
      :title="t.ch.label"
      @click="emit('select', t.ch)"
    >
      <span
        v-if="isChapter(t.ch)"
        class="tab-num"
        aria-hidden="true"
        >{{ tabNum(t.ch) }}</span
      >
      <svg
        v-else-if="isAbout(t.ch)"
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
      <span v-else class="tab-num" aria-hidden="true">&#10002;&#65038;</span>
    </button>
    <button
      class="tab tab-contact"
      aria-label="Contact — open the contact form"
      title="Contact"
      @click="emit('contact')"
    >
      <span class="tab-num" aria-hidden="true">&#9993;</span>
    </button>
  </nav>
</template>
