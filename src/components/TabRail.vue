<script setup lang="ts">
import { useRoute } from 'vue-router';
import { chapters, type ChapterMeta } from '../router';

const route = useRoute();
const emit = defineEmits<{
  select: [chapter: ChapterMeta];
  contact: [];
}>();
</script>

<template>
  <nav class="tab-rail" aria-label="Chapters">
    <button
      v-for="(ch, i) in chapters"
      :key="ch.path"
      class="tab"
      :class="{ active: route.path === ch.path }"
      :aria-label="`Page ${i + 1}: ${ch.label}`"
      :aria-current="route.path === ch.path ? 'page' : undefined"
      :title="ch.label"
      @click="emit('select', ch)"
    >
      <span class="tab-num" aria-hidden="true">{{ i + 1 }}</span>
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
