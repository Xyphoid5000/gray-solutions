<script setup lang="ts">
import { computed, ref } from 'vue';
import Bookshelf from './Bookshelf.vue';
import BookView from './BookView.vue';
import { useOfficeStore } from '../stores/office';

const office = useOfficeStore();
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
  display: flex;
  align-items: center;
  justify-content: center;
  /* Flat wall with plants and a window behind the bookcase. */
  background:
    url('/office-wall.jpg') center / cover no-repeat,
    #141009;
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
