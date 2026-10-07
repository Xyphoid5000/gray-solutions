<script setup lang="ts">
import { computed, ref } from 'vue';
import Bookshelf from './Bookshelf.vue';
import BookView from './BookView.vue';
import { useOfficeStore } from '../stores/office';
import { useBonusStore } from '../stores/bonus';

const office = useOfficeStore();
const bonus = useBonusStore();

/** Reactive dark-mode flag (synced from html[data-theme]). */
const isDark = ref(document.documentElement.dataset.theme === 'dark');
let themeObs = null;
if (typeof MutationObserver !== 'undefined') {
  themeObs = new MutationObserver(() => {
    isDark.value = document.documentElement.dataset.theme === 'dark';
  });
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

/** Reactive mobile flag — small screens get the short-candle mural
    variants so the desk keeps its depth perception. */
const isMobileBg = ref(
  typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches,
);
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'undefined') {
  const mq = window.matchMedia('(max-width: 640px)');
  const onMq = (e: MediaQueryListEvent) => { isMobileBg.value = e.matches; };
  if (typeof mq.addEventListener !== 'undefined') mq.addEventListener('change', onMq);
  else mq.addListener(onMq);
}

/** Background mural:
    - Bonus on: candle variants (unlit by day, lit by night).
    - Bonus off: theme-matched wall, never a candle. */
const shelfBg = computed(() => {
  const dark = isDark.value;
  const mobile = isMobileBg.value;
  let file: string;
  if (bonus.enabled && !bonus.candleGone) {
    if (mobile) {
      file = dark ? 'office-wall-night-candle-lit-mobile.jpg' : 'office-wall-day-candle-mobile.jpg';
    } else {
      file = dark ? 'office-wall-night-candle-lit.jpg' : 'office-wall-day-candle.jpg';
    }
  } else if (mobile && dark) {
    file = 'office-wall-night-mobile.jpg';
  } else {
    file = dark ? 'office-wall-night.jpg' : 'office-wall-day.jpg';
  }
  return `url('/${file}') center / cover no-repeat`;
});
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
      <div class="office-slide office-shelf" aria-label="Bookshelf" :style="{ background: shelfBg }">
        <Bookshelf
          :backdrop="!office.manuscriptBound"
          :interactive="true"
          :show-manuscript="!office.manuscriptBound"
          @open-book="$emit('open-book')"
        />
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
  /* Background set via inline style (shelfBg computed). */
  background-color: #141009;
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


