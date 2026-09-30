<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { gsap } from 'gsap';

const emit = defineEmits(['done']);

const pagesRef = ref<HTMLElement | null>(null);

onMounted(() => {
  const pages = pagesRef.value;
  if (!pages) {
    emit('done');
    return;
  }
  const vh = window.innerHeight;
  gsap.set(pages.children, { y: -vh * 0.6, opacity: 0, rotation: 0 });

  const tl = gsap.timeline({
    onComplete: () => emit('done'),
  });
  // Pages fall through and off the bottom.
  tl.to(
    pages.children,
    {
      y: vh * 1.2,
      opacity: 1,
      rotation: () => gsap.utils.random(-8, 8),
      duration: 1.8,
      ease: 'power2.in',
      stagger: 0.12,
    },
    0.2,
  );
  tl.to(pages.children, { opacity: 0, duration: 0.4 }, 1.6);
  tl.to({}, { duration: 0.5 });
});
</script>

<template>
  <div class="open-transition" aria-hidden="true">
    <div ref="pagesRef" class="ot-pages">
      <div class="ot-page"><span>Manuscript</span></div>
      <div class="ot-page"></div>
      <div class="ot-page"></div>
      <div class="ot-page"></div>
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
  align-items: center;
  justify-content: center;
  font-family: var(--serif);
  color: #5a4a32;
}
</style>
