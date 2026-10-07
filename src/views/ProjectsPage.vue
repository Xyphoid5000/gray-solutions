<script setup lang="ts">
import ChapterHeading from '../components/ChapterHeading.vue';
import ProjectShowcase from '../components/ProjectShowcase.vue';
import { PROJECTS } from '../lib/projects';
</script>

<template>
  <div class="page">
    <section class="projects-section" aria-label="Projects">
      <div class="wrap">
        <ChapterHeading
          index="P"
          kicker="Projects"
          title="Selected <em>work.</em>"
        />
        <p v-reveal class="contact-sub projects-lede">
          Every project below is a story with a plot — the business, the
          build, and how the story got written.
        </p>
        <div class="projects-list">
          <ProjectShowcase
            v-for="(project, i) in PROJECTS"
            :key="project.slug"
            v-reveal
            :project="project"
            :class="{ flip: i % 2 === 1 }"
          />
        </div>
      </div>
    </section>
  </div>
</template>
