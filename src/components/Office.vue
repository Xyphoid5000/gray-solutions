<script setup lang="ts">
import { computed } from 'vue';
import Bookshelf from './Bookshelf.vue';
import BookView from './BookView.vue';
import { useOfficeStore } from '../stores/office';

const office = useOfficeStore();

defineEmits(['open-book', 'back-to-cover', 'back-to-cover-section', 'finale-contact']);

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
          :interactive="office.manuscriptBound"
          :show-manuscript="!office.manuscriptBound"
          @open-book="$emit('open-book')"
        />
        <!-- Cover manuscript overlay (home page hero) when not bound. -->
        <div v-if="!office.manuscriptBound" class="office-cover">
          <slot name="cover" />
        </div>
      </div>
      <!-- Desk view: the manuscript BookView with all desk props. -->
      <div class="office-slide office-desk" aria-label="Desk">
        <BookView
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
  height: 100vh;
  overflow: hidden;
  background: #0d0a06;
}
.office-track {
  height: 200vh;
  transition: transform 1.6s cubic-bezier(0.65, 0, 0.35, 1);
  will-change: transform;
}
.office-track.show-desk {
  transform: translateY(-100vh);
}
.office-slide {
  height: 100vh;
  position: relative;
  overflow: hidden;
}
.office-shelf {
  display: flex;
  align-items: center;
  justify-content: center;
}
.office-cover {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.office-cover > * {
  pointer-events: auto;
}
</style>
