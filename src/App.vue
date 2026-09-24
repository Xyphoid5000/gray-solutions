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
import { neighbor, chapters, type ChapterMeta, isChapter } from './router';
import { returnToSection } from './lib/ui';
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
// A chapter picked from the modal. We wait for the modal to fully leave
// before pushing the route, so the page turn never plays underneath it.
let pendingChapterPath: string | null = null;

function selectChapter(ch: ChapterMeta) {
  pendingChapterPath = null; // a fresh pick cancels any pending turn
  modalChapter.value = ch;
}

function goToChapter(path: string) {
  pendingChapterPath = path;
  modalChapter.value = null;
}

function onModalAfterLeave() {
  if (pendingChapterPath && !modalChapter.value) {
    const path = pendingChapterPath;
    pendingChapterPath = null;
    router.push(path);
  }
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
  returnToSection.value = 'contact';
  router.push('/');
}

/**
 * Same cinematic return, but landing on the about-me section instead.
 */
function goToAbout() {
  if (route.path === '/') {
    const about = document.getElementById('about');
    if (about) scrollSlowTo(about);
    return;
  }
  returnToSection.value = 'about';
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

/* ---------- snap cards into full view ---------- */
// When the reader stops scrolling with a card half-cut, settle it
// neatly under the nav — proximity only, never yanks mid-scroll.
let snapTimer: number | null = null;
let snapping = false;
let cardSnapArmed = false;

function armCardSnap() {
  cardSnapArmed = true;
}

function onLenisScroll() {
  if (snapping || !cardSnapArmed) return;
  if (snapTimer) window.clearTimeout(snapTimer);
  snapTimer = window.setTimeout(trySnapCard, 220);
}

function trySnapCard() {
  snapTimer = null;
  if (snapping || !cardSnapArmed || modalChapter.value) return;
  // Only the settled (non-turning) page owns snap candidates.
  const pages = Array.from(
    document.querySelectorAll<HTMLElement>('.book-page'),
  );
  const active =
    pages.find((p) => p.style.position !== 'absolute') ?? pages[0];
  const cards = active
    ? Array.from(active.querySelectorAll<HTMLElement>('.snap-card'))
    : [];
  if (!cards.length) return;
  const vh = window.innerHeight;
  const navH =
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h'),
    ) || 72;
  const targetTop = navH + 14;
  let best: { el: HTMLElement; dy: number } | null = null;
  for (const el of cards) {
    const r = el.getBoundingClientRect();
    if (r.bottom < targetTop || r.top > vh * 0.6) continue;
    const dy = r.top - targetTop;
    if (Math.abs(dy) < 8 || Math.abs(dy) > 160) continue;
    if (!best || Math.abs(dy) < Math.abs(best.dy)) best = { el, dy };
  }
  if (!best) return;
  snapping = true;
  lenis?.scrollTo(best.el, {
    offset: -targetTop,
    duration: 0.7,
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
    onComplete: () => {
      snapping = false;
    },
  });
}

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
  cardSnapArmed = false; // the new page earns its snaps from fresh scrolling
  scrollToTopImmediate();
  if (reducedMotion) {
    gsap.set(page, { opacity: 1 });
    return;
  }
  if (turnDir >= 0) {
    // Turning forward: the next page is already lying beneath,
    // fully inked — the turn reveals it like paper. No fades, no black.
    gsap.set(page, { opacity: 1, zIndex: 1 });
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
  if (reducedMotion || turnDir >= 0) {
    // Forward: the page is already there beneath the turn — nothing to animate.
    gsap.set(page, { clearProps: 'all' });
    done();
    return;
  }
  gsap.to(page, {
    rotationY: 0,
    filter: 'brightness(1)',
    duration: 0.75,
    ease: 'power3.out',
    onComplete: () => {
      gsap.set(page, { clearProps: 'all' });
      done();
    },
  });
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
    // Turning back: the old page holds still, fully inked, beneath the
    // incoming one — it must stay until the swing finishes, so the
    // transition only ends when the new page has landed.
    gsap.set(page, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      zIndex: 1,
    });
    gsap.delayedCall(0.78, done);
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
    // The home page book owns horizontal drags (drag-to-rotate), so
    // there is no swipe page navigation there.
    const path = router.currentRoute.value.path;
    if (path === '/') return;
    // Swipe either way: if there's a page to turn to, turn — if we're
    // at the edge of the book, the swipe closes it and drifts down to
    // the contact form instead.
    if (dx < 0) {
      if (neighbor(path, 1)) nextPage();
      else goToContact();
    } else {
      if (neighbor(path, -1)) prevPage();
      else goToContact();
    }
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
  armCardSnap();
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
  if (path === '/finale' || path === '/') return;
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
  if (!isChapter(route.path)) return; // the about page sits off the book
  if (e.key === 'ArrowRight') nextPage();
  else if (e.key === 'ArrowLeft') prevPage();
}

onMounted(() => {
  if (!reducedMotion) {
    lenis = new Lenis({ duration: 1.25, smoothWheel: true });
    setLenis(lenis);
    lenis.on('scroll', ScrollTrigger.update);
    lenis.on('scroll', onLenisScroll);
    const raf = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
  }

  viewport.value?.addEventListener('touchstart', onTouchStart, { passive: true });
  // Card snap only engages after the reader drives the scroll themselves —
  // never on page load or programmatic jumps.
  viewport.value?.addEventListener('wheel', armCardSnap, { passive: true });
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
  viewport.value?.removeEventListener('wheel', armCardSnap);
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
        <component
          :is="Component"
          :key="route.path"
          class="book-page"
          @about="goToAbout"
          @contact="goToContact"
        />
      </Transition>
    </RouterView>
  </div>
  <PageTurner v-if="isChapter(route.path)" />
  <TabRail
    v-if="isChapter(route.path) && route.path !== '/'"
    @select="selectChapter"
    @contact="goToContact"
  />
  <Transition name="modal" @after-leave="onModalAfterLeave">
    <ChapterModal
      v-if="modalChapter"
      :chapter="modalChapter"
      :current="modalChapter.path === route.path"
      @close="modalChapter = null"
      @go="goToChapter"
    />
  </Transition>
</template>
