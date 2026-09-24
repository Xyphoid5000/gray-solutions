<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { chapters, type ChapterMeta } from '../router';

const route = useRoute();
const emit = defineEmits<{
  select: [chapter: ChapterMeta];
  contact: [];
}>();

/** The five chapters — the tabs are chapter dividers, so chapter 1 is tab 1. */
const chapterList = computed(() =>
  chapters.filter((c) => /^\d+$/.test(c.num)),
);
const currentIndex = computed(() =>
  chapters.findIndex((c) => c.path === route.path),
);
/** Chapters before the current page — backward navigation. */
const backChapters = computed(() =>
  chapterList.value.filter(
    (c) => chapters.indexOf(c) < currentIndex.value,
  ),
);
/** Chapters after the current page — forward navigation. */
const forwardChapters = computed(() =>
  chapterList.value.filter(
    (c) => chapters.indexOf(c) > currentIndex.value,
  ),
);

function tabNum(ch: ChapterMeta): string {
  return String(parseInt(ch.num, 10));
}
</script>

<template>
  <nav
    v-if="backChapters.length"
    class="tab-rail tab-rail-left"
    aria-label="Previous chapters"
  >
    <button
      v-for="ch in backChapters"
      :key="ch.path"
      class="tab"
      :aria-label="`Chapter ${tabNum(ch)}: ${ch.label}`"
      :title="ch.label"
      @click="emit('select', ch)"
    >
      <span class="tab-num" aria-hidden="true">{{ tabNum(ch) }}</span>
    </button>
  </nav>
  <nav class="tab-rail tab-rail-right" aria-label="Next chapters">
    <button
      v-for="ch in forwardChapters"
      :key="ch.path"
      class="tab"
      :aria-label="`Chapter ${tabNum(ch)}: ${ch.label}`"
      :title="ch.label"
      @click="emit('select', ch)"
    >
      <span class="tab-num" aria-hidden="true">{{ tabNum(ch) }}</span>
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
