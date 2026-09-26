<script setup lang="ts">
/**
 * A hand holding a lit match, used in the lights-off ritual: the room
 * goes truly dark, this hand slides in from the left edge, and the
 * match tip lands exactly on the candle's wick (positioned by the
 * parent from the candle's live bounding rect).
 */
defineProps<{
  /** Viewport coords of the candle wick — the match tip lands here. */
  x: number;
  y: number;
  /** True once the hand has slid in to the wick. */
  atWick: boolean;
}>();
</script>

<template>
  <div
    class="match-hand"
    :class="{ 'at-wick': atWick }"
    :style="{ left: `${x - 204}px`, top: `${y - 62}px` }"
    aria-hidden="true"
  >
    <svg viewBox="0 0 220 130">
      <defs>
        <radialGradient id="mh-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffb14e" stop-opacity="0.55" />
          <stop offset="100%" stop-color="#ffb14e" stop-opacity="0" />
        </radialGradient>
      </defs>
      <!-- warm glow the match casts in the dark -->
      <circle cx="204" cy="62" r="52" fill="url(#mh-glow)" />
      <!-- matchstick -->
      <rect x="66" y="58" width="132" height="8" rx="4" class="mh-stick" />
      <!-- palm gripping the match -->
      <rect x="50" y="40" width="48" height="56" rx="22" class="mh-skin" />
      <!-- fingers curled over the match -->
      <rect x="60" y="48" width="12" height="34" rx="6" class="mh-skin-dark" />
      <rect x="74" y="48" width="12" height="34" rx="6" class="mh-skin-dark" />
      <rect x="88" y="48" width="12" height="34" rx="6" class="mh-skin-dark" />
      <!-- thumb -->
      <ellipse
        cx="70"
        cy="44"
        rx="17"
        ry="10"
        class="mh-skin"
        transform="rotate(-16 70 44)"
      />
      <!-- sleeve -->
      <rect x="-6" y="28" width="54" height="74" rx="12" class="mh-sleeve" />
      <rect x="40" y="34" width="16" height="62" rx="7" class="mh-cuff" />
      <!-- burning head -->
      <circle cx="198" cy="62" r="5.5" class="mh-head" />
      <!-- match flame -->
      <g class="mh-flame">
        <ellipse cx="204" cy="44" rx="8" ry="14" class="mh-flame-outer" />
        <ellipse cx="204" cy="48" rx="4" ry="7.5" class="mh-flame-inner" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.match-hand {
  position: fixed;
  z-index: 2100;
  width: 220px;
  pointer-events: none;
  /* Parked off the left edge; slides in so the match tip meets the wick. */
  transform: translateX(-280px);
  transition: transform 0.9s cubic-bezier(0.3, 0.7, 0.3, 1);
}
.match-hand.at-wick {
  transform: translateX(0);
}
.match-hand svg {
  width: 100%;
  display: block;
  overflow: visible;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
}
.mh-stick {
  fill: #d9b381;
}
.mh-head {
  fill: #ff7a2e;
}
.mh-skin {
  fill: #e8b58c;
}
.mh-skin-dark {
  fill: #d69a6e;
}
.mh-sleeve {
  fill: #3a4a5a;
}
.mh-cuff {
  fill: #2c3947;
}
.mh-flame-outer {
  fill: #ff9d3c;
  opacity: 0.92;
  transform-origin: 204px 58px;
  animation: mh-flick 0.5s ease-in-out infinite alternate;
}
.mh-flame-inner {
  fill: #ffe9a8;
  transform-origin: 204px 58px;
  animation: mh-flick 0.38s ease-in-out infinite alternate-reverse;
}
@keyframes mh-flick {
  from {
    transform: scaleY(1) skewX(0deg);
  }
  to {
    transform: scaleY(1.14) skewX(4deg);
  }
}
</style>
