<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { gsap } from 'gsap';
import Bookshelf from './Bookshelf.vue';

const emit = defineEmits(['done']);

withDefaults(
  defineProps<{
    bonusContent?: boolean;
  }>(),
  { bonusContent: false },
);

const roomRef = ref<HTMLElement | null>(null);
const pagesRef = ref<HTMLElement | null>(null);

onMounted(() => {
  const room = roomRef.value;
  const pages = pagesRef.value;
  if (!room || !pages) {
    emit('done');
    return;
  }
  const vh = window.innerHeight;
  // Start on the shelf (the home page is the bookshelf).
  gsap.set(room, { y: 0 });
  gsap.set(pages.children, { y: -vh * 0.5, opacity: 0, rotation: 0 });

  const tl = gsap.timeline({
    onComplete: () => emit('done'),
  });
  // The room slides up: shelf exits top, desk rises into view.
  // Slow, so the seam is visible crossing the frame.
  tl.to(room, { y: -vh, duration: 2.2, ease: 'power2.inOut' }, 0);
  // Pages float down onto the desk as the camera settles.
  tl.to(
    pages.children,
    {
      y: 0,
      opacity: 1,
      rotation: () => gsap.utils.random(-8, 8),
      duration: 1.4,
      ease: 'power2.out',
      stagger: 0.18,
    },
    1.4,
  );
  // Hold on the desk, then hand off.
  tl.to({}, { duration: 0.6 });
  tl.to(room.parentElement!, { opacity: 0, duration: 0.5, ease: 'power1.inOut' });
});
</script>

<template>
  <div class="open-transition" aria-hidden="true">
    <div ref="roomRef" class="ot-room">
      <div class="ot-shelf">
        <Bookshelf backdrop />
      </div>
      <div class="ot-desk">
        <div class="ot-desk-surface"></div>
        <div ref="pagesRef" class="ot-pages">
          <div class="ot-page"></div>
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
}
.ot-page {
  position: absolute;
  width: min(280px, 70vw);
  aspect-ratio: 8.5 / 11;
  background: var(--page, #f2ecdf);
  border: 1px solid rgba(120, 90, 60, 0.35);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
}
.ot-page:nth-child(1) { transform: rotate(-4deg); }
.ot-page:nth-child(2) { transform: rotate(3deg); }
.ot-page:nth-child(3) { transform: rotate(-2deg); }
.ot-page:nth-child(4) { transform: rotate(5deg); }
</style>
