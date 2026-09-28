<script setup lang="ts">
/**
 * Desk clutter: the lived-in bits around the pile and the remote —
 * a big coffee mug, headphones, a flash drive, a candy bowl, and crumpled
 * paper balls. Pure dressing: pointer-events none,
 * crowded onto the desk edges like a real desk, clear of the pile's
 * tap target, the remote, and the pull cord. The mug sits mid-left,
 * well below the pull cord and the manuscript card.
 */
</script>

<template>
  <div class="desk-clutter" aria-hidden="true">
    <!-- Flash drive, half-tucked behind the mug -->
    <div class="clutter clutter-flash">
      <svg viewBox="0 0 44 18">
        <rect x="2" y="5" width="12" height="8" rx="1" class="flash-metal" />
        <line x1="5" y1="5" x2="5" y2="13" class="flash-seam" />
        <line x1="9" y1="5" x2="9" y2="13" class="flash-seam" />
        <rect x="13" y="2" width="29" height="14" rx="3" class="flash-body" />
        <rect x="17" y="6" width="8" height="3" rx="1.5" class="flash-led" />
      </svg>
    </div>
    <!-- Coffee mug, big diner-style, mid left lane -->
    <div class="clutter clutter-mug">
      <svg viewBox="0 0 56 68">
        <defs>
          <linearGradient id="mugGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#b5563c" />
            <stop offset="0.65" stop-color="#a8432f" />
            <stop offset="1" stop-color="#86301f" />
          </linearGradient>
        </defs>
        <g class="steam">
          <path d="M22 16 C 20 11, 24 9, 22 4" />
          <path d="M31 16 C 29 11, 33 9, 31 4" />
        </g>
        <ellipse cx="24" cy="23" rx="15" ry="5" class="coffee" />
        <ellipse cx="20" cy="22" rx="7" ry="2.2" class="coffee-glint" />
        <rect x="9" y="23" width="30" height="36" rx="6" class="mug-body" />
        <path d="M39 30 q13 1 12 12 q-1 10 -12 10" class="mug-handle" />
        <rect x="13" y="28" width="6" height="24" rx="3" class="mug-shine" />
      </svg>
    </div>
    <!-- Sticky notes live on the pages now (PageStickies.vue). -->
    <!-- Headphones, resting lower left lane -->
    <div class="clutter clutter-phones">
      <svg viewBox="0 0 68 54">
        <defs>
          <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#3a3a42" />
            <stop offset="1" stop-color="#232327" />
          </linearGradient>
        </defs>
        <path d="M10 44 Q10 8 34 8 Q58 8 58 44" class="phones-band" />
        <rect x="2" y="34" width="15" height="17" rx="7" class="phones-cup" />
        <rect x="4.5" y="37" width="10" height="11" rx="4" class="phones-pad" />
        <rect x="51" y="34" width="15" height="17" rx="7" class="phones-cup" />
        <rect x="53.5" y="37" width="10" height="11" rx="4" class="phones-pad" />
      </svg>
    </div>
    <!-- Candy bowl, clustered by the remote — candy piled visibly in the bowl -->
    <div class="clutter clutter-bowl">
      <svg viewBox="0 0 64 54">
        <defs>
          <linearGradient id="bowlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#8b9cb3" />
            <stop offset="1" stop-color="#66788f" />
          </linearGradient>
        </defs>
        <path d="M6 26 Q6 50 32 50 Q58 50 58 26 Z" class="bowl-body" />
        <ellipse cx="32" cy="26" rx="26" ry="7" class="bowl-rim" />
        <g class="candy c1"><path d="M15 18 l-7 -5 l1 8 z" /><circle cx="20" cy="17" r="7" /><path d="M25 16 l7 -5 l-1 8 z" /></g>
        <g class="candy c2"><path d="M26 13 l-7 -5 l1 8 z" /><circle cx="31" cy="12" r="7" /><path d="M36 11 l7 -5 l-1 8 z" /></g>
        <g class="candy c3"><path d="M38 18 l-7 -5 l1 8 z" /><circle cx="43" cy="17" r="7" /><path d="M48 16 l7 -5 l-1 8 z" /></g>
        <g class="candy c4"><circle cx="26" cy="21" r="6" /><circle cx="37" cy="21" r="6" /></g>
      </svg>
    </div>
    <!-- Crumpled paper balls -->
    <div class="clutter clutter-ball1">
      <svg viewBox="0 0 30 30">
        <path d="M15 3 L22 6 L26 13 L24 21 L16 27 L8 25 L3 18 L5 9 Z" class="ball-paper" />
        <path d="M15 3 L13 12 L22 6 M13 12 L5 9 M13 12 L16 27 M13 12 L24 21 M8 25 L13 12" class="ball-facet" />
      </svg>
    </div>
    <div class="clutter clutter-ball2">
      <svg viewBox="0 0 30 30">
        <path d="M15 3 L22 6 L26 13 L24 21 L16 27 L8 25 L3 18 L5 9 Z" class="ball-paper" />
        <path d="M15 3 L13 12 L22 6 M13 12 L5 9 M13 12 L16 27 M13 12 L24 21 M8 25 L13 12" class="ball-facet" />
      </svg>
    </div>
    <div class="clutter clutter-ball3">
      <svg viewBox="0 0 30 30">
        <path d="M15 3 L22 6 L26 13 L24 21 L16 27 L8 25 L3 18 L5 9 Z" class="ball-paper" />
        <path d="M15 3 L13 12 L22 6 M13 12 L5 9 M13 12 L16 27 M13 12 L24 21 M8 25 L13 12" class="ball-facet" />
      </svg>
    </div>
    <!-- Cell phone lives in DeskPhone.vue now — it's tappable. -->
  </div>
