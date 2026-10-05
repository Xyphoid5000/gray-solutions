<script setup lang="ts">
import { useSettingsStore } from '../stores/settings';

/**
 * One sandwich ingredient, page-sized, in the BookSandwich visual
 * language (rounded, inset shadows, sesame bun). Used by BookView in
 * sandwich mode: the cover is the top bun, each chapter page is its
 * topping — pickles, tomato, lettuce, cheese, patty.
 */
defineProps<{
  kind: 'bun-top' | 'pickles' | 'tomato' | 'lettuce' | 'cheese' | 'patty';
  /** Chapter label shown under the topping name. */
  chapter?: string;
  /** Mini version for the pile cover card. */
  compact?: boolean;
}>();

const settings = useSettingsStore();

const TOPPING_NAMES: Record<string, string> = {
  pickles: 'Pickles',
  tomato: 'Tomato',
  lettuce: 'Lettuce',
  cheese: 'Cheese',
  patty: 'The Patty',
};
</script>

<template>
  <div
    class="swi"
    :class="['swi-' + kind, { 'swi-compact': compact }]"
    role="img"
    :aria-label="kind === 'bun-top' ? `${settings.siteName} — top bun` : `${TOPPING_NAMES[kind]} — ${chapter ?? ''}`"
  >
    <template v-if="kind === 'bun-top'">
      <span v-if="!compact" class="swi-mark">{{ settings.logoMark }}</span>
      <span v-if="!compact" class="swi-title">{{ settings.siteName }}</span>
    </template>
    <template v-else>
      <span v-if="!compact" class="swi-topping">{{ TOPPING_NAMES[kind] }}</span>
      <span v-if="!compact && chapter" class="swi-chapter">{{ chapter }}</span>
    </template>
  </div>
</template>

<style scoped>
.swi {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: min(400px, 82%);
  min-height: 280px;
  margin: auto;
  padding: 28px 20px;
  color: rgba(20, 12, 6, 0.92);
  box-shadow:
    inset 0 -6px 14px rgba(0, 0, 0, 0.28),
    inset 0 4px 8px rgba(255, 255, 255, 0.22),
    0 10px 30px rgba(0, 0, 0, 0.35);
}
/* The top bun — same look as the shelf sandwich's bun. */
.swi-bun-top {
  background: linear-gradient(180deg, #e0aa5e 0%, #c98f45 60%, #a87434 100%);
  border-radius: 140px 140px 18px 18px;
  min-height: 220px;
}
.swi-bun-top::before {
  content: '';
  position: absolute;
  inset: 14px 30px;
  background-image: radial-gradient(ellipse 6px 4px at 50% 50%, #f7e3b8 60%, transparent 61%);
  background-size: 30px 14px;
  opacity: 0.8;
  pointer-events: none;
}
.swi-mark {
  font-weight: 800;
  font-size: 2.6rem;
  position: relative;
}
.swi-title {
  font-weight: 700;
  font-size: 1.3rem;
  position: relative;
}
/* Pickles: bumpy green spears. */
.swi-pickles {
  background:
    radial-gradient(circle at 18% 28%, #6da054 0 14px, transparent 15px),
    radial-gradient(circle at 68% 18%, #639a4c 0 11px, transparent 12px),
    radial-gradient(circle at 84% 52%, #6da054 0 13px, transparent 14px),
    radial-gradient(circle at 42% 66%, #5c9347 0 12px, transparent 13px),
    radial-gradient(circle at 12% 78%, #6da054 0 10px, transparent 11px),
    radial-gradient(circle at 58% 88%, #639a4c 0 13px, transparent 14px),
    linear-gradient(180deg, #557f3e 0%, #476f34 100%);
  border-radius: 22px;
}
/* Tomato: ripe red with pale seed arcs. */
.swi-tomato {
  background:
    radial-gradient(ellipse 26px 14px at 30% 40%, rgba(255, 220, 210, 0.35) 60%, transparent 61%),
    radial-gradient(ellipse 22px 12px at 66% 62%, rgba(255, 220, 210, 0.3) 60%, transparent 61%),
    radial-gradient(ellipse 18px 10px at 48% 24%, rgba(255, 220, 210, 0.28) 60%, transparent 61%),
    linear-gradient(180deg, #d9534f 0%, #b83a36 100%);
  border-radius: 26px;
}
/* Lettuce: ruffled light green. */
.swi-lettuce {
  background:
    repeating-linear-gradient(
      100deg,
      rgba(255, 255, 255, 0.14) 0 14px,
      transparent 14px 30px
    ),
    linear-gradient(180deg, #7fb069 0%, #679a55 100%);
  border-radius: 48% 52% 46% 54% / 18px 18px 22px 22px;
}
/* Cheese: golden with holes. */
.swi-cheese {
  background:
    radial-gradient(circle at 24% 30%, #b98a3e 0 12px, transparent 13px),
    radial-gradient(circle at 70% 24%, #c1923f 0 9px, transparent 10px),
    radial-gradient(circle at 82% 58%, #b98a3e 0 14px, transparent 15px),
    radial-gradient(circle at 44% 70%, #c1923f 0 10px, transparent 11px),
    radial-gradient(circle at 16% 76%, #b98a3e 0 8px, transparent 9px),
    linear-gradient(180deg, #e8c96a 0%, #d9ae4e 100%);
  border-radius: 18px;
}
/* The patty: seared brown with a crusty texture. */
.swi-patty {
  background:
    radial-gradient(circle at 30% 34%, #7d4f2c 0 10px, transparent 11px),
    radial-gradient(circle at 64% 28%, #5a3520 0 12px, transparent 13px),
    radial-gradient(circle at 78% 60%, #7d4f2c 0 9px, transparent 10px),
    radial-gradient(circle at 40% 72%, #54331d 0 11px, transparent 12px),
    radial-gradient(circle at 18% 58%, #6e4526 0 8px, transparent 9px),
    linear-gradient(180deg, #6b4226 0%, #54331d 100%);
  border-radius: 20px;
}
.swi-topping {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 1.5rem;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.25);
  position: relative;
}
.swi-chapter {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  opacity: 0.85;
  position: relative;
}
/* Mini bun for the pile cover card. */
.swi-compact {
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0;
  padding: 0;
  border-radius: 60px 60px 8px 8px;
}
.swi-compact.swi-bun-top {
  min-height: 0;
}
.swi-compact.swi-bun-top::before {
  inset: 6px 12px;
  background-size: 16px 8px;
}
</style>
