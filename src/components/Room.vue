<script setup lang="ts">
import Bookshelf from './Bookshelf.vue';
import BookView from './BookView.vue';

withDefaults(
  defineProps<{
    /** Bookshelf mode: backdrop scenery, or interactive. */
    shelfBackdrop?: boolean;
    shelfInteractive?: boolean;
    showManuscript?: boolean;
    /** Show the BookView on the desk. */
    showBook?: boolean;
    bonusContent?: boolean;
  }>(),
  {
    shelfBackdrop: false,
    shelfInteractive: false,
    showManuscript: true,
    showBook: false,
    bonusContent: false,
  },
);

defineEmits(['open-book']);
</script>

<template>
  <div class="room">
    <div class="room-shelf">
      <Bookshelf
        :backdrop="shelfBackdrop"
        :interactive="shelfInteractive"
        :show-manuscript="showManuscript"
        @open-book="$emit('open-book')"
      />
    </div>
    <div v-if="showBook" class="room-desk">
      <BookView>
        <template #desk-props>
          <slot name="desk-props" />
        </template>
      </BookView>
    </div>
  </div>
</template>

<style scoped>
.room {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  will-change: transform;
}
.room-shelf {
  height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d0a06;
}
.room-desk {
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: #0d0a06;
}
</style>
