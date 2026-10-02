<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const emit = defineEmits<{
  close: [];
}>();

const dialogEl = ref<HTMLElement | null>(null);
const okBtn = ref<HTMLButtonElement | null>(null);
const isMobile =
  typeof window !== 'undefined' &&
  window.matchMedia('(max-width: 640px)').matches;

// Dismissable ONLY via the X or OK buttons — no backdrop click, no Escape.
function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !dialogEl.value) return;
  const focusable = Array.from(
    dialogEl.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((n) => !n.hasAttribute('disabled') && n.offsetParent !== null);
  if (focusable.length === 0) {
    e.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  okBtn.value?.focus();
});
onUnmounted(() => window.removeEventListener('keydown', onKeyDown));
</script>

<template>
  <div class="book-intro-backdrop" aria-hidden="false">
    <div
      ref="dialogEl"
      class="book-intro"
      role="dialog"
      aria-modal="true"
      aria-label="How to read the manuscript"
      tabindex="-1"
    >
      <button
        class="book-intro-close"
        @click="emit('close')"
        aria-label="Close"
      >
        <span aria-hidden="true">&times;</span>
      </button>
      <p class="book-intro-kicker">Before you begin</p>
      <h3 class="book-intro-title">How to read</h3>
      <ul class="book-intro-list">
        <li>Click the tabs to jump between chapters.</li>
        <li>Click the pile (top left) to go back to a finished chapter.</li>
        <li v-if="isMobile">Swipe to turn pages.</li>
        <li v-else>Click the page edges or use your arrow keys to turn pages.</li>
      </ul>
      <button
        ref="okBtn"
        class="btn btn-solid book-intro-ok"
        @click="emit('close')"
      >
        OK
      </button>
    </div>
  </div>
</template>
