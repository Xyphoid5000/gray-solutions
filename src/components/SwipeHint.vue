<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { hasSwiped } from '../lib/ui';

const route = useRoute();

const show = computed(() => !hasSwiped.value);
const label = computed(() =>
  route.path === '/' ? 'swipe to open the book' : 'swipe to turn the page',
);
</script>

<template>
  <Transition name="hint">
    <div v-if="show" class="swipe-hint" aria-hidden="true">
      <span class="swipe-arrow left">&larr;</span>
      <span>{{ label }}</span>
      <span class="swipe-arrow right">&rarr;</span>
    </div>
  </Transition>
</template>
