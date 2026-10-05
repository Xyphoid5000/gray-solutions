<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { gsap } from 'gsap';
import { chapters } from '../lib/chapters';

const props = defineProps<{
  /** Y (px) where the manuscript is floating — the drop starts here. */
  startY?: number;
}>();

const emit = defineEmits(['done']);

const pagesRef = ref<HTMLElement | null>(null);

/** The six manuscript pages: five chapters + the stamped cover. */
const pages = [
  ...chapters.slice(0, 5).map((ch) => ({ num: String(ch.num), label: ch.label })),
  { num: '', label: 'Manuscript' },
];

onMounted(() => {
  const pagesEl = pagesRef.value;
  if (!pagesEl) {
    emit('done');
    return;
  }
  const vh = window.innerHeight;
  // Start where the manuscript is floating (or above the screen as fallback).
  const startY = props.startY ?? -vh * 0.6;
  gsap.set(pagesEl.children, { y: startY, opacity: 1, rotation: 0 });

  const tl = gsap.timeline({
    onComplete: () => emit('done'),
  });
  // Pages fall through and off the bottom, fully opaque.
  tl.to(
    pagesEl.children,
    {
      y: vh * 1.2,
      rotation: () => gsap.utils.random(-8, 8),
      duration: 1.8,
      ease: 'power2.in',
      stagger: 0.12,
    },
    0.2,
  );
  tl.to(pagesEl.children, { opacity: 0, duration: 0.4 }, 1.6);
  tl.to({}, { duration: 0.5 });
});
</script>

<template>
  <div class="open-transition" aria-hidden="true">
    <div ref="pagesRef" class="ot-pages">
      <div v-for="(p, i) in pages" :key="i" class="ot-page">
        <span v-if="p.num" class="ot-num">{{ p.num }}</span>
        <span class="ot-label">{{ p.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.open-transition {
  position: fixed;
  inset: 0;
  z-index: 2000;
  pointer-events: none;
  overflow: hidden;
}
.ot-pages {
  position: absolute;
  inset: 0;
}
.ot-page {
  position: absolute;
  left: 50%;
  top: 0;
  width: 280px;
  height: 380px;
  margin-left: -140px;
  background: #f5efe0;
  border: 1px solid #d8c9a8;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: var(--serif);
  color: #5a4a32;
}
.ot-num {
  font-size: 2rem;
  font-weight: 600;
}
.ot-label {
  font-size: 0.9rem;
  font-style: italic;
}
</style>
