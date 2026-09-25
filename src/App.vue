<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { RouterView, useRouter, useRoute } from 'vue-router';
import SiteNav from './components/SiteNav.vue';
import PageTurner from './components/PageTurner.vue';
import TabRail from './components/TabRail.vue';
import BindCinematic from './components/BindCinematic.vue';
import ChapterModal from './components/ChapterModal.vue';
import DeskCandle from './components/DeskCandle.vue';
import DeskPencil from './components/DeskPencil.vue';
import LostPage from './components/LostPage.vue';
import { neighbor, chapters, type ChapterMeta, isChapter } from './router';
import { returnToSection } from './lib/ui';
import { setLenis, scrollToTopImmediate, stopScroll, startScroll, scrollSlowTo } from './lib/scroll';

gsap.registerPlugin(ScrollTrigger, Flip);

const router = useRouter();
const route = useRoute();
const bindCinematic = ref<InstanceType<typeof BindCinematic> | null>(null);

/** Flip ID for the current page — matches its pile card when tossed. */
const pageFlipId = computed(() => {
  const i = chapters.findIndex((c) => c.path === route.path);
  return i >= 0 ? `pile-${i}` : undefined;
});

/** The desk props (candle, pencil) only appear when the book is open —
    i.e. on a content chapter, not the cover or about. */
const isChapterRoute = computed(
  () => route.path !== '/' && chapters.some((c) => c.path === route.path),
);

/** Blacklight: the candle is blown out, the lost page surfaces. */
const blacklight = ref(false);
const isDark = () => document.documentElement.dataset.theme === 'dark';
const candleLit = ref(false);

function updateCandle() {
  candleLit.value = isDark() && !blacklight.value;
  document.documentElement.dataset.blacklight = blacklight.value
    ? 'on'
    : 'off';
}

function blowOutCandle() {
  if (!candleLit.value) return;
  blacklight.value = true;
  updateCandle();
}
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
  // From the Finale: bind the manuscript before the contact form.
  if (route.path === '/finale' && bindCinematic.value) {
    bindCinematic.value.start();
    return;
  }
  if (route.path === '/') {
    const form = document.getElementById('contact');
    if (form) scrollSlowTo(form);
    return;
  }
  returnToSection.value = 'contact';
  router.push('/');
}

