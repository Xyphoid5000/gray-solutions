<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RouterView, useRouter, useRoute } from 'vue-router';
import SiteNav from './components/SiteNav.vue';
import PageTurner from './components/PageTurner.vue';
import TabRail from './components/TabRail.vue';
import ChapterModal from './components/ChapterModal.vue';
import { neighbor, chapters, type ChapterMeta } from './router';
import { returnToContact } from './lib/ui';
import { setLenis, scrollToTopImmediate, stopScroll, startScroll, scrollSlowTo } from './lib/scroll';

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
  // Let the modal close before the page turns.
  setTimeout(() => router.push(path), 320);
}

/**
 * The reader asked for the contact form: the book closes, we zoom
 * back out to the cover, then drift slowly down to the form.
 */
function goToContact() {
  if (route.path === '/') {
    const form = document.getElementById('contact');
    if (form) scrollSlowTo(form);
    return;
  }
  returnToContact.value = true;
  router.push('/');
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

/* ---------- page turns (a real book, not a slideshow) ---------- */
// Which way the reader is moving through the book: +1 forward, -1 back.
let turnDir = 1;
router.beforeEach((to, from) => {
  const ti = chapters.findIndex((c) => c.path === to.path);
  const fi = chapters.findIndex((c) => c.path === from.path);
  turnDir = ti >= fi ? 1 : -1;
});

function beforeEnter(el: Element) {
  const page = el as HTMLElement;
  scrollToTopImmediate();
  if (reducedMotion) {
    gsap.set(page, { opacity: 1 });
    return;
  }
  if (turnDir >= 0) {
    // Turning forward: the new page waits beneath the turning page.
    gsap.set(page, { opacity: 0, zIndex: 1 });
  } else {
    // Turning back: the new page swings in from the spine,
    // edge-on and dimmed like paper catching the light.
    gsap.set(page, {
      opacity: 1,
      zIndex: 2,
      transformOrigin: 'left center',
      backfaceVisibility: 'hidden',
      rotationY: -105,
      filter: 'brightness(0.35)',
    });
  }
}

function enter(el: Element, done: () => void) {
  const page = el as HTMLElement;
  if (reducedMotion) {
    gsap.set(page, { clearProps: 'all' });
    done();
    return;
  }
  const finish = () => {
    gsap.set(page, { clearProps: 'all' });
    done();
  };
  if (turnDir >= 0) {
    gsap.to(page, {
      opacity: 1,
      duration: 0.7,
      ease: 'power1.out',
      delay: 0.1,
      onComplete: finish,
    });
  } else {
    gsap.to(page, {
      rotationY: 0,
      filter: 'brightness(1)',
      duration: 0.75,
      ease: 'power3.out',
      onComplete: finish,
    });
  }
}

function leave(el: Element, done: () => void) {
  const page = el as HTMLElement;
  if (reducedMotion) {
    done();
    return;
  }
  if (turnDir >= 0) {
    // Turning forward: the page lifts off the spine and swings left,
    // darkening as it turns away from the light.
    gsap.set(page, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      zIndex: 2,
      transformOrigin: 'left center',
      backfaceVisibility: 'hidden',
    });
    gsap.to(page, {
      rotationY: -105,
      filter: 'brightness(0.35)',
      duration: 0.65,
      ease: 'power2.in',
      onComplete: done,
    });
  } else {
    // Turning back: the old page simply yields beneath the incoming one.
    gsap.set(page, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      zIndex: 1,
    });
    gsap.to(page, {
      opacity: 0,
      duration: 0.5,
      ease: 'power2.in',
      onComplete: done,
    });
  }
}

function cancelTurn(el: Element) {
  gsap.killTweensOf(el);
  gsap.set(el as HTMLElement, { clearProps: 'all' });
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
  // The last page has nowhere to turn — and the cover is a
  // scrollable page now (the form lives under the book), so pushing
  // at its bottom must never whisk the reader away mid-form.
  const path = router.currentRoute.value.path;
  if (path === '/about' || path === '/') return;
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
  <SiteNav @contact="goToContact" />
  <div ref="viewport" class="book-viewport">
    <RouterView v-slot="{ Component, route }">
      <Transition
        :css="false"
        @before-enter="beforeEnter"
        @enter="enter"
        @leave="leave"
        @enter-cancelled="cancelTurn"
        @leave-cancelled="cancelTurn"
        @after-enter="afterEnter"
      >
        <component :is="Component" :key="route.path" class="book-page" />
      </Transition>
    </RouterView>
  </div>
  <PageTurner />
  <TabRail
    v-if="route.path !== '/'"
    @select="modalChapter = $event"
    @contact="goToContact"
  />
  <Transition name="modal">
    <ChapterModal
      v-if="modalChapter"
      :chapter="modalChapter"
      :current="modalChapter.path === route.path"
      @close="modalChapter = null"
      @go="goToChapter"
    />
  </Transition>
</template>
