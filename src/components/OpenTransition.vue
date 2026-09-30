<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { gsap } from 'gsap';
import Room from './Room.vue';

const emit = defineEmits(['done']);

withDefaults(
  defineProps<{
    bonusContent?: boolean;
  }>(),
  { bonusContent: false },
);

const roomRef = ref<InstanceType<typeof Room> | null>(null);
const pagesRef = ref<HTMLElement | null>(null);
const showBook = ref(false);

onMounted(() => {
  const roomEl = roomRef.value?.$el as HTMLElement | undefined;
  const pages = pagesRef.value;
  if (!roomEl || !pages) {
    emit('done');
    return;
  }
  const vh = window.innerHeight;
  gsap.set(roomEl, { y: 0 });
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
  // BookView appears on the desk BEFORE the shift.
  tl.call(() => { showBook.value = true; }, [], 1.8);
  // The whole room shifts up: shelf exits top, desk (with BookView
  // already on it) rises into view.
  tl.to(roomEl, { y: -vh, duration: 2.4, ease: 'power2.inOut' }, 2.0);
  tl.to({}, { duration: 0.5 });
});
</script>

<template>
  <div class="open-transition" aria-hidden="true">
    <Room
      ref="roomRef"
      shelf-backdrop
      :show-book="showBook"
      :bonus-content="bonusContent"
    >
      <template #desk-props>
        <slot name="desk-props" />
      </template>
    </Room>
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
  z-index: 60;
  overflow: hidden;
  background: #0d0a06;
  pointer-events: none;
}
.ot-pages {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 5;
}
.ot-page {
  position: absolute;
  width: min(280px, 70vw);
  aspect-ratio: 8.5 / 11;
  background: var(--page, #f2ecdf);
  border: 1px solid rgba(120, 90, 60, 0.35);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
