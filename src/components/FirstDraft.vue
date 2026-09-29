<script setup lang="ts">
/**
 * The first draft: a small stack of papers on the desk (the cover says
 * "final draft" — this shouldn't be here). Tap it to fan it open and
 * thumb through 4 pages of nonsense. Each page number wears a mark:
 * page 1 ○, page 2 □, page 3 △, page 4 _. Drag the page aside and a
 * UV flashlight is hiding underneath — tap it to light up whatever
 * page you're on. The UV header is just the four marks; read them in
 * order against the pages and you've got the phone PIN (4132).
 */
import { ref } from 'vue';

const open = ref(false);
const pageIndex = ref(0);
const lifted = ref(false);
const uvOn = ref(false);
const torchFound = ref(false);

// Drag state for lifting the page to find the flashlight.
const dragX = ref(0);
const dragY = ref(0);
const dragging = ref(false);
let dragStartX = 0;
let dragStartY = 0;

interface DraftPage {
  num: number;
  mark: string;
  markName: string;
  lines: string[];
}

const PAGES: DraftPage[] = [
  {
    num: 1,
    mark: '○',
    markName: 'circled',
    lines: [
      'the margin notes ate the index and the index forgave them,',
      'a paperclip dreamed of being a staple and woke up tired,',
      'do not fold, spindle, or interrogate this paragraph,',
    ],
  },
  {
    num: 2,
    mark: '□',
    markName: 'boxed',
    lines: [
      'chapter twelve is hiding in the gutter between pages nine and ten,',
      'the ink ran out halfway through a very important —',
      'the footnotes filed a complaint with the header and won,',
    ],
  },
  {
    num: 3,
    mark: '△',
    markName: 'triangled',
    lines: [
      'somewhere a semicolon is holding this whole sentence together;',
      'the draft you are looking for was never written, only intended,',
      'the eraser dust has formed a union and demands better hours,',
    ],
  },
  {
    num: 4,
    mark: '_',
    markName: 'underlined',
    lines: [
      'two pencils gave up while drawing this page,',
      'the coffee ring on page two is load-bearing, do not remove it,',
      'this sentence ends exactly where it began,',
    ],
  },
];

/** Marks in PIN order: _ (p4) ○ (p1) △ (p3) □ (p2) → 4-1-3-2. */
const UV_MARKS = ['_', '○', '△', '□'];
const UV_TEXT =
  'the little phone on the desk keeps its secrets — feed it four digits in the order of the marks above.';

const page = () => PAGES[pageIndex.value];

function openDraft() {
  open.value = true;
  pageIndex.value = 0;
  lifted.value = false;
  torchFound.value = false;
  uvOn.value = false;
  dragX.value = 0;
  dragY.value = 0;
}

function closeDraft() {
  open.value = false;
  uvOn.value = false;
}

function nextPage() {
  if (pageIndex.value < PAGES.length - 1) {
    pageIndex.value++;
    uvOn.value = false;
  }
}

function prevPage() {
  if (pageIndex.value > 0) {
    pageIndex.value--;
    uvOn.value = false;
  }
}

function onDragStart(clientX: number, clientY: number) {
  if (lifted.value) return;
  dragging.value = true;
  dragStartX = clientX - dragX.value;
  dragStartY = clientY - dragY.value;
}

function onDragMove(clientX: number, clientY: number) {
  if (!dragging.value || lifted.value) return;
  dragX.value = clientX - dragStartX;
  dragY.value = clientY - dragStartY;
}

function onDragEnd() {
  if (!dragging.value) return;
  dragging.value = false;
  const dist = Math.hypot(dragX.value, dragY.value);
  if (dist > 60) {
    // Lifted far enough — the page parks off to the side,
    // flashlight revealed underneath where the page was.
    lifted.value = true;
    torchFound.value = true;
    dragX.value = 230;
    dragY.value = -40;
  } else {
    dragX.value = 0;
    dragY.value = 0;
  }
}

function toggleUV() {
  uvOn.value = !uvOn.value;
  if (uvOn.value) {
    // The page slides back to center so the secret is readable;
    // the torch parks in the corner, still tappable to turn off.
    lifted.value = false;
    dragX.value = 0;
    dragY.value = 0;
  }
}
</script>

