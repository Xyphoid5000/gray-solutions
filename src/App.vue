<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RouterView, useRouter, useRoute } from 'vue-router';
import SiteNav from './components/SiteNav.vue';
import PageTurner from './components/PageTurner.vue';
import SwipeHint from './components/SwipeHint.vue';
import CurlHint from './components/CurlHint.vue';
import TabRail from './components/TabRail.vue';
import ChapterModal from './components/ChapterModal.vue';
import { neighbor, type ChapterMeta } from './router';
import { hasSwiped } from './lib/ui';
import { setLenis, scrollToTopImmediate, stopScroll, startScroll } from './lib/scroll';

gsap.registerPlugin(ScrollTrigger);

const router = useRouter();
const route = useRoute();
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

/* ---------- chapter modal (opened from the side tabs) ---------- */
const modalChapter = ref<ChapterMeta | null>(null);

function goToChapter(path: string) {
  modalChapter.value = null;
  // Let the modal close before the page dissolves in.
  setTimeout(() => router.push(path), 320);
}

watch(modalChapter, (ch) => {
  if (ch) {
    stopScroll();
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
    startScroll();
  }
});

/* ---------- chapter dissolve (no flips, just ink) ---------- */
function beforeEnter(el: Element) {
  const page = el as HTMLElement;
  scrollToTopImmediate();
  gsap.set(page, { opacity: 0, y: 26 });
}

function enter(el: Element, done: () => void) {
  const page = el as HTMLElement;
  if (reducedMotion) {
    gsap.set(page, { opacity: 1, y: 0, clearProps: 'all' });
    done();
    return;
  }
  gsap.to(page, {
    opacity: 1,
    y: 0,
    duration: 0.75,
    ease: 'power3.out',
    delay: 0.12,
    onComplete: () => {
      gsap.set(page, { clearProps: 'opacity,transform' });
      done();
    },
  });
}

function leave(el: Element, done: () => void) {
  const page = el as HTMLElement;
  gsap.set(page, { position: 'absolute', inset: '0', width: '100%' });
  if (reducedMotion) {
    done();
    return;
  }
  gsap.to(page, {
    opacity: 0,
    duration: 0.4,
    ease: 'power2.in',
    onComplete: done,
  });
}

function afterEnter() {
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

/* ---------- swipe to turn (mobile magic) ---------- */
const viewport = ref<HTMLElement | null>(null);
let touchX = 0;
let touchY = 0;
let stripEl: HTMLElement | null = null;
let startedAtBottom = false;

function atBottom(): boolean {
  const doc = document.documentElement;
  return window.scrollY + window.innerHeight >= doc.scrollHeight - 6;
}

function onTouchStart(e: TouchEvent) {
  const t = e.touches[0];
  touchX = t.clientX;
  touchY = t.clientY;
  lastMoveY = t.clientY;
  pushAccum = 0;
  startedAtBottom = atBottom();
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

/* ---------- scroll-to-turn (mobile): a deliberate push past the bottom ---------- */
const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
let lastMoveY = 0;
let pushAccum = 0;
let turnCooldownUntil = 0;
let suppressTouchUntil = 0;

function onTouchMove(e: TouchEvent) {
  if (!coarsePointer) return;
  const now = Date.now();
  const y = e.touches[0].clientY;
  const dy = y - lastMoveY; // negative = finger pushing up = scrolling down
  lastMoveY = y;
  // Right after a scroll-turn, swallow the finger's leftover momentum
  // so it doesn't drag the new page down with it.
  if (now < suppressTouchUntil) {
    e.preventDefault();
    return;
  }
  // Only a push that *starts* at the bottom counts — arriving there
  // mid-scroll with momentum must never turn the page by accident.
  if (now < turnCooldownUntil || !startedAtBottom) {
    pushAccum = 0;
    return;
  }
  // The last page has nowhere to turn.
  if (router.currentRoute.value.path === '/epilogue') return;
  if (atBottom() && dy < -4) {
    pushAccum += -dy;
    if (pushAccum > 120) {
      pushAccum = 0;
      turnCooldownUntil = now + 1600;
      suppressTouchUntil = now + 900;
      nextPage();
    }
  } else if (dy > 4) {
    pushAccum = 0;
  }
}

function onKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.key === 'Escape') {
    modalChapter.value = null;
    return;
  }
  if (modalChapter.value) return; // arrows shouldn't turn pages under the modal
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
  // touchmove is non-passive: right after a scroll-turn we swallow the
  // finger's leftover momentum so it can't drag the new page down.
  viewport.value?.addEventListener('touchmove', onTouchMove, { passive: false });
  viewport.value?.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('keydown', onKey);

  requestAnimationFrame(() => ScrollTrigger.refresh());
  if (document.fonts) {
    document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
  }
});

onUnmounted(() => {
  viewport.value?.removeEventListener('touchstart', onTouchStart);
  viewport.value?.removeEventListener('touchmove', onTouchMove);
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
  <TabRail @select="modalChapter = $event" />
  <Transition name="modal">
    <ChapterModal
      v-if="modalChapter"
      :chapter="modalChapter"
      :current="modalChapter.path === route.path"
      @close="modalChapter = null"
      @go="goToChapter"
    />
  </Transition>
  <SwipeHint />
  <CurlHint />
</template>
