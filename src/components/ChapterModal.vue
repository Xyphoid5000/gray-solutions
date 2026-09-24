<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import type { ChapterMeta } from '../router';

defineProps<{
  chapter: ChapterMeta;
  current: boolean;
}>();

const emit = defineEmits<{
  close: [];
  go: [path: string];
}>();

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="chapter-modal-backdrop" @click.self="emit('close')">
    <div
      class="chapter-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="chapter.label"
    >
      <button
        class="chapter-modal-close"
        @click="emit('close')"
        aria-label="Close chapter preview"
      >
        <span aria-hidden="true">&times;</span>
      </button>
      <p class="chapter-modal-kicker">From the index</p>
      <h3 class="chapter-modal-title">{{ chapter.label }}</h3>
      <p class="chapter-modal-logline">{{ chapter.logline }}</p>
      <button
        v-if="current"
        class="btn btn-solid chapter-modal-go"
        @click="emit('close')"
      >
        Keep reading <span class="arrow" aria-hidden="true">&rarr;</span>
      </button>
      <button
        v-else
        class="btn btn-solid chapter-modal-go"
        @click="emit('go', chapter.path)"
      >
        Turn to this page <span class="arrow" aria-hidden="true">&rarr;</span>
      </button>
    </div>
  </div>
</template>
