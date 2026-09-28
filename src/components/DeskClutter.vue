<script setup lang="ts">
/**
 * Desk clutter: the lived-in bits around the pile and candle —
 * a coffee mug, headphones, a flash drive, a candy bowl by the
 * candle, and a framed photo of an orange cat. Pure dressing:
 * pointer-events none, tucked to the desk edges, clear of the
 * pile, the page lanes, and the candle's tap target.
 */
</script>

<template>
  <div class="desk-clutter" aria-hidden="true">
    <!-- Coffee mug, upper left lane -->
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
    <!-- Flash drive, lying flat under the mug -->
    <div class="clutter clutter-flash">
      <svg viewBox="0 0 44 18">
        <rect x="2" y="5" width="12" height="8" rx="1" class="flash-metal" />
        <line x1="5" y1="5" x2="5" y2="13" class="flash-seam" />
        <line x1="9" y1="5" x2="9" y2="13" class="flash-seam" />
        <rect x="13" y="2" width="29" height="14" rx="3" class="flash-body" />
        <rect x="17" y="6" width="8" height="3" rx="1.5" class="flash-led" />
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
    <!-- Candy bowl, clustered around the candle -->
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
    <!-- Framed photo of an orange cat, upper right lane -->
    <div class="clutter clutter-cat">
      <svg viewBox="0 0 56 66">
        <rect x="2" y="2" width="52" height="62" rx="3" class="frame-wood" />
        <rect x="8" y="8" width="40" height="50" class="frame-mat" />
        <path d="M18 26 L14 12 L27 20 Z" class="cat-ear" />
        <path d="M38 26 L42 12 L29 20 Z" class="cat-ear" />
        <path d="M19 23 L17 15 L24 20 Z" class="cat-inner-ear" />
        <path d="M37 23 L39 15 L32 20 Z" class="cat-inner-ear" />
        <circle cx="28" cy="36" r="13" class="cat-face" />
        <circle cx="23" cy="34" r="1.8" class="cat-eye" />
        <circle cx="33" cy="34" r="1.8" class="cat-eye" />
        <path d="M26.5 39 L29.5 39 L28 41 Z" class="cat-nose" />
        <line x1="10" y1="37" x2="20" y2="38.5" class="whisker" />
        <line x1="10" y1="42" x2="20" y2="41" class="whisker" />
        <line x1="46" y1="37" x2="36" y2="38.5" class="whisker" />
        <line x1="46" y1="42" x2="36" y2="41" class="whisker" />
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

/* ---- placement: same lane math as the candle ---- */
.clutter-mug {
  left: calc(44px - var(--desk-pl));
  top: 6svh;
  width: 46px;
}
.clutter-flash {
  left: calc(58px - var(--desk-pl));
  top: 15svh;
  width: 40px;
  transform: rotate(18deg);
}
.clutter-phones {
  left: calc(22px - var(--desk-pl));
  top: 73svh;
  width: 68px;
  transform: rotate(-8deg);
}
.clutter-bowl {
  left: calc(58px - var(--desk-pl));
  top: 61svh;
  width: 58px;
}
.clutter-cat {
  right: calc(6px - var(--desk-pr));
  /* Below the last chapter tab, clear of the pull cord's swing. */
  top: 392px;
  width: 54px;
  transform: rotate(-6deg);
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

/* ---- cat photo ---- */
.frame-wood {
  fill: #6b4a2f;
  stroke: rgba(35, 20, 10, 0.55);
  stroke-width: 1.5;
}
.frame-mat {
  fill: #f4ead8;
}
.cat-face, .cat-ear {
  fill: #e8933c;
}
.cat-inner-ear {
  fill: #f7c489;
}
.cat-eye {
  fill: #2a2018;
}
.cat-nose {
  fill: #b4563a;
}
.whisker {
  stroke: rgba(90, 60, 35, 0.7);
  stroke-width: 1;
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
    left: calc(44px - var(--desk-pl));
    top: 5svh;
    width: 34px;
  }
  .clutter-flash {
    left: calc(34px - var(--desk-pl));
    top: 12svh;
    width: 30px;
  }
  .clutter-phones {
    left: calc(8px - var(--desk-pl));
    top: 75svh;
    width: 50px;
  }
  .clutter-bowl {
    left: calc(24px - var(--desk-pl));
    top: 59svh;
    width: 44px;
  }
  .clutter-cat {
    right: calc(4px - var(--desk-pr));
    top: 384px;
    width: 40px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .steam path {
    animation: none;
  }
}
</style>
