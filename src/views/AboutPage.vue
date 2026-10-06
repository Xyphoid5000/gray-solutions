<script setup lang="ts">
import AboutMe from '../components/AboutMe.vue';
</script>

<template>
  <div class="page">
    <section v-reveal id="about" class="about-section" aria-label="About me">
      <div class="wrap">
        <AboutMe />
      </div>
    </section>
  </div>
</template>
