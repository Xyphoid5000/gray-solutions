<script setup lang="ts">
// Full-screen paper wipe between routes, staged as a chapter heading:
// the sheet lays down in 3D, the route name types out as the chapter
// title (outlined lead letter + kicker), then the sheet lifts off.
defineProps<{
  active: boolean;
  lifting: boolean;
  typed: string;
  done: boolean;
  letter: string;
  kicker: string;
}>();
</script>

<template>
  <div v-if="active" class="route-paper-stage" aria-hidden="true">
    <div class="route-paper" :class="{ lift: lifting }">
      <div class="ch-head route-ch">
        <span class="ch-num" aria-hidden="true">{{ letter }}</span>
        <p class="ch-kicker">{{ kicker }}</p>
        <h2 class="ch-title">
          <span>{{ typed }}</span><span class="type-cursor" :class="{ done }"></span>
        </h2>
      </div>
    </div>
  </div>
</template>
