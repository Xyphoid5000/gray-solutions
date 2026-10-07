<script setup lang="ts">
// Near-full-screen paper sheet with one project's full showcase.
// Same a11y contract as ChapterModal: focus trap, Esc, backdrop close.
import { onMounted, onUnmounted, ref } from 'vue';
import type { Project } from '../lib/projects';
import { useModalA11y } from '../composables/useModalA11y';
import ProjectShowcase from './ProjectShowcase.vue';

defineProps<{ project: Project }>();

const emit = defineEmits<{ close: [] }>();

const dialogEl = ref<HTMLElement | null>(null);
const openRef = ref(true);
useModalA11y(dialogEl, openRef, () => emit('close'));

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

onMounted(() => {
  window.addEventListener('keydown', onKey);
  // The modal is v-if'd, so mounted means open: hold the page behind it.
  document.documentElement.classList.add('gs-no-scroll');
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  document.documentElement.classList.remove('gs-no-scroll');
});
</script>

<template>
  <div class="project-modal-backdrop" @click.self="emit('close')">
    <div
      ref="dialogEl"
      class="project-modal-sheet"
      role="dialog"
      aria-modal="true"
      :aria-label="project.name"
      tabindex="-1"
    >
      <button
        class="project-modal-close"
        @click="emit('close')"
        aria-label="Close project details"
      >
        <span aria-hidden="true">&times;</span>
      </button>
      <ProjectShowcase :project="project" />
    </div>
  </div>
</template>
