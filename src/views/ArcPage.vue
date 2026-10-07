<script setup lang="ts">
import StoryArc from '../components/StoryArc.vue';
</script>

<template>
  <div class="page">
    <!-- Scroll-driven: the page scrolls, so the arc uses the original
         scroll-scrubbed pen draw instead of the book's stepped version. -->
    <StoryArc scroll-driven />
  </div>
</template>