</template>

<style scoped>
.desk-clutter {
  display: contents;
}
.clutter {
  position: absolute;
  z-index: 840;
  pointer-events: none;
  opacity: 0.97;
  filter: drop-shadow(0 9px 10px rgba(24, 14, 6, 0.35));
}
.clutter svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

/* ---- placement: same lane math as the remote ---- */
.clutter-mug {
  left: calc(30px - var(--desk-pl));
  top: 30svh;
  width: 110px;
}
.clutter-flash {
  left: calc(22px - var(--desk-pl));
  top: 37svh;
  width: 80px;
  transform: rotate(24deg);
}
.clutter-phones {
  left: calc(10px - var(--desk-pl));
  top: 76svh;
  width: 150px;
  transform: rotate(-8deg);
}
.clutter-bowl {
  left: calc(40px - var(--desk-pl));
  top: 60svh;
  width: 140px;
}
.clutter-ball2 {
  left: calc(18px - var(--desk-pl));
  top: 72svh;
  width: 44px;
  transform: rotate(14deg);
}
.clutter-ball3 {
  display: none;
}
.clutter-ball1 {
  right: calc(24px - var(--desk-pr));
  top: 430px;
  width: 44px;
  transform: rotate(-20deg);
}

/* ---- sticky notes live on the pages now (PageStickies.vue) ---- */

/* ---- mug ---- */
.steam path {
  fill: none;
  stroke: rgba(210, 200, 185, 0.55);
  stroke-width: 2;
  stroke-linecap: round;
  animation: steam-rise 3.2s ease-in-out infinite;
}
.steam path:last-child {
  animation-delay: 1.1s;
}
@keyframes steam-rise {
  0%, 100% { opacity: 0.25; transform: translateY(2px); }
  50% { opacity: 0.75; transform: translateY(-2px); }
}
.mug-body {
  fill: url(#mugGrad);
  stroke: rgba(60, 20, 12, 0.45);
  stroke-width: 1;
}
.mug-handle {
  fill: none;
  stroke: #a8432f;
  stroke-width: 5.5;
  stroke-linecap: round;
}
.coffee {
  fill: #3a2417;
}
.coffee-glint {
  fill: rgba(214, 178, 140, 0.35);
}
.mug-shine {
  fill: rgba(255, 235, 215, 0.28);
}

/* ---- flash drive ---- */
.flash-body {
  fill: #3d5a80;
  stroke: rgba(15, 25, 40, 0.5);
  stroke-width: 1;
}
.flash-metal {
  fill: #b9c2cc;
  stroke: rgba(60, 70, 85, 0.6);
  stroke-width: 1;
}
.flash-seam {
  stroke: rgba(60, 70, 85, 0.6);
  stroke-width: 1;
}
.flash-led {
  fill: #8fd18f;
}

/* ---- headphones ---- */
.phones-band {
  fill: none;
  stroke: url(#bandGrad);
  stroke-width: 7;
  stroke-linecap: round;
}
.phones-cup {
  fill: #2b2b30;
  stroke: rgba(10, 10, 14, 0.5);
  stroke-width: 1;
}
.phones-pad {
  fill: #6b4a35;
}

/* ---- candy bowl ---- */
.candy circle { stroke: rgba(40, 20, 10, 0.35); stroke-width: 1; }
.candy path { fill: rgba(240, 230, 215, 0.9); }
.candy.c1 circle { fill: #c0392b; }
.candy.c2 circle { fill: #5da85f; }
.candy.c3 circle { fill: #e8b83c; }
.candy.c4 circle { fill: #8e6cc9; }
.bowl-body {
  fill: url(#bowlGrad);
  stroke: rgba(40, 55, 75, 0.65);
  stroke-width: 1.5;
}
.bowl-rim {
  fill: rgba(70, 84, 102, 0.9);
  stroke: rgba(40, 55, 75, 0.65);
  stroke-width: 1.5;
}

/* ---- crumpled paper balls ---- */
.ball-paper {
  fill: #ddd6c2;
  stroke: #aaa28a;
  stroke-width: 1.2;
}
.ball-facet {
  fill: none;
  stroke: #b8b09a;
  stroke-width: 1;
  stroke-linecap: round;
}

/* ---- sticky notes live on the pages now (PageStickies.vue) ---- */

/* ---- dim with the room ---- */
html[data-theme='dark'] .clutter {
  opacity: 0.8;
  filter: drop-shadow(0 9px 10px rgba(0, 0, 0, 0.5));
}
html[data-blacklight='on'] .clutter {
  opacity: 0.55;
}

@media (max-width: 640px) {
  .clutter-mug {
    left: calc(8px - var(--desk-pl));
    top: 33svh;
    width: 76px;
  }
  .clutter-flash {
    left: calc(10px - var(--desk-pl));
    top: 39svh;
    width: 62px;
  }
  .clutter-phones {
    left: calc(0px - var(--desk-pl));
    top: 79svh;
    width: 120px;
  }
  .clutter-bowl {
    left: calc(14px - var(--desk-pl));
    top: 58svh;
    width: 104px;
  }
  .clutter-ball2 {
    left: calc(12px - var(--desk-pl));
    top: 73svh;
    width: 32px;
  }
  .clutter-ball3 {
    display: block;
    left: calc(28px - var(--desk-pl));
    top: 88svh;
    width: 28px;
    transform: rotate(28deg);
  }
  .clutter-ball1 {
    right: calc(8px - var(--desk-pr));
    top: 430px;
    width: 32px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .steam path {
    animation: none;
  }
}
</style>
