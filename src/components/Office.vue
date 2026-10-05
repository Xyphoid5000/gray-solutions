<script setup lang="ts">
import { computed, ref } from 'vue';
import Bookshelf from './Bookshelf.vue';
import BookView from './BookView.vue';
import { useOfficeStore } from '../stores/office';
import { useBonusStore } from '../stores/bonus';

const office = useOfficeStore();
const bonus = useBonusStore();
const bookViewRef = ref<InstanceType<typeof BookView> | null>(null);

defineEmits(['open-book', 'back-to-cover', 'back-to-cover-section', 'finale-contact']);

/** Expose the BookView for App.vue (e.g., tossCurrentToPile during binding). */
defineExpose({ bookView: bookViewRef });

/** The carousel track shifts up when the desk is active. */
const trackClass = computed(() => ({
  'show-desk': office.view === 'desk',
}));
</script>

<template>
  <div class="office">
    <div class="office-track" :class="trackClass">
      <!-- Shelf view: the bookshelf (backdrop or interactive when bound). -->
      <div class="office-slide office-shelf" aria-label="Bookshelf">
        <Bookshelf
          :backdrop="!office.manuscriptBound"
          :interactive="true"
          :show-manuscript="!office.manuscriptBound"
          @open-book="$emit('open-book')"
        />
        <!-- Bonus candle on the background desk. -->
        <div
          v-if="bonus.enabled && !bonus.candleGone"
          class="shelf-candle"
          aria-hidden="true"
        ></div>
        <!-- Cover manuscript overlay (home page hero) when not bound. -->
        <div
          v-if="!office.manuscriptBound"
          class="office-cover"
          :class="{ 'is-hiding': office.transitioning }"
        >
          <slot name="cover" />
        </div>
      </div>
      <!-- Desk view: the manuscript BookView with all desk props. -->
      <div class="office-slide office-desk" aria-label="Desk">
        <BookView
          ref="bookViewRef"
          @back-to-cover="$emit('back-to-cover')"
          @back-to-cover-section="$emit('back-to-cover-section', $event)"
          @finale-contact="$emit('finale-contact')"
        >
          <template #desk-props>
            <slot name="desk-props" />
          </template>
        </BookView>
      </div>
    </div>
  </div>
</template>

<style scoped>
.office {
  position: relative;
  height: calc(100svh - var(--nav-h));
  margin-top: var(--nav-h);
  overflow: hidden;
  background: #0d0a06;
}
.office-track {
  height: 200%;
  transition: transform 1.6s cubic-bezier(0.65, 0, 0.35, 1);
  will-change: transform;
}
.office-track.show-desk {
  transform: translateY(-50%);
}
.office-slide {
  height: 50%;
  position: relative;
  overflow: hidden;
  /* The desk's real height — props position themselves against this,
     not the viewport, so they survive the header offset. */
  --desk-h: calc(100svh - var(--nav-h));
}
/* During binding the header hides — the office takes the full viewport. */
.binding-active .office {
  height: 100svh;
  margin-top: 0;
}
.binding-active .office-slide {
  --desk-h: 100svh;
}
.office-desk {
  overflow: hidden;
}
.office-shelf {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Flat wall with plants and a window behind the bookcase. */
  background:
    url('/office-wall-day.jpg') center / cover no-repeat,
    #141009;
}

.night-sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #060a18 0%, #0d1530 60%, #16204a 100%);
}
/* Stars: layered radial gradients for a scattered night sky. */
.night-sky::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(1.5px 1.5px at 20% 30%, #fff 100%, transparent 100%),
    radial-gradient(1px 1px at 60% 15%, #fff 100%, transparent 100%),
    radial-gradient(2px 2px at 80% 45%, #fff 100%, transparent 100%),
    radial-gradient(1px 1px at 35% 60%, #fff 100%, transparent 100%),
    radial-gradient(1.5px 1.5px at 70% 75%, #fff 100%, transparent 100%),
    radial-gradient(1px 1px at 15% 80%, #fff 100%, transparent 100%),
    radial-gradient(2px 2px at 45% 25%, #ffe9c4 100%, transparent 100%),
    radial-gradient(1px 1px at 90% 20%, #fff 100%, transparent 100%);
  opacity: 0.9;
}
/* Window crossbars. */
.night-sky::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent 48%, #2a1f14 48%, #2a1f14 52%, transparent 52%),
    linear-gradient(0deg, transparent 48%, #2a1f14 48%, #2a1f14 52%, transparent 52%);
}
/* Let the library show through around the case. */
.office-shelf :deep(.bookshelf-hero) {
  background: transparent;
}
.office-cover {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
}
.office-cover.is-hiding {
  opacity: 0;
  pointer-events: none;
}
.office-cover > * {
  pointer-events: auto;
}
.office-cover.is-hiding > * {
  pointer-events: none;
}
</style>

<style>
/* Theme-based background swap (non-scoped: html selector). */
html[data-theme='dark'] .office-scene {
  background: url('/office-wall-night.jpg') center / cover no-repeat, #0a0d14;
}
</style>

<style>
/* Bonus candle sitting on the background desk. */
.shelf-candle {
  position: absolute;
  left: 38%;
  bottom: 18%;
  width: 16px;
  height: 64px;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(180deg, #e8dcc0 0%, #c9b896 100%);
  border-radius: 3px 3px 0 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
.shelf-candle::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -16px;
  width: 12px;
  height: 18px;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at 50% 70%, #ffd97a 0%, #ff9a3c 60%, transparent 70%);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  animation: shelf-flicker 1.2s ease-in-out infinite alternate;
}
@keyframes shelf-flicker {
  from { transform: translateX(-50%) scale(1); opacity: 1; }
  to { transform: translateX(-50%) scale(1.08); opacity: 0.92; }
}
</style>
