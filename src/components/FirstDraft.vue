<script setup lang="ts">
/**
 * The first draft: a small stack of papers on the desk (the cover says
 * "final draft" — this shouldn't be here). Tap it to fan it open and
 * thumb through 4 pages of nonsense. Each page number is marked up in
 * red pen: page 1 circled, page 2 boxed, page 3 triangled, page 4
 * underlined. The UV flashlight sits right there with the draft — tap
 * it to light up whatever page you're on. The UV header is just the
 * four marks; read them in order against the pages and you've got the
 * phone PIN (4132).
 */
import { ref } from 'vue';

const open = ref(false);
const pageIndex = ref(0);
const uvOn = ref(false);

interface DraftPage {
  num: number;
  mark: 'circle' | 'box' | 'triangle' | 'underline';
  lines: string[];
  uvText: string;
}

const PAGES: DraftPage[] = [
  {
    num: 1,
    mark: 'circle',
    lines: [
      'the margin notes ate the index and the index forgave them,',
      'a paperclip dreamed of being a staple and woke up tired,',
      'do not fold, spindle, or interrogate this paragraph,',
    ],
    uvText:
      'The circle is the second mark in the row above. Every page wears a mark in red pen — match them up. The order matters.',
  },
  {
    num: 2,
    mark: 'box',
    lines: [
      'chapter twelve is hiding in the gutter between pages nine and ten,',
      'the ink ran out halfway through a very important —',
      'the footnotes filed a complaint with the header and won,',
    ],
    uvText:
      'The box is the last mark. Four pages, four marks — line the pages up by the symbols, not the page numbers.',
  },
  {
    num: 3,
    mark: 'triangle',
    lines: [
      'somewhere a semicolon is holding this whole sentence together;',
      'the draft you are looking for was never written, only intended,',
      'the eraser dust has formed a union and demands better hours,',
    ],
    uvText:
      'The triangle sits third in the row. You\u2019re assembling a sequence — and the phone on my desk is waiting for it.',
  },
  {
    num: 4,
    mark: 'underline',
    lines: [
      'two pencils gave up while drawing this page,',
      'the coffee ring on page two is load-bearing, do not remove it,',
      'this sentence ends exactly where it began,',
    ],
    uvText:
      'The underline leads the row. Read the pages in mark order — _ ○ △ □ — and the way in is hiding in plain sight.',
  },
];

/** Marks in PIN order: underline (p4) circle (p1) triangle (p3) box (p2) → 4-1-3-2. */
const UV_MARKS = ['_', '○', '△', '□'];

const page = () => PAGES[pageIndex.value];

function openDraft() {
  open.value = true;
  pageIndex.value = 0;
  uvOn.value = false;
}

function closeDraft() {
  open.value = false;
  uvOn.value = false;
}

function nextPage() {
  if (pageIndex.value < PAGES.length - 1) {
    pageIndex.value++;
  }
}

function prevPage() {
  if (pageIndex.value > 0) {
    pageIndex.value--;
  }
}

/** Swipe through draft pages. */
let swipeStartX = 0;
function onSwipeStart(e: TouchEvent) {
  swipeStartX = e.touches[0].clientX;
}
function onSwipeEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - swipeStartX;
  if (Math.abs(dx) < 40) return;
  if (dx < 0) nextPage();
  else prevPage();
}

function toggleUV() {
  uvOn.value = !uvOn.value;
}
</script>

<template>
  <!-- Closed: a small stack on the desk, clearly labeled. -->
  <button type="button" class="draft-stack" @click="openDraft" aria-label="Open the first draft">
    <span class="draft-stack-papers" aria-hidden="true">
      <span class="draft-sheet s1"></span>
      <span class="draft-sheet s2"></span>
      <span class="draft-sheet s3">
        <span class="draft-sheet-title">FIRST DRAFT</span>
      </span>
    </span>
  </button>

  <!-- Open: the draft modal with the UV flashlight right there. -->
  <Teleport to="body">
    <div v-if="open" class="draft-modal" role="dialog" aria-label="First draft">
      <div class="draft-modal-backdrop" @click="closeDraft"></div>
      <div class="draft-modal-card">
        <div class="draft-modal-title">FIRST DRAFT</div>
        <div
          class="draft-pages-area"
          @touchstart.passive="onSwipeStart"
          @touchend.passive="onSwipeEnd"
        >
          <!-- The current page with red-pen markup. -->
          <div class="draft-page" :class="{ uv: uvOn }">
            <span class="draft-page-num" :class="page().mark" :aria-label="`Page ${page().num}`">
              {{ page().num }}
            </span>
            <p v-for="(line, i) in page().lines" :key="i" class="draft-nonsense">{{ line }}</p>
            <div v-if="uvOn" class="uv-secret">
              <div class="uv-secret-marks" aria-hidden="true">{{ UV_MARKS.join(' ') }}</div>
              <p>{{ page().uvText }}</p>
            </div>
          </div>

          <!-- The UV flashlight, sitting with the draft. -->
          <button
            type="button"
            class="uv-flashlight"
            :class="{ on: uvOn }"
            @click="toggleUV"
            aria-label="Toggle the UV flashlight"
          >
            <span class="uv-torch" aria-hidden="true">
              <span class="uv-torch-body"></span>
              <span class="uv-torch-head"></span>
              <span class="uv-torch-beam" v-if="uvOn"></span>
            </span>
            <span class="uv-label">UV</span>
          </button>
        </div>

        <div class="draft-nav">
          <button type="button" @click="prevPage" :disabled="pageIndex === 0" aria-label="Previous page">←</button>
          <span>{{ pageIndex + 1 }} / {{ PAGES.length }}</span>
          <button type="button" @click="nextPage" :disabled="pageIndex === PAGES.length - 1" aria-label="Next page">→</button>
        </div>
        <button type="button" class="draft-close" @click="closeDraft">put it back</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ---- closed stack on the desk ---- */