<template>
  <!-- Closed: a small stack on the desk. -->
  <button type="button" class="draft-stack" @click="openDraft" aria-label="Open the first draft">
    <span class="draft-stack-papers" aria-hidden="true">
      <span class="draft-sheet s1"></span>
      <span class="draft-sheet s2"></span>
      <span class="draft-sheet s3"></span>
    </span>
    <span class="draft-stack-label">first draft</span>
  </button>

  <!-- Open: the draft modal. -->
  <Teleport to="body">
    <div v-if="open" class="draft-modal" role="dialog" aria-label="First draft">
      <div class="draft-modal-backdrop" @click="closeDraft"></div>
      <div class="draft-modal-card">
        <div class="draft-pages-area">
          <!-- The flashlight hides under the page stack. -->
          <button
            v-if="torchFound"
            type="button"
            class="uv-flashlight"
            :class="{ on: uvOn, parked: uvOn }"
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

          <!-- The current page; drag it aside to find the flashlight. -->
          <div
            class="draft-page"
            :class="{ lifted, uv: uvOn }"
            :style="{ transform: `translate(${dragX}px, ${dragY}px) rotate(${dragX * 0.06}deg)` }"
            @mousedown="onDragStart($event.clientX, $event.clientY)"
            @mousemove="onDragMove($event.clientX, $event.clientY)"
            @mouseup="onDragEnd"
            @mouseleave="onDragEnd"
            @touchstart.passive="onDragStart($event.touches[0].clientX, $event.touches[0].clientY)"
            @touchmove.passive="onDragMove($event.touches[0].clientX, $event.touches[0].clientY)"
            @touchend="onDragEnd"
          >
            <span class="draft-page-num" :aria-label="`Page ${page().num}, ${page().markName}`">
              <span class="draft-mark">{{ page().mark }}</span>{{ page().num }}
            </span>
            <p v-for="(line, i) in page().lines" :key="i" class="draft-nonsense">{{ line }}</p>
            <div v-if="uvOn" class="uv-secret">
              <div class="uv-secret-marks" aria-hidden="true">{{ UV_MARKS.join(' ') }}</div>
              <p>{{ UV_TEXT }}</p>
            </div>
            <span v-if="!lifted" class="draft-hint">drag me aside…</span>
          </div>
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
.draft-sheet.s3 { transform: rotate(-1deg); background: #f4eedd; }
.draft-stack-label {
  display: block;
  margin-top: 6px;
  font-family: var(--serif);
  font-style: italic;
  font-size: 0.85rem;
  color: rgba(240, 230, 210, 0.75);
  text-align: center;
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
.draft-pages-area {
  position: relative;
  width: 100%;
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ---- the page ---- */
.draft-page {
  position: relative;
  width: 100%;
  min-height: 360px;
  background: #f4eedd;
  border: 1px solid rgba(90, 75, 55, 0.45);
  border-radius: 3px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);
  padding: 1.4rem 1.2rem 1rem;
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: box-shadow 0.3s ease, background 0.4s ease;
  z-index: 2;
}
.draft-page:active { cursor: grabbing; }
.draft-page.lifted { transition: transform 0.35s ease; }
.draft-page.uv {
  background: #2a2140;
  border-color: rgba(150, 120, 255, 0.5);
  box-shadow: 0 0 60px rgba(140, 90, 255, 0.45), 0 18px 50px rgba(0, 0, 0, 0.55);
}
.draft-page-num {
  position: absolute;
  top: 0.7rem;
  right: 0.9rem;
  font-family: var(--serif);
  font-size: 1.05rem;
  color: #6d5c40;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.draft-page.uv .draft-page-num { color: #b9a8ff; }
.draft-mark {
  font-size: 1.35rem;
  line-height: 1;
  color: #8a6d3b;
}
.draft-page.uv .draft-mark { color: #d9c9ff; }
.draft-nonsense {
  font-family: var(--serif);
  font-style: italic;
  font-size: 1.02rem;
  line-height: 1.65;
  color: #5c4f38;
  margin: 0 0 1rem;
}
.draft-page.uv .draft-nonsense { color: #8f7fb8; }
.draft-hint {
  position: absolute;
  bottom: 0.7rem;
  left: 0;
  right: 0;
  text-align: center;
  font-family: var(--serif);
  font-style: italic;
  font-size: 0.8rem;
  color: rgba(109, 92, 64, 0.6);
  animation: draft-nudge 2.6s ease-in-out infinite;
}
@keyframes draft-nudge {
  0%, 100% { transform: translateX(0); opacity: 0.6; }
  50% { transform: translateX(7px); opacity: 1; }
}

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

/* ---- the flashlight ---- */
.uv-flashlight {
  position: absolute;
  z-index: 1;
  left: 50%;
  top: 50%;
  width: 110px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transform: translate(-50%, -50%) rotate(-18deg);
  animation: torch-roll 0.9s ease 0.15s;
  filter: drop-shadow(0 10px 12px rgba(0, 0, 0, 0.5));
  transition: left 0.4s ease, top 0.4s ease, width 0.4s ease, transform 0.4s ease;
}
/* When UV is on the page returns to center — the torch parks
   in the corner, still glowing and tappable to turn off. */
.uv-flashlight.parked {
  left: auto;
  right: 6px;
  top: auto;
  bottom: 6px;
  width: 76px;
  transform: rotate(-18deg);
  animation: none;
  z-index: 3;
}
@keyframes torch-roll {
  0% { transform: translate(-50%, -50%) rotate(-38deg); }
  45% { transform: translate(-50%, -50%) rotate(-4deg); }
  75% { transform: translate(-50%, -50%) rotate(-24deg); }
  100% { transform: translate(-50%, -50%) rotate(-18deg); }
}
.uv-torch {
  position: relative;
  display: block;
  width: 100%;
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
  display: block;
  margin-top: 4px;
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
}
</style>
