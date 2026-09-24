<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { neighbor } from '../router';

const route = useRoute();

// A curling corner whispers "there's another page" — only where one
// exists, and never on the cover (the book itself is the invitation).
const show = computed(
  () => route.path !== '/' && !!neighbor(route.path, 1),
);
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="curl-layer" aria-hidden="true">
      <div class="curl-hint top"><div class="curl-fold"></div></div>
      <div class="curl-hint bottom"><div class="curl-fold"></div></div>
    </div>
  </Transition>
</template>
