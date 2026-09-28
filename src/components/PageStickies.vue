<script setup lang="ts">
/**
 * Sticky notes stuck to the manuscript page itself — a different spot on
 * every chapter, like someone left themselves notes while drafting. They
 * live inside .page-paper, so they ride along when the page flips into
 * the pile.
 */
import { computed } from 'vue';

const props = defineProps<{
  pageIndex: number;
}>();

interface Spot {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  rot: string;
}

const SPOTS: Array<{ yellow: Spot; pink: Spot }> = [
  {
    yellow: { top: '150px', right: '-10px', rot: '8deg' },
    pink: { top: '620px', left: '-12px', rot: '-6deg' },
  },
  {
    yellow: { top: '320px', left: '-14px', rot: '-10deg' },
    pink: { top: '90px', left: '28px', rot: '5deg' },
  },
  {
    yellow: { top: '460px', right: '-8px', rot: '-7deg' },
    pink: { top: '94px', right: '34px', rot: '9deg' },
  },
  {
    yellow: { top: '88px', left: '-10px', rot: '-5deg' },
    pink: { top: '380px', right: '-12px', rot: '7deg' },
  },
  {
    yellow: { top: '420px', left: '24px', rot: '6deg' },
    pink: { top: '560px', right: '-10px', rot: '-8deg' },
  },
];

const spots = computed(() => SPOTS[props.pageIndex] ?? SPOTS[0]);

function styleFor(s: Spot): Record<string, string> {
  const out: Record<string, string> = { transform: `rotate(${s.rot})` };
  if (s.top !== undefined) out.top = s.top;
  if (s.left !== undefined) out.left = s.left;
  if (s.right !== undefined) out.right = s.right;
  if (s.bottom !== undefined) out.bottom = s.bottom;
  return out;
}
</script>

<template>
  <div class="page-stickies" aria-hidden="true">
    <div class="page-sticky" :style="styleFor(spots.yellow)">
      <svg viewBox="0 0 36 36">
        <rect x="2" y="2" width="32" height="32" rx="1.5" class="sticky-paper s-yellow" />
        <path d="M34 26 L26 34 L34 34 Z" class="sticky-curl" />
        <line x1="8" y1="12" x2="28" y2="12" class="sticky-line" />
        <line x1="8" y1="18" x2="24" y2="18" class="sticky-line" />
      </svg>
    </div>
    <div class="page-sticky" :style="styleFor(spots.pink)">
      <svg viewBox="0 0 36 36">
        <rect x="2" y="2" width="32" height="32" rx="1.5" class="sticky-paper s-pink" />
        <path d="M34 26 L26 34 L34 34 Z" class="sticky-curl" />
        <line x1="8" y1="12" x2="28" y2="12" class="sticky-line" />
        <line x1="8" y1="18" x2="24" y2="18" class="sticky-line" />
        <line x1="8" y1="24" x2="20" y2="24" class="sticky-line" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.page-stickies {
  display: contents;
}
.page-sticky {
  position: absolute;
  z-index: 20;
  width: 54px;
  pointer-events: none;
  filter: drop-shadow(0 4px 5px rgba(60, 40, 10, 0.3));
}
.page-sticky svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}
.sticky-paper {
  stroke: rgba(60, 45, 10, 0.3);
  stroke-width: 1;
}
.s-yellow { fill: #f5df6b; }
.s-pink { fill: #f2a7c3; }
.sticky-curl {
  fill: rgba(0, 0, 0, 0.12);
}
.sticky-line {
  stroke: rgba(90, 70, 30, 0.4);
  stroke-width: 1.4;
  stroke-linecap: round;
}

@media (max-width: 640px) {
  .page-sticky {
    width: 42px;
  }
}
</style>
