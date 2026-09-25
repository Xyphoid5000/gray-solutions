<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { chapters } from '../lib/chapters';
import ChapterModal from './ChapterModal.vue';

gsap.registerPlugin(Flip);

const emit = defineEmits<{
  (e: 'back-to-cover'): void;
  (e: 'back-to-cover-section', section: 'about' | 'contact'): void;
}>();

const currentIndex = ref(0);
/** Indices of chapters sitting in the left pile, in order. */
const pile = ref<number[]>([]);

const pileSet = computed(() => new Set(pile.value));

function pageEl(i: number): HTMLElement | null {
  return document.querySelector(`.page-stack [data-page-index="${i}"] .page-paper`);
}

function pileCardEl(i: number): HTMLElement | null {
  return document.querySelector(`.read-pile [data-pile-index="${i}"]`);
}

async function goTo(target: number) {
  if (target === currentIndex.value) return;
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
    const toss = pileToss(i);
    gsap.set(card, { rotation: toss.rotation, x: toss.x, y: toss.y });
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

/** The chapter modal: tabs open a preview, "Turn to this page" goes. */
const modalIndex = ref<number | null>(null);
function openModal(i: number) {
  modalIndex.value = i;
}
function closeModal() {
  modalIndex.value = null;
}
function goFromModal(i: number) {
  modalIndex.value = null;
  goTo(i);
}

/** The pile spreads when tapped, so a specific page can be picked. */
const pileSpread = ref(false);
function togglePileSpread() {
  pileSpread.value = !pileSpread.value;
}
function pickFromPile(i: number) {
  pileSpread.value = false;
  goTo(i);
}

/** Swipe to turn pages. */
let touchX: number | null = null;
function onTouchStart(e: TouchEvent) {
  touchX = e.touches[0].clientX;
}
function onTouchEnd(e: TouchEvent) {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) < 48) return;
  if (dx < 0) next();
  else prev();
}
</script>

<template>
  <div
    class="manuscript-desk"
    @keydown="onKey"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
    tabindex="0"
  >
    <!-- Desk props: candle, pencil, pull-cord live here (App provides them). -->
    <slot name="desk-props" />

    <!-- Bottom left: the read pile. Tap to spread, tap a card to go back. -->
    <div
      class="read-pile"
      :class="{ 'is-spread': pileSpread }"
      aria-label="Finished pages"
    >
      <button
        v-for="(i, pos) in pile"
        :key="i"
        type="button"
        class="pile-page"
        :data-pile-index="i"
        :style="pileSpread ? { '--spread-pos': pos } : undefined"
        :aria-label="`Go back to ${chapters[i].label}`"
        @click="pileSpread ? pickFromPile(i) : togglePileSpread()"
      >
        <span class="pile-num" aria-hidden="true">{{ chapters[i].num }}</span>
        <span class="pile-tab-mark" aria-hidden="true">{{ chapters[i].num }}</span>
      </button>
      <button
        v-if="pile.length > 1 && !pileSpread"
        type="button"
        class="pile-hint"
        @click="togglePileSpread"
        aria-label="Spread the pile to pick a page"
      >
        {{ pile.length }} pages
      </button>
    </div>

    <!-- The stack: each page is a transparent wrap, paper inside with a
         right margin, tab attached in that margin. -->
    <div class="page-stack">
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
            @go="goTo"
            @about="emit('back-to-cover-section', 'about')"
            @contact="emit('back-to-cover-section', 'contact')"
          />
        </div>
        <button
          type="button"
          class="page-tab"
          :class="{ active: i === currentIndex, 'is-piled': pileSet.has(i) }"
          :style="{ '--tab-row': i }"
          :aria-label="`Go to ${ch.label}`"
          :aria-current="i === currentIndex ? 'page' : undefined"
          @click="openModal(i)"
        >
          {{ ch.num }}
        </button>
      </div>
    </div>

    <!-- The chapter modal: preview, then turn to the page. -->
    <ChapterModal
      v-if="modalIndex !== null"
      :chapter="chapters[modalIndex]"
      :current="modalIndex === currentIndex"
      @close="closeModal"
      @go="goFromModal"
    />
  </div>
</template>
