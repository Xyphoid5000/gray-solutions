<script setup lang="ts">
/**
 * The match guy: a little silhouette who walks across the desk when the
 * candle gets blown out too many times in a row. Flashlight mode for the
 * complaint walk, match mode for the relight run, carry mode when he
 * quits and takes the candle with him — and empty mode for the walk off
 * after he sets it back down. The parent drives his x; he handles the
 * walk cycle and the speech bubble.
 */
defineProps<{
  /** Viewport x of his anchor (his center). */
  x: number;
  mode: 'flashlight' | 'match' | 'carry' | 'empty';
  /** 1 = walking right, -1 = walking left. */
  facing: 1 | -1;
  /** Speech bubble text; null hides the bubble. */
  line: string | null;
  /** Exiting through the invisible doorway: fade out while walking. */
  fading?: boolean;
}>();
</script>

<template>
  <div class="match-guy" :style="{ left: `${x}px`, opacity: fading ? 0 : 1 }" aria-hidden="true">
    <div v-if="line" class="mg-bubble">{{ line }}</div>
    <div class="mg-aura"></div>
    <svg viewBox="0 0 120 120" :class="{ flip: facing === -1 }">
      <defs>
        <radialGradient id="mg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffd9a0" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#ffd9a0" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="mg-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#fff3d6" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#fff3d6" stop-opacity="0" />
        </linearGradient>
      </defs>
      <!-- flashlight beam + the glow it throws -->
      <g v-if="mode === 'flashlight'">
        <circle cx="88" cy="52" r="36" fill="url(#mg-glow)" />
        <polygon points="94,46 94,60 250,108 250,4" fill="url(#mg-beam)" />
      </g>
      <!-- match / carried-candle glow -->
      <g v-if="mode === 'match' || mode === 'carry'">
        <circle :cx="mode === 'match' ? 104 : 87" cy="42" r="32" fill="url(#mg-glow)" />
      </g>
      <!-- legs: opposite-phase swing is the walk -->
      <rect class="mg-leg mg-leg-a" x="38" y="72" width="11" height="40" rx="5.5" />
      <rect class="mg-leg mg-leg-b" x="51" y="72" width="11" height="40" rx="5.5" />
      <!-- torso, leaning into the walk -->
      <rect class="mg-torso" x="32" y="36" width="32" height="44" rx="13" />
      <!-- back arm swings with the stride -->
      <rect class="mg-arm-back" x="25" y="42" width="10" height="30" rx="5" />
      <!-- head -->
      <circle class="mg-head" cx="50" cy="20" r="14" />
      <!-- front arm extended, holding whatever he's holding -->
      <rect class="mg-arm-front" x="58" y="44" width="26" height="10" rx="5" />
      <!-- the flashlight -->
      <g v-if="mode === 'flashlight'">
        <rect x="80" y="40" width="17" height="18" rx="4" class="mg-torch" />
        <rect x="94" y="44" width="6" height="10" rx="2" class="mg-lens" />
      </g>
      <!-- the lit match -->
      <g v-if="mode === 'match'">
        <rect x="80" y="47" width="24" height="5" rx="2.5" class="mg-stick" />
        <circle cx="104" cy="49.5" r="3.5" class="mg-head-fire" />
        <g class="mg-flame">
          <ellipse cx="104" cy="36" rx="7" ry="12" class="mg-flame-outer" />
          <ellipse cx="104" cy="39" rx="3.5" ry="6.5" class="mg-flame-inner" />
        </g>
      </g>
      <!-- the candle, carried off into the dark -->
      <g v-if="mode === 'carry'">
        <rect x="80" y="26" width="14" height="24" rx="2.5" class="mg-wax" />
        <ellipse cx="87" cy="26" rx="7" ry="2.5" class="mg-wax-top" />
        <g class="mg-flame">
          <ellipse cx="87" cy="14" rx="5.5" ry="9.5" class="mg-flame-outer" />
          <ellipse cx="87" cy="16" rx="2.8" ry="5" class="mg-flame-inner" />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.match-guy {
  position: fixed;
  /* Feet land on the desk, in front of the candle's lane. */
  top: 62svh;
  width: 110px;
  height: 120px;
  margin-left: -55px;
  z-index: 2100;
  pointer-events: none;
  /* The invisible doorway: he fades out mid-stride. */
  transition: opacity 0.7s ease;
}
@media (max-width: 640px) {
  .match-guy {
    width: 92px;
    height: 100px;
    margin-left: -46px;
  }
}
.match-guy svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
}
.match-guy svg.flip {
  transform: scaleX(-1);
}
/* Rim-lit in orange by the blazing doorway as he walks through it. */
.door-glow svg {
  filter: drop-shadow(0 0 26px rgba(255, 150, 45, 0.9))
    drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
}
/* A faint pool of light around his feet so he reads in the dark. */
.mg-aura {
  position: absolute;
  left: 50%;
  top: 62%;
  width: 230px;
  height: 150px;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    closest-side,
    rgba(255, 220, 160, 0.14) 0%,
    transparent 70%
  );
  pointer-events: none;
}
.mg-bubble {
  position: absolute;
  bottom: calc(100% - 4px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 150px;
  max-width: 250px;
  background: #fffdf6;
  color: #2b2b2b;
  border-radius: 12px;
  padding: 9px 13px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  pointer-events: none;
}
.mg-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 8px solid transparent;
  border-top-color: #fffdf6;
}
/* The figure is a silhouette against his own light. */
.mg-leg,
.mg-torso,
.mg-head,
.mg-arm-back,
.mg-arm-front {
  fill: #17171a;
}
.mg-leg,
.mg-arm-back {
  transform-box: fill-box;
}
.mg-leg {
  transform-origin: 50% 8%;
  animation: mg-step 0.85s ease-in-out infinite alternate;
}
.mg-leg-b {
  animation-delay: -0.425s;
}
@keyframes mg-step {
  from {
    transform: rotate(26deg);
  }
  to {
    transform: rotate(-26deg);
  }
}
.mg-torso {
  transform: rotate(7deg);
  transform-origin: center;
  transform-box: fill-box;
}
.mg-arm-back {
  transform-origin: 50% 8%;
  animation: mg-swing 0.85s ease-in-out infinite alternate;
}
@keyframes mg-swing {
  from {
    transform: rotate(14deg);
  }
  to {
    transform: rotate(-14deg);
  }
}
.mg-torch {
  fill: #3d3d44;
}
.mg-lens {
  fill: #fff3d6;
}
.mg-stick {
  fill: #d9b381;
}
.mg-head-fire {
  fill: #ff7a2e;
}
.mg-wax {
  fill: #e8dcc8;
}
.mg-wax-top {
  fill: #f2e8d5;
}
.mg-flame-outer {
  fill: #ff9d3c;
  opacity: 0.92;
  transform-origin: center;
  transform-box: fill-box;
  animation: mg-flick 0.5s ease-in-out infinite alternate;
}
.mg-flame-inner {
  fill: #ffe9a8;
  transform-origin: center;
  transform-box: fill-box;
  animation: mg-flick 0.38s ease-in-out infinite alternate-reverse;
}
@keyframes mg-flick {
  from {
    transform: scaleY(1) skewX(0deg);
  }
  to {
    transform: scaleY(1.14) skewX(4deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .mg-leg,
  .mg-arm-back,
  .mg-flame-outer,
  .mg-flame-inner {
    animation: none;
  }
}
</style>
