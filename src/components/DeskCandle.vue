<script setup lang="ts">
/**
 * The desk candle. Unlit in light mode, lit in dark (candlelight),
 * and clickable when lit — blow it out to find the blacklight.
 */
defineProps<{
  lit: boolean;
  blacklight: boolean;
}>();
const emit = defineEmits<{
  blowOut: [];
}>();
</script>

<template>
  <button
    class="desk-candle"
    :class="{ lit, blacklight }"
    :aria-label="
      lit
        ? 'Blow out the candle'
        : blacklight
          ? 'The candle is out — blacklight'
          : 'An unlit candle'
    "
    :disabled="!lit"
    @click="emit('blowOut')"
  >
    <svg viewBox="0 0 60 90" aria-hidden="true">
      <!-- wax -->
      <rect x="20" y="38" width="20" height="42" rx="3" class="wax" />
      <ellipse cx="30" cy="38" rx="10" ry="3.5" class="wax-top" />
      <!-- wick -->
      <rect x="29" y="30" width="2" height="9" rx="1" class="wick" />
      <!-- flame -->
      <g v-if="lit" class="flame">
        <ellipse cx="30" cy="20" rx="7" ry="11" class="flame-outer" />
        <ellipse cx="30" cy="22" rx="3.5" ry="6" class="flame-inner" />
      </g>
      <!-- melted wax drip -->
      <path d="M20 44 q-3 8 1 14 q2 4 4 1 l-1 -15 z" class="drip" />
    </svg>
    <!-- warm glow when lit -->
    <span v-if="lit" class="candle-glow" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
.desk-candle {
  position: fixed;
  /* On the desk, in the left lane with the pile. */
  left: 66px;
  top: 52%;
  width: 44px;
  height: 66px;
  z-index: 850;
  background: none;
  border: none;
  padding: 0;
  cursor: default;
  pointer-events: none;
  opacity: 0.92;
}
@media (max-width: 640px) {
  .desk-candle {
    left: 30px;
    top: 48%;
    width: 36px;
    height: 54px;
  }
}
.desk-candle.lit {
  cursor: pointer;
  pointer-events: auto;
}
.desk-candle svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}
.wax {
  fill: #e8dcc8;
  stroke: rgba(90, 70, 50, 0.35);
  stroke-width: 1;
}
.wax-top {
  fill: #f2e8d5;
}
.wick {
  fill: #2a2018;
}
.drip {
  fill: #e8dcc8;
  opacity: 0.9;
}
.flame-outer {
  fill: #ff9d3c;
  opacity: 0.9;
  transform-origin: 30px 28px;
  animation: flick 0.9s ease-in-out infinite alternate;
}
.flame-inner {
  fill: #ffe9a8;
  transform-origin: 30px 28px;
  animation: flick 0.7s ease-in-out infinite alternate-reverse;
}
@keyframes flick {
  from {
    transform: scaleY(1) skewX(0deg);
  }
  to {
    transform: scaleY(1.12) skewX(3deg);
  }
}
.candle-glow {
  position: absolute;
  left: 50%;
  top: 22%;
  width: 130px;
  height: 130px;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    closest-side,
    rgba(255, 170, 70, 0.28) 0%,
    rgba(255, 150, 50, 0.12) 45%,
    transparent 70%
  );
  pointer-events: none;
  animation: glow-pulse 2.4s ease-in-out infinite alternate;
}
@keyframes glow-pulse {
  from {
    opacity: 0.85;
  }
  to {
    opacity: 1;
  }
}
/* Blacklight: the candle sits cold under UV. */
.desk-candle.blacklight {
  opacity: 0.7;
}
.desk-candle.blacklight .wax {
  fill: #4a3f6b;
}
.desk-candle.blacklight .wax-top {
  fill: #5a4f7b;
}
</style>
