<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { chapters } from '../lib/chapters';
import { manuscriptBound } from '../lib/manuscript';
import ChapterModal from './ChapterModal.vue';

gsap.registerPlugin(Flip);

const emit = defineEmits<{
  (e: 'back-to-cover'): void;
  (e: 'back-to-cover-section', section: 'about' | 'contact'): void;
  (e: 'finale-contact'): void;
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

/** Tabs: a tab to an unread chapter opens the chapter card first;
    heading back to a finished page jumps straight there — the pile
    already says where you're going. */
const modalIndex = ref<number | null>(null);
function onTabClick(i: number) {
  if (i === currentIndex.value) return;
  if (i > currentIndex.value) modalIndex.value = i;
  else goTo(i);
}
function goFromModal(i: number) {
  modalIndex.value = null;
  goTo(i);
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
    <!-- Desk props (candle, pencil) live on a zero-height sticky stage:
         planted on the visible desk while pages scroll, never on the
         page itself or the screen. App provides them. -->
    <div class="desk-stage">
      <slot name="desk-props" />
    </div>

    <!-- Left lane: the read pile, a messy stack. Click to scatter / restack. -->
    <div class="read-pile" aria-label="Finished pages" @click="togglePile">
      <!-- The cover: stamped MANUSCRIPT until bound, then the finished book. -->
      <button
        type="button"
        class="pile-page pile-cover"
        :class="{ 'is-bound': manuscriptBound }"
        :style="pileCardStyle(-1)"
        aria-label="Open finished pages"
        tabindex="-1"
      >
        <span v-if="!manuscriptBound" class="pile-stamp" aria-hidden="true">Manuscript</span>
        <span v-else class="pile-cover-title" aria-hidden="true">Gray<br />Solutions</span>
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
          :class="{ 'is-bound': manuscriptBound }"
          :style="{ '--sc-rot': scatterRot(pile.length) + 'deg', '--sc-delay': (pile.length * 0.7) + 's' }"
          :aria-label="manuscriptBound ? 'Back to the book cover' : 'Back to the manuscript cover'"
          @click="pickCoverFromScatter"
        >
          <span v-if="!manuscriptBound" class="pile-stamp" aria-hidden="true">Manuscript</span>
          <span v-else class="pile-cover-title" aria-hidden="true">Gray<br />Solutions</span>
          <span class="pile-grid-label" aria-hidden="true">{{ manuscriptBound ? 'Book cover' : 'Manuscript cover' }}</span>
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
          @click="onTabClick(i)"
        >
          {{ ch.num }}
        </button>
      </div>

    <!-- Chapter card: tabs to unread chapters preview here first. -->
    <ChapterModal
      v-if="modalIndex !== null"
      :chapter="chapters[modalIndex]"
      :current="modalIndex === currentIndex"
      @close="modalIndex = null"
      @go="goFromModal"
    />
  </div>
</template>
