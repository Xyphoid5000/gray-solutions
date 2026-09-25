<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick, watch } from 'vue';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { chapters } from '../lib/chapters';

gsap.registerPlugin(Flip);

const emit = defineEmits<{
  (e: 'back-to-cover'): void;
  (e: 'back-to-cover-section', section: 'about' | 'contact'): void;
  (e: 'finale-contact'): void;
  (e: 'exit-down'): void;
}>();

/** The Finale binds the manuscript before the contact form. */
function onChapterContact(i: number) {
  if (i === chapters.length - 1) emit('finale-contact');
  else emit('back-to-cover-section', 'contact');
}

const currentIndex = ref(0);
/** Indices of chapters sitting in the left pile, in order. */
const pile = ref<number[]>([]);

const isFinale = computed(() => currentIndex.value === chapters.length - 1);
/** Nudge the pencil somewhere slightly different on each chapter, like
    someone set it down without thinking. */
const pencilVars = computed<Record<string, string>>(() => {
  const spots = [
    { x: 0, y: 0, r: 0 },
    { x: -22, y: 30, r: -9 },
    { x: 14, y: -24, r: 7 },
    { x: -12, y: 18, r: -6 },
    { x: 16, y: -10, r: 5 },
  ];
  const s = spots[currentIndex.value] ?? spots[0];
  return {
    '--pencil-dx': `${s.x}px`,
    '--pencil-dy': `${s.y}px`,
    '--pencil-rot': `${s.r}deg`,
  };
});

const pileSet = computed(() => new Set(pile.value));

function pageEl(i: number): HTMLElement | null {
  return document.querySelector(`.manuscript-desk [data-page-index="${i}"] .page-paper`);
}

function pileCardEl(i: number): HTMLElement | null {
  return document.querySelector(`.read-pile [data-pile-index="${i}"]`);
}

async function goTo(target: number) {
  if (target === currentIndex.value) return;
  pileOpen.value = false;
  target = Math.max(0, Math.min(chapters.length - 1, target));

  if (target > currentIndex.value) {
    // Forward: pages from current to target-1 get tossed to the pile.
    for (let i = currentIndex.value; i < target; i++) {
      await tossToPile(i);
    }
  } else {
    // Back: pages from target to current-1 come back from the pile.
    for (let i = currentIndex.value - 1; i >= target; i--) {
      await bringBack(i);
    }
  }
  currentIndex.value = target;
  // Let the new top page settle, then scroll it into view.
  await nextTick();
  document.querySelector('.manuscript-desk')?.scrollIntoView({ behavior: 'smooth' });
}

async function tossToPile(i: number): Promise<void> {
  const paper = pageEl(i);
  const state = paper ? Flip.getState(paper) : null;
  pile.value.push(i);
  await nextTick();
  const card = pileCardEl(i);
  if (state && card && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await Flip.from(state, {
      targets: card,
      duration: 0.7,
      ease: 'power2.inOut',
    }).then();
  }
}

async function bringBack(i: number): Promise<void> {
  const card = pileCardEl(i);
  const state = card ? Flip.getState(card) : null;
  pile.value = pile.value.filter((x) => x !== i);
  await nextTick();
  const paper = pageEl(i);
  if (state && paper && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await Flip.from(state, {
      targets: paper,
      duration: 0.7,
      ease: 'power2.inOut',
    }).then();
  }
}

/** Deterministic toss so each page lands the same way. */
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

function next() {
  goTo(currentIndex.value + 1);
}
function prev() {
  goTo(currentIndex.value - 1);
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') prev();
}

/** Direct navigation — tabs and scattered pages go straight there. */

