<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { gsap } from 'gsap';
import Bookshelf from './Bookshelf.vue';
import DeskClutter from './DeskClutter.vue';
import DeskPencil from './DeskPencil.vue';

const emit = defineEmits(['done']);

withDefaults(
  defineProps<{
    bonusContent?: boolean;
  }>(),
  { bonusContent: false },
);

const roomRef = ref<HTMLElement | null>(null);
const pagesRef = ref<HTMLElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);

onMounted(() => {
  const room = roomRef.value;
  const pages = pagesRef.value;
  const overlay = overlayRef.value;
  if (!room || !pages || !overlay) {
    emit('done');
    return;
  }
  const vh = window.innerHeight;
  // Start on the shelf. Pages begin above the frame.
  gsap.set(room, { y: 0 });
  gsap.set(pages.children, { y: -vh * 0.6, opacity: 0, rotation: 0 });

  const tl = gsap.timeline({
    onComplete: () => emit('done'),
  });
  // First: the pages float down (the manuscript coming to life).
  tl.to(
    pages.children,
    {
      y: 0,
      opacity: 1,
      rotation: () => gsap.utils.random(-6, 6),
      duration: 1.6,
      ease: 'power2.out',
      stagger: 0.15,
    },
    0.2,
  );
  // Then: the room shifts — shelf exits top, desk rises. Slow, seam visible.
  // The pages ride the room down and land on the desk.
  tl.to(room, { y: -vh, duration: 2.4, ease: 'power2.inOut' }, 1.6);
  // Hold on the desk with the manuscript open, then hand off.
  tl.to({}, { duration: 0.7 });
  // Fade the overlay; the BookView (manuscript desk) is already mounted
  // behind, so this is a seamless crossfade, not a cut.
  tl.to(overlay, { opacity: 0, duration: 0.9, ease: 'power1.inOut' });
});
</script>

<template>
  <div ref="overlayRef" class="open-transition" aria-hidden="true">
    <div ref="roomRef" class="ot-room">
      <div class="ot-shelf">
        <Bookshelf backdrop />
      </div>
      <div class="ot-desk">
        <div class="ot-desk-surface"></div>
        <!-- The literal desk props. -->
        <DeskClutter />
        <DeskPencil />
        <div ref="pagesRef" class="ot-pages">
          <div class="ot-page"><span>Manuscript</span></div>
          <div class="ot-page"></div>
          <div class="ot-page"></div>
          <div class="ot-page"></div>
        </div>
      </div>
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
}
.ot-room {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 200vh;
  will-change: transform;
}
.ot-shelf,
.ot-desk {
  height: 100vh;
  position: relative;
  overflow: hidden;
}
.ot-shelf {
  display: flex;
  align-items: center;
  justify-content: center;
}
/* The seam between shelf and desk. */
.ot-shelf::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.6);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.5);
}
.ot-desk {
  background: #0d0a06;
}
.ot-desk-surface {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 50% 20%, rgba(120, 70, 35, 0.35) 0%, transparent 60%),
    linear-gradient(180deg, #3a2412 0%, #2a1a0d 40%, #1d1208 100%);
}
.ot-desk-surface::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(
      93deg,
      rgba(0, 0, 0, 0.14) 0 2px,
      transparent 2px 140px
    );
  opacity: 0.5;
}
.ot-pages {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
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
.ot-page span {
  font-family: var(--serif);
  font-size: 1.1rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(120, 70, 40, 0.85);
  border: 3px double rgba(120, 70, 40, 0.6);
  padding: 0.35em 0.5em;
  transform: rotate(-4deg);
}
</style>
