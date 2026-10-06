<script setup lang="ts">
// One project, fully told: the live site framed in a laptop screen, what
// it is, what it was built with, and how the story was written. Used in
// the book's proof exhibits (inside ProjectModal) and on /projects.
import type { Project } from '../lib/projects';

defineProps<{ project: Project }>();
</script>

<template>
  <article class="project-showcase" :aria-label="project.name">
    <div class="device" role="img" :aria-label="project.imageAlt">
      <div class="device-bar" aria-hidden="true">
        <span class="device-dot"></span>
        <span class="device-dot"></span>
        <span class="device-dot"></span>
        <span class="device-url">{{ project.url.replace('https://', '') }}</span>
      </div>
      <div class="device-screen">
        <img :src="project.image" :alt="''" loading="lazy" />
      </div>
      <div class="device-base" aria-hidden="true"></div>
    </div>
    <div class="project-body">
      <p class="ch-kicker">{{ project.kicker }}</p>
      <h3 class="project-name">{{ project.name }}</h3>
      <p class="project-desc">{{ project.description }}</p>
      <h4 class="project-subhead">Built with</h4>
      <ul class="proof-tags project-tech">
        <li v-for="t in project.tech" :key="t">{{ t }}</li>
      </ul>
      <h4 class="project-subhead">How the story was written</h4>
      <p class="project-story">{{ project.story }}</p>
      <a class="btn btn-ghost project-visit" :href="project.url" target="_blank" rel="noopener">
        Visit the site <span class="arrow" aria-hidden="true">&rarr;</span>
      </a>
    </div>
  </article>
</template>
