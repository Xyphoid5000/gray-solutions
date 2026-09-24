<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { hasSwiped } from '../lib/ui';

const route = useRoute();

// The cover has its own button — no hint needed there.
const show = computed(() => !hasSwiped.value && route.path !== '/');
</script>

<template>
  <Transition name="hint">
    <div v-if="show" class="swipe-hint" aria-hidden="true">
      <span class="swipe-arrow left">&larr;</span>
      <span>swipe to turn the page</span>
      <span class="swipe-arrow right">&rarr;</span>
    </div>
  </Transition>
</template>
