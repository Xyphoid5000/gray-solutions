<script setup lang="ts">
import AboutMe from '../components/AboutMe.vue';
import ChapterHeading from '../components/ChapterHeading.vue';
</script>

<template>
  <div class="page">
    <section v-reveal id="about" class="about-section" aria-label="About me">
      <div class="wrap">
        <ChapterHeading
          index="A"
          kicker="About"
          title="The guy behind the <em>book.</em>"
        />
        <AboutMe />
      </div>
    </section>
  </div>
</template>
