<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RouterView, useRouter } from 'vue-router';
import SiteNav from './components/SiteNav.vue';
import PageTurner from './components/PageTurner.vue';
import SwipeHint from './components/SwipeHint.vue';
import CurlHint from './components/CurlHint.vue';
import { navDirection, neighbor } from './router';
import { hasSwiped } from './lib/ui';
import { setLenis, scrollToTopImmediate } from './lib/scroll';

gsap.registerPlugin(ScrollTrigger);

const router = useRouter();
const reducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis: Lenis | null = null;

function nextPage() {
  const n = neighbor(router.currentRoute.value.path, 1);
  if (n) router.push(n.path);
}
function prevPage() {
  const n = neighbor(router.currentRoute.value.path, -1);
  if (n) router.push(n.path);
}

/* ---------- page-turn choreography ---------- */
function beforeEnter(el: Element) {
  const page = el as HTMLElement;
  scrollToTopImmediate();
  if (navDirection.value === 'back') {
    // The previous page waits above, turned away — then swings back.
    gsap.set(page, {
      zIndex: 3,
      transformOrigin: 'left center',
      transformPerspective: 1800,
      rotationY: -180,
      filter: 'brightness(0.55)',
    });
  } else {
    // The next page waits beneath while the current one turns away.
    gsap.set(page, { zIndex: 1, rotationY: 0, filter: 'brightness(1)' });
  }
}

function enter(el: Element, done: () => void) {
  const page = el as HTMLElement;
  if (navDirection.value === 'back') {
    gsap.to(page, {
      rotationY: 0,
      filter: 'brightness(1)',
      duration: 1.05,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.set(page, { clearProps: 'all' });
        done();
      },
    });
  } else {
    gsap.fromTo(
      page,
      { opacity: 0.3 },
      {
        opacity: 1,
        duration: 0.9,
        ease: 'power2.out',
        delay: 0.5,
        onComplete: () => {
          gsap.set(page, { clearProps: 'opacity,zIndex' });
          done();
        },
      },
    );
  }
}

function leave(el: Element, done: () => void) {
  const page = el as HTMLElement;
  gsap.set(page, { position: 'absolute', inset: '0', width: '100%' });
  if (navDirection.value === 'forward') {
    // The classic turn: the page lifts off the spine and swings away.
    gsap.set(page, {
      zIndex: 2,
      transformOrigin: 'left center',
      transformPerspective: 1800,
    });
    gsap.to(page, {
      rotationY: -178,
      filter: 'brightness(0.45)',
      duration: 1.05,
      ease: 'power2.inOut',
      onComplete: done,
    });
  } else {
    // Turning back: the current page sinks and dims beneath the swing.
    gsap.set(page, { zIndex: 2 });
    gsap.to(page, {
      filter: 'brightness(0.6)',
      duration: 1.05,
      ease: 'power2.inOut',
      onComplete: done,
    });
  }
}

function afterEnter() {
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

/* ---------- swipe to turn (mobile magic) ---------- */
const viewport = ref<HTMLElement | null>(null);
let touchX = 0;
let touchY = 0;
let stripEl: HTMLElement | null = null;

function onTouchStart(e: TouchEvent) {
  const t = e.touches[0];
  touchX = t.clientX;
  touchY = t.clientY;
  stripEl = (e.target as HTMLElement).closest?.('.proof-strip') as HTMLElement | null;
}
function onTouchEnd(e: TouchEvent) {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchX;
  const dy = t.clientY - touchY;
  // A deliberate horizontal swipe — never hijack a vertical scroll.
  if (Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (stripEl) {
      // The strip owns swipes it can still scroll through — but at
      // its edge, the gesture belongs to the page turn.
      const max = stripEl.scrollWidth - stripEl.clientWidth;
      const atStart = stripEl.scrollLeft <= 8;
      const atEnd = stripEl.scrollLeft >= max - 8;
      if (dx < 0 && !atEnd) return;
      if (dx > 0 && !atStart) return;
    }
    hasSwiped.value = true;
    if (dx < 0) nextPage();
    else prevPage();
  }
}

function onKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.key === 'ArrowRight') nextPage();
  else if (e.key === 'ArrowLeft') prevPage();
}

onMounted(() => {
  if (!reducedMotion) {
    lenis = new Lenis({ duration: 1.25, smoothWheel: true });
    setLenis(lenis);
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
  }

  viewport.value?.addEventListener('touchstart', onTouchStart, { passive: true });
  viewport.value?.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('keydown', onKey);

  requestAnimationFrame(() => ScrollTrigger.refresh());
  if (document.fonts) {
    document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
  }
});

onUnmounted(() => {
  viewport.value?.removeEventListener('touchstart', onTouchStart);
  viewport.value?.removeEventListener('touchend', onTouchEnd);
  window.removeEventListener('keydown', onKey);
  lenis?.destroy();
  lenis = null;
  setLenis(null);
});
</script>

<template>
  <div class="grain" aria-hidden="true"></div>
  <SiteNav />
  <div ref="viewport" class="book-viewport">
    <RouterView v-slot="{ Component, route }">
      <Transition
        :css="false"
        @before-enter="beforeEnter"
        @enter="enter"
        @leave="leave"
        @after-enter="afterEnter"
      >
        <component :is="Component" :key="route.path" class="book-page" />
      </Transition>
    </RouterView>
  </div>
  <PageTurner />
  <SwipeHint />
  <CurlHint />
</template>
