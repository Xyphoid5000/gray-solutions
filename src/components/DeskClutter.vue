<script setup lang="ts">
/**
 * Desk clutter: the lived-in bits around the pile and the remote —
 * a big coffee mug, headphones, a flash drive, a candy bowl, a cell
 * phone, crumpled paper balls, and sticky notes. Pure dressing:
 * pointer-events none, crowded onto the desk edges like a real desk,
 * clear of the pile's tap target, the remote, and the pull cord.
 */
</script>

<template>
  <div class="desk-clutter" aria-hidden="true">
    <!-- Flash drive, half-tucked under the mug -->
    <div class="clutter clutter-flash">
      <svg viewBox="0 0 44 18">
        <rect x="2" y="5" width="12" height="8" rx="1" class="flash-metal" />
        <line x1="5" y1="5" x2="5" y2="13" class="flash-seam" />
        <line x1="9" y1="5" x2="9" y2="13" class="flash-seam" />
        <rect x="13" y="2" width="29" height="14" rx="3" class="flash-body" />
        <rect x="17" y="6" width="8" height="3" rx="1.5" class="flash-led" />
      </svg>
    </div>
    <!-- Coffee mug, big diner-style, upper left lane -->
    <div class="clutter clutter-mug">
      <svg viewBox="0 0 48 60">
        <g class="steam">
          <path d="M18 14 C 16 10, 20 8, 18 4" />
          <path d="M26 14 C 24 10, 28 8, 26 4" />
        </g>
        <ellipse cx="20" cy="20" rx="13" ry="4" class="coffee" />
        <rect x="7" y="20" width="26" height="30" rx="5" class="mug-body" />
        <path d="M33 26 q11 1 10 10 q-1 8 -10 8" class="mug-handle" />
        <rect x="11" y="25" width="5" height="18" rx="2.5" class="mug-shine" />
      </svg>
    </div>
    <!-- Sticky note, left lane -->
    <div class="clutter clutter-sticky1">
      <svg viewBox="0 0 36 36">
        <rect x="2" y="2" width="32" height="32" rx="1.5" class="sticky-paper s-yellow" />
        <path d="M34 26 L26 34 L34 34 Z" class="sticky-curl" />
        <line x1="8" y1="12" x2="28" y2="12" class="sticky-line" />
        <line x1="8" y1="18" x2="24" y2="18" class="sticky-line" />
      </svg>
    </div>
    <!-- Headphones, resting lower left lane -->
    <div class="clutter clutter-phones">
      <svg viewBox="0 0 68 54">
        <path d="M10 44 Q10 8 34 8 Q58 8 58 44" class="phones-band" />
        <rect x="2" y="34" width="15" height="17" rx="7" class="phones-cup" />
        <rect x="4.5" y="37" width="10" height="11" rx="4" class="phones-pad" />
        <rect x="51" y="34" width="15" height="17" rx="7" class="phones-cup" />
        <rect x="53.5" y="37" width="10" height="11" rx="4" class="phones-pad" />
      </svg>
    </div>
    <!-- Candy bowl, clustered by the remote -->
    <div class="clutter clutter-bowl">
      <svg viewBox="0 0 60 46">
        <g class="candy c1"><path d="M14 16 l-6 -4 l1 7 z" /><circle cx="18" cy="15" r="6" /><path d="M22 14 l6 -4 l-1 7 z" /></g>
        <g class="candy c2"><path d="M28 12 l-6 -4 l1 7 z" /><circle cx="32" cy="11" r="6" /><path d="M36 10 l6 -4 l-1 7 z" /></g>
        <g class="candy c3"><path d="M40 17 l-6 -4 l1 7 z" /><circle cx="44" cy="16" r="6" /><path d="M48 15 l6 -4 l-1 7 z" /></g>
        <g class="candy c4"><circle cx="25" cy="17" r="5.5" /><circle cx="38" cy="18" r="5.5" /></g>
        <path d="M6 22 Q6 42 30 42 Q54 42 54 22 Z" class="bowl-body" />
        <ellipse cx="30" cy="22" rx="24" ry="6" class="bowl-rim" />
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
    <!-- Sticky note, right side -->
    <div class="clutter clutter-sticky2">
      <svg viewBox="0 0 36 36">
        <rect x="2" y="2" width="32" height="32" rx="1.5" class="sticky-paper s-pink" />
        <path d="M34 26 L26 34 L34 34 Z" class="sticky-curl" />
        <line x1="8" y1="12" x2="28" y2="12" class="sticky-line" />
        <line x1="8" y1="18" x2="24" y2="18" class="sticky-line" />
        <line x1="8" y1="24" x2="20" y2="24" class="sticky-line" />
      </svg>
    </div>
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
  opacity: 0.95;
}
.clutter svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

