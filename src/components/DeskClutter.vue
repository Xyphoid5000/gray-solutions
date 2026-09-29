<script setup lang="ts">
/**
 * Desk clutter: the lived-in bits around the pile and the remote —
 * a big coffee mug and crumpled paper balls. Pure dressing:
 * pointer-events none, crowded onto the desk edges like a real desk,
 * clear of the pile's tap target, the remote, and the pull cord.
 * The mug sits mid-left, well below the pull cord and the manuscript card.
 */
</script>

<template>
  <div class="desk-clutter" aria-hidden="true">
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
