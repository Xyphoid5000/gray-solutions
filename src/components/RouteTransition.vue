<script setup lang="ts">
// Full-screen paper wipe between routes. The router guard in App.vue
// drives it: paper covers the old page, the route name types out
// (Finale-style, with the blinking type-cursor), then the paper lifts
// on the new page.
defineProps<{
  active: boolean;
  typed: string;
  done: boolean;
}>();
</script>

<template>
  <div class="route-paper" :class="{ on: active }" aria-hidden="true">
    <div class="route-paper-inner">
      <span class="route-paper-label">{{ typed }}</span><span class="type-cursor" :class="{ done }"></span>
    </div>
  </div>
</template>
