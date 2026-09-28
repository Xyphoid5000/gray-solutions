<script setup lang="ts">
/**
 * A stylized hand that delivers (and later collects) the LED remote.
 * Side-grip: the palm covers the remote's midsection, fingers curl
 * under the bottom edge, and the thumb reaches left to the power
 * button — pressing it on the beat.
 *
 * Props: x/y = the desk spot's center (the remote's center); arrived =
 * slid into place; holding = gripping the remote; press = thumb down.
 */
const props = defineProps<{
  x: number;
  y: number;
  arrived: boolean;
  holding: boolean;
  press: boolean;
}>();

const SKIN = '#e8b58c';
const SKIN_SHADE = '#d69f75';
const SKIN_DEEP = '#b57e57';
const SKIN_LIGHT = '#f6d3a9';
</script>

<template>
  <div
    class="remote-hand"
    :class="{ arrived: props.arrived, press: props.press }"
    :style="{ left: props.x + 'px', top: props.y + 'px' }"
    aria-hidden="true"
  >
    <svg viewBox="0 0 150 100">
      <!-- Sleeve and cuff, entering from the left -->
      <rect x="-14" y="38" width="54" height="30" rx="9" fill="#2f3a4d" />
      <rect x="36" y="36" width="13" height="34" rx="6" fill="#54617a" />
      <!-- Wrist -->
      <rect x="47" y="41" width="16" height="25" rx="7" :fill="SKIN_SHADE" />

      <!-- Fingers curled under the remote (tops hidden behind it) -->
      <g :fill="SKIN_SHADE">
        <rect x="63" y="66" width="11" height="24" rx="5.5" />
        <rect x="75" y="66" width="11" height="26" rx="5.5" />
        <rect x="87" y="66" width="11" height="26" rx="5.5" />
        <rect x="99" y="66" width="11" height="23" rx="5.5" />
      </g>
      <g :fill="SKIN_DEEP" opacity="0.55">
        <rect x="63" y="82" width="11" height="8" rx="4" />
        <rect x="75" y="84" width="11" height="8" rx="4" />
        <rect x="87" y="84" width="11" height="8" rx="4" />
        <rect x="99" y="81" width="11" height="8" rx="4" />
      </g>

      <!-- The remote being carried -->
      <g v-if="props.holding">
        <rect x="34" y="30" width="104" height="46" rx="9" fill="#23262c" stroke="#101216" stroke-width="1.5" />
        <circle cx="48" cy="53" r="8" fill="#3a3f47" stroke="#101216" stroke-width="1" />
        <circle cx="48" cy="53" r="3" fill="none" stroke="#c9ccd4" stroke-width="1.6" />
        <line x1="48" y1="53" x2="48" y2="48.5" stroke="#c9ccd4" stroke-width="1.6" stroke-linecap="round" />
        <g>
          <circle cx="72" cy="44" r="4.5" fill="#2f6bff" />
          <circle cx="86" cy="44" r="4.5" fill="#ff3b30" />
          <circle cx="100" cy="44" r="4.5" fill="#34e07a" />
          <circle cx="72" cy="60" r="4.5" fill="#a86bff" />
          <circle cx="86" cy="60" r="4.5" fill="#ffb02e" />
          <circle cx="100" cy="60" r="4.5" fill="#eef2ff" />
        </g>
      </g>

      <!-- Palm / back of the hand over the remote's midsection -->
      <path
        d="M58,44 C58,34 66,28 78,28 C92,28 104,32 108,42 C111,50 110,60 104,66 C96,74 78,76 66,72 C58,69 55,60 56,52 C56,48 57,46 58,44 Z"
        :fill="SKIN"
      />
      <!-- Knuckle bumps -->
      <g :fill="SKIN">
        <circle cx="70" cy="31" r="6.5" />
        <circle cx="82" cy="29" r="6.5" />
        <circle cx="94" cy="31" r="6.5" />
      </g>
      <!-- Knuckle shading + highlight -->
      <g fill="none" stroke-linecap="round">
        <path d="M65,36 q5,3 10,1" :stroke="SKIN_DEEP" stroke-width="1.6" opacity="0.7" />
        <path d="M77,34 q5,3 10,1" :stroke="SKIN_DEEP" stroke-width="1.6" opacity="0.7" />
        <path d="M89,36 q5,3 10,1" :stroke="SKIN_DEEP" stroke-width="1.6" opacity="0.7" />
        <path d="M66,28 q12,-4 26,0" :stroke="SKIN_LIGHT" stroke-width="2.4" opacity="0.8" />
      </g>
      <!-- Palm underside shading -->
      <path
        d="M58,60 C70,70 92,72 104,64 C98,72 80,76 66,72 C58,69 55,64 58,60 Z"
        :fill="SKIN_DEEP"
        opacity="0.45"
      />

      <!-- Thumb reaching left to the power button -->
      <g class="thumb">
        <path
          d="M72,36 C64,34 56,38 51,44 C48,48 48,52 51,55 C54,58 59,56 63,52 C67,48 71,43 75,41 C74,39 73,37 72,36 Z"
          :fill="SKIN"
        />
        <circle cx="51" cy="52" r="5.5" :fill="SKIN" />
        <path d="M46,50 q5,-3 9,0" :fill="SKIN_LIGHT" opacity="0.8" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.remote-hand {
  position: fixed;
  z-index: 1300;
  width: 150px;
  height: 100px;
  margin-left: -75px;
  margin-top: -50px;
  pointer-events: none;
  /* Parked off-screen left; slides to the desk spot. */
  transform: translateX(-220px);
  transition: transform 1s cubic-bezier(0.22, 1, 0.36, 1);
}
.remote-hand.arrived {
  transform: translateX(0);
}
.remote-hand svg {
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.45));
}
.thumb {
  transition: transform 0.18s ease;
}
.remote-hand.press .thumb {
  transform: translateY(4px);
}
@media (prefers-reduced-motion: reduce) {
  .remote-hand {
    transition: none;
  }
}
</style>
