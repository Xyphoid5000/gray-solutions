<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { chapters } from '../lib/chapters';

defineProps<{ bitten?: boolean }>();

const settings = useSettingsStore();

/** Chapter short names for the toppings, derived from the real chapters. */
const chapterNames = computed(() =>
  chapters.map((c) => {
    const parts = c.label.split('—');
    return (parts.length > 1 ? parts[1] : c.label).trim();
  }),
);
/** Topping colors, top chapter first. */
const toppingColors = ['#e8c96a', '#d9534f', '#7fb069', '#8e244d', '#a85b3f'];
</script>

<template>
  <div class="booksw" role="img" :aria-label="`${settings.siteName} as a sandwich: no pages, just chapters`">
    <div class="swb-bun swb-bun-top" :class="{ bitten }">
      <span class="swb-mark">{{ settings.logoMark }}</span>
      <span class="swb-title">{{ settings.siteName }}</span>
    </div>
    <div
      v-for="(name, i) in chapterNames"
      :key="name"
      class="swb-layer"
      :style="{ background: toppingColors[i % toppingColors.length] }"
    >
      <span class="swb-ch">{{ name }}</span>
    </div>
    <div class="swb-bun swb-bun-bottom"></div>
  </div>
</template>

<style scoped>
.booksw {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  width: min(300px, 78vw);
}
.swb-bun {
  background: linear-gradient(180deg, #e0aa5e 0%, #c98f45 60%, #a87434 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(20, 12, 6, 0.92);
  box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.25), inset 0 2px 3px rgba(255, 255, 255, 0.25);
}
.swb-bun-top {
  min-height: 64px;
  border-radius: 120px 120px 14px 14px;
  position: relative;
}
.swb-bun-top::before {
  content: '';
  position: absolute;
  inset: 8px 22px;
  background-image: radial-gradient(ellipse 5px 3px at 50% 50%, #f7e3b8 60%, transparent 61%);
  background-size: 26px 12px;
  opacity: 0.8;
  pointer-events: none;
}
/* The bite: scalloped circles of the backdrop color along the top edge. */
.swb-bun-top.bitten::after {
  content: '';
  position: absolute;
  top: -10px;
  right: 26px;
  width: 34px;
  height: 30px;
  border-radius: 50%;
  background: var(--swb-backdrop, #0b0705);
  box-shadow:
    26px 8px 0 4px var(--swb-backdrop, #0b0705),
    52px 4px 0 0 var(--swb-backdrop, #0b0705);
}
.swb-bun-bottom {
  min-height: 30px;
  border-radius: 10px 10px 26px 26px;
}
.swb-mark {
  font-weight: 800;
  font-size: 1.4rem;
  position: relative;
}
.swb-title {
  font-weight: 700;
  font-size: 1rem;
  position: relative;
}
.swb-layer {
  border-radius: 16px;
  min-height: 38px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(20, 12, 6, 0.92);
  box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.25), inset 0 2px 3px rgba(255, 255, 255, 0.25);
}
.swb-ch {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
}
</style>
