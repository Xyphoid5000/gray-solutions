<script setup lang="ts">
/**
 * A hand holding the LED remote, used in the lights rituals: when the
 * lights go out it slides in from the left edge, thumbs the power
 * button (blue blooms), and leaves the remote on the desk; when the
 * lights come back on it returns, grabs the remote, and takes it away.
 * Positioned by the parent from the remote's live bounding rect.
 */
defineProps<{
  /** Viewport coords of the remote's center — the gripped remote lands here. */
  x: number;
  y: number;
  /** True once the hand has slid in to the remote's spot. */
  arrived: boolean;
  /** False while collecting, before the grab. */
  holding: boolean;
  /** True on the beat the thumb hits the power button. */
  press: boolean;
}>();
</script>

<template>
  <div
    class="remote-hand"
    :class="{ arrived }"
    :style="{ left: `${x - 148}px`, top: `${y - 57}px` }"
    aria-hidden="true"
  >
    <svg viewBox="0 0 220 130">
      <defs>
        <radialGradient id="rh-standby" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ff5a4e" stop-opacity="0.75" />
          <stop offset="100%" stop-color="#ff5a4e" stop-opacity="0" />
        </radialGradient>
      </defs>
      <!-- sleeve -->
      <rect x="-6" y="28" width="54" height="74" rx="12" class="rh-sleeve" />
      <rect x="40" y="34" width="16" height="62" rx="7" class="rh-cuff" />
      <!-- palm -->
      <rect x="50" y="40" width="48" height="56" rx="22" class="rh-skin" />
      <!-- the remote, gripped in the fist, pointing right -->
      <g v-if="holding" class="rh-remote" :class="{ press }">
        <rect x="92" y="42" width="108" height="30" rx="9" class="rh-remote-body" />
        <!-- standby LED glows red in the dark -->
        <circle cx="106" cy="52" r="10" fill="url(#rh-standby)" />
        <circle cx="106" cy="52" r="3" class="rh-standby" />
        <!-- power button under the thumb -->
        <circle cx="184" cy="52" r="6.5" class="rh-power" />
        <!-- color dots -->
        <circle cx="126" cy="63" r="4" fill="#2f6bff" />
        <circle cx="138" cy="63" r="4" fill="#ff3b30" />
        <circle cx="150" cy="63" r="4" fill="#34e07a" />
      </g>
      <!-- fingers curled over the grip -->
      <rect x="60" y="48" width="12" height="34" rx="6" class="rh-skin-dark" />
      <rect x="74" y="48" width="12" height="34" rx="6" class="rh-skin-dark" />
      <rect x="88" y="48" width="12" height="34" rx="6" class="rh-skin-dark" />
      <!-- thumb resting by the power button -->
      <ellipse
        cx="176"
        cy="42"
        rx="17"
        ry="10"
        class="rh-skin"
        transform="rotate(-14 176 42)"
      />
    </svg>
  </div>
</template>

<style scoped>
.remote-hand {
  position: fixed;
  z-index: 2100;
  width: 220px;
  pointer-events: none;
  /* Parked off the left edge; slides in so the gripped remote meets
     the remote's spot on the desk. */
  transform: translateX(-300px);
  transition: transform 0.9s cubic-bezier(0.3, 0.7, 0.3, 1);
}
.remote-hand.arrived {
  transform: translateX(0);
}
.remote-hand svg {
  width: 100%;
  display: block;
  overflow: visible;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
}
.rh-skin {
  fill: #e8b58c;
}
.rh-skin-dark {
  fill: #d69a6e;
}
.rh-sleeve {
  fill: #3a4a5a;
}
.rh-cuff {
  fill: #2c3947;
}
.rh-remote-body {
  fill: #23262b;
  stroke: rgba(0, 0, 0, 0.6);
  stroke-width: 1.5;
}
.rh-standby {
  fill: #ff6a5e;
}
.rh-power {
  fill: #3a3f47;
  stroke: #ff8d7c;
  stroke-width: 1.5;
}
/* The thumb's press: a quick dip of the gripped remote. */
.rh-remote.press {
  animation: rh-press 0.22s ease;
}
@keyframes rh-press {
  0% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(7px);
  }
  100% {
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .remote-hand {
    transition: none;
  }
}
</style>
