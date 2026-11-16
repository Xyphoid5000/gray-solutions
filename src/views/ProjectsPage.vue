<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ChapterHeading from '../components/ChapterHeading.vue';
import ProjectShowcase from '../components/ProjectShowcase.vue';
import { getProject, PROJECTS, type Project } from '../lib/projects';
import { loadFeaturedProjects } from '../lib/featured';

/** The featured list from the database replaces the static client
    entries wholesale; the portfolio-itself entry always stays
    static, appended last. A failed or empty lookup keeps the
    hardcoded list exactly as it renders today. */
const dbProjects = ref<Project[] | null>(null);
onMounted(async () => {
  const rows = await loadFeaturedProjects('page');
  if (rows) {
    const portfolio = getProject('gray-solutions');
    dbProjects.value = portfolio ? [...rows, portfolio] : rows;
  }
});
const projects = computed(() => dbProjects.value ?? PROJECTS);
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
            v-for="(project, i) in projects"
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