function onBindDone() {
  // The book is bound — tell the cover, then go to the contact form.
  window.dispatchEvent(new CustomEvent('gs:manuscript-bound'));
  if (route.path === '/') {
    const form = document.getElementById('contact');
    if (form) scrollSlowTo(form);
  } else {
    returnToSection.value = 'contact';
    router.push('/');
  }
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

/* The book: chapter pages sit on a darker desk. */
watch(
  () => route.path,
  (path) => {
    document.body.classList.toggle('has-book', isChapter(path) && path !== '/');
  },
  { immediate: true },
);

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
let fromIdx = -1;
let toIdx = -1;
router.beforeEach((to, from) => {
  const ti = chapters.findIndex((c) => c.path === to.path);
  const fi = chapters.findIndex((c) => c.path === from.path);
  turnDir = ti >= fi ? 1 : -1;
  toIdx = ti;
  fromIdx = fi;
  // Navigating in blacklight: the candle re-lights, the page is lost again.
  if (blacklight.value) {
    blacklight.value = false;
    updateCandle();
  }
  // Manuscript pile: finished pages get tossed left.
  // The cover (index 0) never goes in the pile.
  // (Reduced motion still piles the pages — it just skips the Flip.)
  if (fi >= 0 && ti >= 0) {
    if (ti > fi) {
      for (let i = Math.max(fi, 1); i < ti; i++) addToPile(i);
    } else if (ti < fi) {
      for (let i = Math.max(ti, 1); i < fi; i++) removeFromPile(i);
    }
  }
  // Leaving the chapters entirely — clear the pile.
  if (fi >= 0 && ti < 0) {
    clearPile();
  }
});

/**
 * The read pile: finished manuscript pages, tossed to the left in a
 * slightly messy stack. Each page gets a deterministic toss so it
 * lands the same way every time.
 */
function pileToss(index: number): { rotation: number; x: number; y: number } {
  const h1 = (index * 9301 + 49297) % 233280;
  const h2 = (index * 49297 + 9301) % 233280;
  const r1 = h1 / 233280;
  const r2 = h2 / 233280;
  return {
    rotation: (r1 - 0.5) * 16,
    x: (r2 - 0.5) * 28,
    y: (r1 - 0.5) * 20,
  };
}

/** Chapters currently in the read pile (by index). TabRail hides these. */
const pileIndices = ref<Set<number>>(new Set());

function addToPile(chapterIndex: number) {
  const page = document.querySelector(
    '.book-viewport .book-page',
  ) as HTMLElement | null;
  const pile = document.querySelector('.read-pile');
  if (!page || !pile) return;
  if (pile.querySelector(`[data-pile-index="${chapterIndex}"]`)) return;
  // Grab the tab BEFORE the rail re-renders it away.
  const tab = document.querySelector(
    `.tab-rail .tab[data-tab-ch="${chapterIndex}"]`,
  ) as HTMLElement | null;
  const tabState = tab ? Flip.getState(tab) : null;
  const state = Flip.getState(page);
  const clone = page.cloneNode(true) as HTMLElement;
  clone.setAttribute('data-pile-index', String(chapterIndex));
  // Strip the chapter layout classes — the pile card is its own thing,
  // a plain paper slab. (Keeps body.has-book .chapter rules from
  // overriding the pile's paper background.)
  clone.classList.remove('chapter', 'book-page');
  clone.classList.add('pile-page');
  clone.setAttribute('aria-hidden', 'true');
  const toss = pileToss(chapterIndex);
  pile.appendChild(clone);
  // The tab travels with its page: clone it onto the pile card and Flip it
  // from the rail to the pile, so it never just disappears.
  let tabClone: HTMLElement | null = null;
  if (tab && tabState) {
    tabClone = tab.cloneNode(true) as HTMLElement;
    tabClone.classList.add('pile-tab');
    tabClone.setAttribute('aria-hidden', 'true');
    clone.appendChild(tabClone);
  }
  pileIndices.value.add(chapterIndex);
  // The clone lands in the pile slot; Flip animates it from the page
  // (unless the reader prefers reduced motion — then it just appears).
  gsap.set(clone, {
    rotation: toss.rotation,
    x: toss.x,
    y: toss.y,
  });
  if (!reducedMotion) {
    Flip.from(state, {
      targets: clone,
      duration: 0.85,
      ease: 'power2.inOut',
    });
    if (tabClone && tabState) {
      Flip.from(tabState, {
        targets: tabClone,
        duration: 0.85,
        ease: 'power2.inOut',
      });
    }
  }
}

function removeFromPile(chapterIndex: number) {
  const pile = document.querySelector('.read-pile');
  if (!pile) return;
  const el = pile.querySelector(
    `[data-pile-index="${chapterIndex}"]`,
  ) as HTMLElement | null;
  pileIndices.value.delete(chapterIndex);
  if (el) {
    gsap.to(el, {
      opacity: 0,
      y: -24,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: () => el.remove(),
    });
  }
}

function clearPile() {
  const pile = document.querySelector('.read-pile');
  pileIndices.value.clear();
  if (!pile) return;
  gsap.to(pile.children, {
    opacity: 0,
    duration: 0.3,
    onComplete: () => {
      pile.innerHTML = '';
    },
  });
}

function beforeEnter(el: Element) {
  const page = el as HTMLElement;
  cardSnapArmed = false; // the new page earns its snaps from fresh scrolling
  scrollToTopImmediate();
  if (reducedMotion) {
    gsap.set(page, { opacity: 1 });
    return;
  }
  // Chapter-to-chapter: the new page was underneath all along — it fades
  // in as the old one tosses onto the pile.
  if (fromIdx >= 0 && toIdx >= 0) {
    gsap.set(page, { opacity: 0, y: 18 });
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
  // Chapter-to-chapter: reveal the page from underneath the pile toss.
  if (!reducedMotion && fromIdx >= 0 && toIdx >= 0) {
    gsap.to(page, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out',
      delay: 0.35,
      onComplete: () => {
        gsap.set(page, { clearProps: 'all' });
        done();
      },
    });
    return;
  }
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
  // Chapter-to-chapter: the page already tossed to the pile in beforeEach —
  // the original just bows out.
  if (fromIdx >= 0 && toIdx >= 0) {
    gsap.to(page, {
      opacity: 0,
      duration: 0.3,
      ease: 'power1.in',
      onComplete: done,
    });
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

let themeObs: MutationObserver | null = null;
function onLightsOn() {
  blacklight.value = false;
  updateCandle();
}

onMounted(() => {
  // Candle follows the light switch.
  updateCandle();
  themeObs = new MutationObserver(updateCandle);
  themeObs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  window.addEventListener('gs:lights-on', onLightsOn);

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
  themeObs?.disconnect();
  window.removeEventListener('gs:lights-on', onLightsOn);
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
  <!-- The read pile: finished manuscript pages, tossed left. -->
  <div class="read-pile" aria-hidden="true"></div>
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
          :data-flip-id="pageFlipId"
          @about="goToAbout"
          @contact="goToContact"
        />
      </Transition>
    </RouterView>
  </div>
  <PageTurner v-if="isChapter(route.path)" />
  <TabRail
    v-if="isChapter(route.path) && route.path !== '/'"
    :piled="pileIndices"
    @select="selectChapter"
    @contact="goToContact"
  />
  <BindCinematic ref="bindCinematic" @done="onBindDone" />
  <DeskCandle
    v-if="isChapterRoute"
    :lit="candleLit"
    :blacklight="blacklight"
    @blowOut="blowOutCandle"
  />
  <DeskPencil v-if="isChapterRoute" />
  <LostPage :visible="blacklight" />
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