.draft-stack {
  position: absolute;
  left: calc(10px - var(--desk-pl));
  top: 76svh;
  width: 120px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transform: rotate(-8deg);
  filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.45));
}
.draft-stack-papers {
  position: relative;
  display: block;
  width: 100%;
  height: 84px;
}
.draft-sheet {
  position: absolute;
  inset: 0;
  background: #efe8d6;
  border: 1px solid rgba(90, 75, 55, 0.4);
  border-radius: 2px;
}
.draft-sheet.s1 { transform: rotate(-4deg) translate(-3px, 2px); }
.draft-sheet.s2 { transform: rotate(3deg) translate(3px, -1px); }
.draft-sheet.s3 {
  transform: rotate(-1deg);
  background: #f4eedd;
  display: flex;
  align-items: center;
  justify-content: center;
}
.draft-sheet-title {
  font-family: var(--sans);
  font-weight: 800;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  color: #8a6d3b;
  border: 2px solid #8a6d3b;
  border-radius: 3px;
  padding: 0.2rem 0.45rem;
  transform: rotate(-4deg);
  opacity: 0.85;
}

/* ---- open modal ---- */
.draft-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.2rem;
}
.draft-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(5, 3, 2, 0.72);
}
.draft-modal-card {
  position: relative;
  width: min(340px, 92vw);
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  align-items: center;
}
.draft-modal-title {
  font-family: var(--sans);
  font-weight: 800;
  font-size: 0.8rem;
  letter-spacing: 0.28em;
  color: #e8ddc4;
  opacity: 0.9;
}
.draft-pages-area {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

/* ---- the page ---- */
.draft-page {
  position: relative;
  width: 100%;
  min-height: 320px;
  background: #f4eedd;
  border: 1px solid rgba(90, 75, 55, 0.45);
  border-radius: 3px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);
  padding: 1.4rem 1.2rem 1rem;
  user-select: none;
  transition: box-shadow 0.3s ease, background 0.4s ease;
}
.draft-page.uv {
  background: #2a2140;
  border-color: rgba(150, 120, 255, 0.5);
  box-shadow: 0 0 60px rgba(140, 90, 255, 0.45), 0 18px 50px rgba(0, 0, 0, 0.55);
}

