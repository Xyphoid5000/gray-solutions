<script setup lang="ts">
/**
 * The LED remote. It lives on the desk, always. Color dots re-tint
 * the LED wash, the power button toggles the LEDs on and off.
 */
defineProps<{
  ledOn: boolean;
  color: string;
}>();
const emit = defineEmits<{
  power: [];
  setColor: [hex: string];
}>();

const COLORS = [
  { name: 'blue', hex: '#2f6bff' },
  { name: 'red', hex: '#ff3b30' },
  { name: 'green', hex: '#34e07a' },
  { name: 'purple', hex: '#a86bff' },
  { name: 'amber', hex: '#ffb02e' },
  { name: 'white', hex: '#eef2ff' },
];
</script>

<template>
  <div
    class="remote-control"
    role="group"
    aria-label="LED remote control"
  >
    <span
      class="remote-status"
      :style="{
        background: ledOn ? color : '#5a2323',
        boxShadow: ledOn ? `0 0 6px ${color}` : 'none',
      }"
      aria-hidden="true"
    ></span>
    <button
      type="button"
      class="remote-power"
      :aria-label="ledOn ? 'Turn off the LEDs' : 'Turn on the LEDs'"
      @click="emit('power')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4v8" stroke-linecap="round" />
        <path d="M6.4 7.2a7.5 7.5 0 1 0 11.2 0" fill="none" stroke-linecap="round" />
      </svg>
    </button>
    <div class="remote-colors" role="group" aria-label="LED colors">
      <button
        v-for="c in COLORS"
        :key="c.hex"
        type="button"
        class="swatch"
        :class="{ active: color === c.hex }"
        :style="{ background: c.hex }"
        :disabled="!ledOn"
        :aria-label="`Set LEDs to ${c.name}`"
        @click="emit('setColor', c.hex)"
      ></button>
    </div>
  </div>
</template>

<style scoped>
.remote-control {
  position: absolute;
  /* Same lane math as the clutter: the desk-stage's containing block
     starts after the desk's left padding, so the lane offset is
     subtracted back out to land on the real wooden lane. */
  left: calc(38px - var(--desk-pl));
  top: 52svh;
  width: 54px;
  z-index: 850;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 9px 6px 11px;
  background: linear-gradient(180deg, #2e3238, #1c1f24);
  border: 1px solid rgba(0, 0, 0, 0.55);
  border-radius: 12px;
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transform: rotate(4deg);
}
.remote-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background 0.3s ease;
}
.remote-power {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid #101216;
  background: radial-gradient(circle at 35% 30%, #4a5058, #2a2e34 70%);
  color: #ff8d7c;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
}
.remote-power svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
}
.remote-power:disabled {
  cursor: default;
  opacity: 0.5;
}
.remote-power:not(:disabled):hover {
  transform: scale(1.1);
}
.remote-power:not(:disabled):active {
  transform: scale(0.94);
}
.remote-colors {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.swatch {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.16);
  padding: 0;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.swatch.active {
  border-color: #fff;
  box-shadow: 0 0 7px rgba(255, 255, 255, 0.55);
}
.swatch:not(:disabled):hover {
  transform: scale(1.18);
}
.swatch:disabled {
  cursor: default;
}
/* UV: the remote sits cold under blacklight, like everything else. */
html[data-blacklight='on'] .remote-control {
  opacity: 0.6;
}

@media (max-width: 640px) {
  .remote-control {
    left: calc(17px - var(--desk-pl));
    top: 48svh;
    width: 42px;
    gap: 5px;
    padding: 7px 5px 9px;
    border-radius: 10px;
  }
  .remote-power {
    width: 19px;
    height: 19px;
  }
  .remote-power svg {
    width: 10px;
    height: 10px;
  }
  .swatch {
    width: 11px;
    height: 11px;
    border-width: 1.5px;
  }
  .remote-colors {
    gap: 5px;
  }
}
</style>