/** The pile is a messy stack. Clicking it scatters its pages over the open page. */
const pileOpen = ref(false);
const SCATTER_ROTS = [-9, 7, -5, 8, -7, 5, -6, 9];
function scatterRot(pos: number): number {
  return SCATTER_ROTS[pos % SCATTER_ROTS.length];
}
function pileCenter(): { x: number; y: number } | null {
  const el = document.querySelector('.read-pile');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
function scatterCards(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.pile-scatter-card'));
}
const reduceMotion = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Pages fly out of the pile and land scattered over the open page. */
function scatterOut() {
  if (reduceMotion()) return;
  const c = pileCenter();
  scatterCards().forEach((card, idx) => {
    const r = card.getBoundingClientRect();
    const dx = c ? c.x - (r.left + r.width / 2) : 0;
    const dy = c ? c.y - (r.top + r.height / 2) : 0;
    const rot = SCATTER_ROTS[idx % SCATTER_ROTS.length];
    card.classList.add('flying');
    gsap.fromTo(
      card,
      { x: dx, y: dy, scale: 0.4, rotation: 0 },
      {
        x: 0,
        y: 0,
        scale: 1,
        rotation: rot,
        duration: 0.6,
        delay: idx * 0.08,
        ease: 'back.out(1.4)',
        onComplete: () => {
          card.classList.remove('flying');
          gsap.set(card, { clearProps: 'transform' });
        },
      }
    );
  });
}
/** Pages fly back into the pile. */
function scatterBack(): Promise<void> {
  const cards = scatterCards();
  const c = pileCenter();
  if (!cards.length || reduceMotion() || !c) {
    pileOpen.value = false;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let done = 0;
    cards.forEach((card, idx) => {
      const r = card.getBoundingClientRect();
      card.classList.add('flying');
      gsap.to(card, {
        x: c.x - (r.left + r.width / 2),
        y: c.y - (r.top + r.height / 2),
        scale: 0.4,
        rotation: 0,
        duration: 0.35,
        delay: idx * 0.05,
        ease: 'power2.in',
        onComplete: () => {
          if (++done === cards.length) {
            pileOpen.value = false;
            resolve();
          }
        },
      });
    });
  });
}
async function togglePile() {
  if (pileOpen.value) {
    await scatterBack();
  } else {
    pileOpen.value = true;
    await nextTick();
    scatterOut();
  }
}
function pickFromScatter(i: number) {
  pileOpen.value = false;
  goTo(i);
}
function pickCoverFromScatter() {
  pileOpen.value = false;
  emit('back-to-cover');
}

function pileCardStyle(i: number): Record<string, string> {
  const toss = pileToss(i);
  return {
    '--pile-rot': `${toss.rotation}deg`,
    '--pile-x': `${toss.x}px`,
    '--pile-y': `${toss.y}px`,
  };
}

/** Swipe to turn pages — but never hijack the proof strip's own scrolling. */
let touchX: number | null = null;
let touchOnStrip = false;
function onTouchStart(e: TouchEvent) {
  const t = e.target as HTMLElement | null;
  touchOnStrip = !!t?.closest('.proof-strip');
  touchX = e.touches[0].clientX;
}
function onTouchEnd(e: TouchEvent) {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  const onStrip = touchOnStrip;
  touchX = null;
  touchOnStrip = false;
  // A scroll-off-the-bottom exit already fired during this touch — don't
  // also turn a page from the release drift.
  if (downExited) {
    downExited = false;
    return;
  }
  if (onStrip) return;
  if (Math.abs(dx) < 48) return;
  // Last page: swipe left (toward the next page) to bind the book.
  if (dx < 0 && currentIndex.value === chapters.length - 1) {
    onChapterContact(currentIndex.value);
    return;
  }
  if (dx < 0) next();
  else prev();
}

/** Scrolling down past the bottom edge exits the book: any chapter
    closes back to the main page, the finale runs the binding instead.
    Only fires on a deliberate push after the page stops moving — normal
    reading scrolls never trigger it, and the proof strip is exempt. */
let exitArmed = true;
let downExited = false;
let wheelAccum = 0;
let lastScrollY = 0;
let downAnchorY: number | null = null;

function atBottomEdge(): boolean {
  return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 12;
}

function fireExitDown() {
  if (!exitArmed || pileOpen.value) return;
  exitArmed = false;
  downExited = true;
  if (currentIndex.value === chapters.length - 1) {
    onChapterContact(currentIndex.value);
  } else {
    emit('exit-down');
  }
}

function onWheelDown(e: WheelEvent) {
  const el = e.target as HTMLElement | null;
  const atBottom = atBottomEdge();
  const moved = window.scrollY !== lastScrollY;
  lastScrollY = window.scrollY;
  if (!exitArmed || pileOpen.value || el?.closest?.('.proof-strip')) {
    wheelAccum = 0;
    return;
  }
  if (!atBottom || e.deltaY <= 0 || moved) {
    wheelAccum = 0;
    return;
  }
  wheelAccum += e.deltaY;
  if (wheelAccum > 140) {
    wheelAccum = 0;
    fireExitDown();
  }
}