/* ---- red-pen markup around the page numbers ---- */
.draft-page-num {
  position: absolute;
  top: 0.95rem;
  right: 1.05rem;
  font-family: var(--serif);
  font-size: 1.05rem;
  font-weight: 700;
  color: #4a3f2c;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  min-height: 2rem;
}
.draft-page.uv .draft-page-num { color: #b9a8ff; }
/* Red pen: slightly irregular, hand-drawn feel. */
.draft-page-num.circle {
  border: 3px solid #c0392b;
  border-radius: 48% 52% 51% 49% / 55% 48% 52% 45%;
  transform: rotate(-4deg);
  padding: 0.1rem 0.35rem;
}
.draft-page-num.box {
  border: 3px solid #c0392b;
  border-radius: 3px 5px 4px 6px;
  transform: rotate(3deg);
  padding: 0.1rem 0.35rem;
}
.draft-page-num.triangle {
  border: none;
  padding: 0.35rem 0.4rem 0.15rem;
}
.draft-page-num.triangle::before {
  content: '';
  position: absolute;
  inset: -12px -16px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 40'%3E%3Cpolygon points='22,3 41,37 3,37' fill='none' stroke='%23c0392b' stroke-width='3' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat center / 100% 100%;
  transform: rotate(-2deg);
}
.draft-page-num.underline {
  border-bottom: 4px solid #c0392b;
  border-radius: 0 0 50% 50% / 0 0 8px 8px;
  padding-bottom: 0.1rem;
  transform: rotate(-1deg);
}
.draft-page.uv .draft-page-num.circle,
.draft-page.uv .draft-page-num.box,
.draft-page.uv .draft-page-num.underline {
  border-color: #e86a5a;
}
.draft-page.uv .draft-page-num.triangle::before {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 40'%3E%3Cpolygon points='22,3 41,37 3,37' fill='none' stroke='%23e86a5a' stroke-width='3' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat center / 100% 100%;
  transform: rotate(-2deg);
}

.draft-nonsense {
  font-family: var(--serif);
  font-style: italic;
  font-size: 1.02rem;
  line-height: 1.65;
  color: #5c4f38;
  margin: 0 0 1rem;
}
.draft-page.uv .draft-nonsense { color: #8f7fb8; }

/* ---- UV secret ---- */
.uv-secret {
  margin-top: 1.2rem;
  padding-top: 1rem;
  border-top: 1px dashed rgba(150, 120, 255, 0.45);
}
.uv-secret-marks {
  font-size: 1.7rem;
  letter-spacing: 0.6rem;
  color: #c9b8ff;
  text-shadow: 0 0 14px rgba(160, 110, 255, 0.9);
  margin-bottom: 0.7rem;
}
.uv-secret p {
  font-family: var(--serif);
  font-size: 1rem;
  line-height: 1.6;
  color: #d9c9ff;
  text-shadow: 0 0 10px rgba(160, 110, 255, 0.7);
  margin: 0;
}

/* ---- the flashlight, sitting with the draft ---- */
.uv-flashlight {
  background: rgba(20, 14, 8, 0.55);
  border: 1px solid rgba(232, 221, 196, 0.25);
  border-radius: 12px;
  padding: 0.7rem 1.4rem 0.55rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  animation: torch-roll 0.9s ease 0.15s;
  filter: drop-shadow(0 10px 12px rgba(0, 0, 0, 0.5));
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.uv-flashlight.on {
  border-color: rgba(160, 110, 255, 0.7);
  box-shadow: 0 0 24px rgba(160, 110, 255, 0.4);
}
@keyframes torch-roll {
  0% { transform: rotate(-8deg); }
  45% { transform: rotate(6deg); }
  75% { transform: rotate(-4deg); }
  100% { transform: rotate(0deg); }
}
.uv-torch {
  position: relative;
  display: block;
  width: 110px;
  height: 44px;
}
.uv-torch-body {
  position: absolute;
  left: 8px;
  top: 12px;
  width: 62px;
  height: 20px;
  border-radius: 9px;
  background: linear-gradient(180deg, #4a4a52 0%, #2c2c31 60%, #1d1d20 100%);
  border: 1px solid rgba(0, 0, 0, 0.6);
}
.uv-torch-head {
  position: absolute;
  right: 6px;
  top: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, #6a5a8a 0%, #3a3050 70%);
  border: 2px solid #222228;
}
.uv-flashlight.on .uv-torch-head {
  background: radial-gradient(circle at 50% 40%, #e8d8ff 0%, #a67cff 55%, #5a3aa0 100%);
  box-shadow: 0 0 26px rgba(160, 110, 255, 0.95);
}
.uv-torch-beam {
  position: absolute;
  right: -58px;
  top: 50%;
  width: 64px;
  height: 44px;
  transform: translateY(-50%);
  background: linear-gradient(90deg, rgba(170, 120, 255, 0.55), transparent);
  clip-path: polygon(0 32%, 100% 0, 100% 100%, 0 68%);
  pointer-events: none;
}
.uv-label {
  font-family: var(--sans);
  font-weight: 800;
  font-size: 0.8rem;
  letter-spacing: 0.22em;
  color: #c9b8ff;
  text-shadow: 0 0 8px rgba(160, 110, 255, 0.8);
}

/* ---- nav ---- */
.draft-nav {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  color: #e8ddc4;
  font-family: var(--serif);
}
.draft-nav button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(232, 221, 196, 0.35);
  background: rgba(20, 14, 8, 0.6);
  color: #e8ddc4;
  font-size: 1.2rem;
  cursor: pointer;
}
.draft-nav button:disabled { opacity: 0.3; cursor: default; }
.draft-close {
  background: none;
  border: none;
  color: rgba(232, 221, 196, 0.7);
  font-family: var(--serif);
  font-style: italic;
  font-size: 0.95rem;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 640px) {
  .draft-stack {
    left: calc(10px - var(--desk-pl));
    top: 79svh;
    width: 96px;
  }
  .draft-stack-papers { height: 68px; }
  .draft-sheet-title { font-size: 0.6rem; }
}
</style>
