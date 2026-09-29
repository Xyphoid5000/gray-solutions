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
  yank: boolean;
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

      <!-- Fingers curled under the remote (tops hidden behind it) — only when carrying it -->
      <g v-if="props.holding" :fill="SKIN_SHADE">
        <rect x="63" y="66" width="11" height="24" rx="5.5" />
        <rect x="75" y="66" width="11" height="26" rx="5.5" />
        <rect x="87" y="66" width="11" height="26" rx="5.5" />
        <rect x="99" y="66" width="11" height="23" rx="5.5" />
      </g>
      <g v-if="props.holding" :fill="SKIN_DEEP" opacity="0.55">
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

      <!-- Palm / back of the hand over the remote's midsection (grip pose) -->
      <g v-if="props.holding">
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
      </g>

      <!-- Pointing hand (empty — just here to press the button):
           a single finger reaching down, no palm to cup anything. -->
      <g v-else>
        <!-- Knuckles tucked up high, mostly out of the way -->
        <g :fill="SKIN">
          <circle cx="52" cy="30" r="10" />
          <circle cx="66" cy="26" r="10" />
          <circle cx="80" cy="28" r="9" />
        </g>
        <path d="M50,24 q16,-8 32,-2" fill="none" :stroke="SKIN_LIGHT" stroke-width="2.4" opacity="0.8" stroke-linecap="round" />
        <!-- Index finger extended straight down to the button -->
        <g class="press-finger">
          <rect x="56" y="32" width="16" height="46" rx="8" :fill="SKIN" />
          <rect x="58.5" y="34" width="5" height="40" rx="2.5" :fill="SKIN_LIGHT" opacity="0.55" />
          <!-- Fingertip pad -->
          <ellipse cx="64" cy="74" rx="8" ry="6.5" :fill="SKIN" />
          <ellipse cx="64" cy="76" rx="4.5" ry="3.5" :fill="SKIN_DEEP" opacity="0.45" />
          <!-- Nail -->
          <ellipse cx="64" cy="68" rx="4.5" ry="5.5" :fill="SKIN_LIGHT" opacity="0.95" />
        </g>
        <!-- Thumb resting against the finger, not wrapping anything -->
        <path
          d="M56,40 C50,42 46,46 46,51 C46,56 50,59 54,57 C58,55 60,49 60,45 C60,42 58,39 56,40 Z"
          :fill="SKIN_SHADE"
        />
      </g>

      <!-- Thumb reaching left to the power button (grip pose) -->
      <g v-if="props.holding" class="thumb">
        <path
          d="M72,36 C64,34 56,38 51,44 C48,48 48,52 51,55 C54,58 59,56 63,52 C67,48 71,43 75,41 C74,39 73,37 72,36 Z"
          :fill="SKIN"
        />
        <circle cx="51" cy="52" r="5.5" :fill="SKIN" />
        <path d="M46,50 q5,-3 9,0" :fill="SKIN_LIGHT" opacity="0.8" />
      </g>

      <!-- Fist closed around the pull-cord knob (yank pose) -->
      <g v-if="props.yank" class="yank-motion">
        <!-- Back of the hand -->
        <path
          d="M50,36 C50,26 58,20 70,20 C84,20 96,24 100,34 C103,42 102,52 96,58 C88,66 72,68 60,64 C52,61 47,52 48,44 C48,40 49,38 50,36 Z"
          :fill="SKIN"
        />
        <!-- Knuckle ridges -->
        <g :fill="SKIN">
          <circle cx="62" cy="24" r="6" />
          <circle cx="74" cy="22" r="6" />
          <circle cx="86" cy="24" r="6" />
        </g>
        <path d="M60,20 q14,-5 28,0" fill="none" :stroke="SKIN_LIGHT" stroke-width="2.2" opacity="0.8" stroke-linecap="round" />
        <!-- Curled fingers (fist front) -->
        <g :fill="SKIN_SHADE">
          <rect x="54" y="50" width="42" height="13" rx="6.5" />
          <rect x="56" y="61" width="38" height="12" rx="6" />
        </g>
        <!-- Fingertips -->
        <g :fill="SKIN">
          <circle cx="60" cy="56" r="5.5" />
          <circle cx="72" cy="56" r="5.5" />
          <circle cx="84" cy="56" r="5.5" />
        </g>
        <!-- Thumb wrapped over the fingers -->
        <path
          d="M52,44 C46,46 42,50 42,55 C42,60 46,63 50,61 C54,59 56,53 56,49 C56,46 54,43 52,44 Z"
          :fill="SKIN"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.remote-hand {
  position: fixed;
  z-index: 2100;
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
.press-finger {
  transition: transform 0.18s ease;
}
.remote-hand.press .thumb {
  transform: translateY(4px);
}
.remote-hand.press .press-finger {
  transform: translateY(5px);
}
.yank-motion {
  transition: transform 0.22s cubic-bezier(0.5, 0, 0.8, 0.4);
}
.remote-hand.yank-pull .yank-motion {
  transform: translateY(26px);
}
@media (prefers-reduced-motion: reduce) {
  .remote-hand {
    transition: none;
  }
}
</style>