/* ---- placement: same lane math as the remote ---- */
.clutter-mug {
  left: calc(28px - var(--desk-pl));
  top: 6svh;
  width: 72px;
}
.clutter-flash {
  left: calc(20px - var(--desk-pl));
  top: 11svh;
  width: 56px;
  transform: rotate(24deg);
}
.clutter-sticky1 {
  left: calc(60px - var(--desk-pl));
  top: 39svh;
  width: 44px;
  transform: rotate(-8deg);
}
.clutter-phones {
  left: calc(8px - var(--desk-pl));
  top: 80svh;
  width: 100px;
  transform: rotate(-8deg);
}
.clutter-bowl {
  left: calc(60px - var(--desk-pl));
  top: 66svh;
  width: 92px;
}
.clutter-ball2 {
  left: calc(16px - var(--desk-pl));
  top: 76svh;
  width: 30px;
  transform: rotate(14deg);
}
.clutter-ball3 {
  display: none;
}
.clutter-ball1 {
  right: calc(24px - var(--desk-pr));
  top: 420px;
  width: 30px;
  transform: rotate(-20deg);
}
.clutter-sticky2 {
  right: calc(80px - var(--desk-pr));
  top: 330px;
  width: 38px;
  transform: rotate(7deg);
}

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
  fill: #a8432f;
  stroke: rgba(60, 20, 12, 0.45);
  stroke-width: 1;
}
.mug-handle {
  fill: none;
  stroke: #a8432f;
  stroke-width: 5;
  stroke-linecap: round;
}
.coffee {
  fill: #3a2417;
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
  stroke: #2b2b30;
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
.candy path { fill: rgba(240, 230, 215, 0.85); }
.candy.c1 circle { fill: #c0392b; }
.candy.c2 circle { fill: #5da85f; }
.candy.c3 circle { fill: #e8b83c; }
.candy.c4 circle { fill: #8e6cc9; }
.bowl-body {
  fill: rgba(122, 139, 160, 0.55);
  stroke: rgba(40, 55, 75, 0.6);
  stroke-width: 1.5;
}
.bowl-rim {
  fill: rgba(90, 105, 125, 0.7);
  stroke: rgba(40, 55, 75, 0.6);
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

/* ---- sticky notes ---- */
.sticky-paper {
  stroke: rgba(60, 45, 10, 0.3);
  stroke-width: 1;
}
.s-yellow { fill: #f5df6b; }
.s-pink { fill: #f2a7c3; }
.sticky-curl {
  fill: rgba(0, 0, 0, 0.12);
}
.sticky-line {
  stroke: rgba(90, 70, 30, 0.4);
  stroke-width: 1.4;
  stroke-linecap: round;
}

/* ---- dim with the room ---- */
html[data-theme='dark'] .clutter {
  opacity: 0.78;
}
html[data-blacklight='on'] .clutter {
  opacity: 0.55;
}

@media (max-width: 640px) {
  .clutter-mug {
    left: calc(28px - var(--desk-pl));
    top: 7svh;
    width: 54px;
  }
  .clutter-flash {
    left: calc(20px - var(--desk-pl));
    top: 11svh;
    width: 46px;
  }
  .clutter-sticky1 {
    left: calc(56px - var(--desk-pl));
    top: 27svh;
    width: 34px;
  }
  .clutter-phones {
    left: calc(2px - var(--desk-pl));
    top: 80svh;
    width: 84px;
  }
  .clutter-bowl {
    left: calc(20px - var(--desk-pl));
    top: 60svh;
    width: 72px;
  }
  .clutter-ball2 {
    left: calc(14px - var(--desk-pl));
    top: 76svh;
    width: 24px;
  }
  .clutter-ball3 {
    display: block;
    left: calc(30px - var(--desk-pl));
    top: 89svh;
    width: 22px;
    transform: rotate(28deg);
  }
    .clutter-ball1 {
    right: calc(8px - var(--desk-pr));
    top: 430px;
    width: 24px;
  }
  .clutter-sticky2 {
    right: calc(50px - var(--desk-pr));
    top: 340px;
    width: 30px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .steam path {
    animation: none;
  }
}
</style>
