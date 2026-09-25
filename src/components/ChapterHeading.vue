<script setup lang="ts">
defineProps<{
  index: string;
  kicker: string;
  /** Title may contain <em> markup for the ember italic accent. */
  title: string;
}>();
</script>

<template>
  <div class="ch-head">
    <span class="ch-num" aria-hidden="true">{{ index }}</span>
    <p v-reveal class="ch-kicker">{{ kicker }}</p>
    <h2 v-reveal="0.08" class="ch-title" v-html="title"></h2>
  </div>
</template>