function onTouchMoveDown(e: TouchEvent) {
  const el = e.target as HTMLElement | null;
  if (!exitArmed || pileOpen.value || el?.closest?.('.proof-strip')) {
    downAnchorY = null;
    return;
  }
  if (!atBottomEdge()) {
    downAnchorY = null;
    return;
  }
  const y = e.touches[0].clientY;
  if (downAnchorY === null) {
    downAnchorY = y;
    return;
  }
  if (downAnchorY - y > 70) {
    downAnchorY = null;
    fireExitDown();
  }
}

watch(currentIndex, () => {
  exitArmed = true;
});

onMounted(() => {
  lastScrollY = window.scrollY;
  window.addEventListener('wheel', onWheelDown, { passive: true });
  window.addEventListener('touchmove', onTouchMoveDown, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('wheel', onWheelDown);
  window.removeEventListener('touchmove', onTouchMoveDown);
});
</script>

<template>
  <div
    class="manuscript-desk"
    :class="{ 'is-finale': isFinale }"
    :style="pencilVars"
    @keydown="onKey"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
    tabindex="0"
  >
    <!-- Desk props: candle, pencil, pull-cord live here (App provides them). -->
    <slot name="desk-props" />

    <!-- Left lane: the read pile, a messy stack. Click to scatter / restack. -->
    <div class="read-pile" aria-label="Finished pages" @click="togglePile">
      <!-- The manuscript cover: finished the moment the book opens. -->
      <button
        type="button"
        class="pile-page pile-cover"
        :style="pileCardStyle(-1)"
        aria-label="Open finished pages"
        tabindex="-1"
      >
        <span class="pile-stamp" aria-hidden="true">Manuscript</span>
      </button>
      <button
        v-for="i in pile"
        :key="i"
        type="button"
        class="pile-page"
        :data-pile-index="i"
        :style="pileCardStyle(i)"
        :aria-label="`Open finished pages`"
        tabindex="-1"
      >
        <span class="pile-num" aria-hidden="true">{{ chapters[i].num }}</span>
        <span class="pile-tab-mark" aria-hidden="true">{{ chapters[i].num }}</span>
      </button>
    </div>

    <!-- Pile scatter: finished pages float over the open page. -->
    <div v-if="pileOpen" class="pile-scatter" aria-label="Finished pages">
      <div class="pile-scatter-grid">
        <button
          type="button"
          class="pile-scatter-card"
          :style="{ '--sc-rot': scatterRot(pile.length) + 'deg', '--sc-delay': (pile.length * 0.7) + 's' }"
          aria-label="Back to the manuscript cover"
          @click="pickCoverFromScatter"
        >
          <span class="pile-stamp" aria-hidden="true">Manuscript</span>
          <span class="pile-grid-label" aria-hidden="true">Manuscript cover</span>
        </button>
        <button
          v-for="(i, pos) in pile"
          :key="i"
          type="button"
          class="pile-scatter-card"
          :style="{ '--sc-rot': scatterRot(pos) + 'deg', '--sc-delay': (pos * 0.7) + 's' }"
          :aria-label="`Preview ${chapters[i].label}`"
          @click="pickFromScatter(i)"
        >
          <span class="pile-num" aria-hidden="true">{{ chapters[i].num }}</span>
          <span class="pile-grid-label" aria-hidden="true">{{ chapters[i].label }}</span>
          <span class="pile-tab-mark" aria-hidden="true">{{ chapters[i].num }}</span>
        </button>
      </div>
    </div>

    <!-- The stack: each page is a transparent wrap, paper inside with a
         right margin, tab attached in that margin. -->
    <div
      v-for="(ch, i) in chapters"
      :key="ch.num"
      class="page-wrap"
        :data-page-index="i"
        :class="{
          'is-current': i === currentIndex,
          'is-piled': pileSet.has(i),
          'is-buried': i > currentIndex,
        }"
      >
        <div class="page-paper" :inert="i !== currentIndex">
          <component
            :is="ch.component"
            :active="i === currentIndex"
            @go="goTo"
            @about="emit('back-to-cover-section', 'about')"
            @contact="onChapterContact(i)"
          />
        </div>
        <button
          type="button"
          class="page-tab"
          :class="{ active: i === currentIndex, 'is-piled': pileSet.has(i) }"
          :style="{ '--tab-row': i }"
          :aria-label="`Go to ${ch.label}`"
          :aria-current="i === currentIndex ? 'page' : undefined"
          @click="goTo(i)"
        >
          {{ ch.num }}
        </button>
      </div>
  </div>
</template>
