<script setup lang="ts">
import { siteConfig } from '../config';

const stack = ['C#', '.NET', 'Vue 3', 'TypeScript', 'GSAP', 'Three.js', 'SQL', 'Vite'];
</script>

<template>
  <section id="about" class="section">
    <div class="container about-grid">
      <div v-reveal>
        <p class="eyebrow">About</p>
        <h2>The developer behind the story</h2>
        <p>
          I&rsquo;m Chris &mdash; a full-stack developer by day, working across
          C# and Vue to ship real software for real users. Gray Solutions is
          where I get to aim that engineering discipline at something more
          ambitious: websites that don&rsquo;t just inform, but captivate.
        </p>
        <p>
          My edge is creative storytelling through the web. I picked up GSAP
          building my first client-style project and never looked back &mdash;
          motion, pacing, and interaction are now as much a part of my toolkit
          as APIs and databases. I love learning in public on every build, and
          every project teaches the next one something new.
        </p>
        <p class="about-location">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {{ siteConfig.location }}
        </p>
      </div>
      <div v-reveal="0.15" class="about-card">
        <h3>Daily toolkit</h3>
        <div class="chips">
          <span v-for="t in stack" :key="t" class="chip">{{ t }}</span>
        </div>
        <p class="about-note">
          Full-stack foundations, front-of-the-front-end obsession. The boring
          parts stay boring &mdash; fast, accessible, maintainable &mdash; so
          the creative parts can be unforgettable.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-grid {
  display: grid;
  grid-template-columns: 1.25fr 0.85fr;
  gap: clamp(2rem, 5vw, 4.5rem);
  align-items: start;
}

.about-location {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--silver);
  font-weight: 500;
  margin-top: 0.4rem;
}

.about-location svg {
  color: var(--blue);
}

.about-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 1.2rem;
  padding: 2rem;
}

.about-card h3 {
  font-size: 1.05rem;
  margin-bottom: 1.2rem;
  letter-spacing: 0.04em;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-bottom: 1.4rem;
}

.chip {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--silver);
  background: rgba(47, 155, 255, 0.08);
  border: 1px solid rgba(47, 155, 255, 0.22);
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
}

.about-note {
  font-size: 0.94rem;
  margin: 0;
}

@media (max-width: 860px) {
  .about-grid {
    grid-template-columns: 1fr;
  }
}
</style>
