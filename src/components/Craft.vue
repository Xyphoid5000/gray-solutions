<script setup lang="ts">
import { onMounted } from 'vue';
import ChapterHeading from './ChapterHeading.vue';

const services = [
  {
    num: 'i.',
    title: 'Story-first design',
    copy: 'Narrative structure before pixels. We find the story your business is already telling &mdash; then design the site around it, so every section earns the next scroll.',
    tags: ['Art direction', 'Copy structure', 'UX'],
  },
  {
    num: 'ii.',
    title: 'Custom development',
    copy: 'Hand-built with Vue 3 and TypeScript. Fast, accessible, and easy to grow &mdash; no bloated themes, no page-builder cruft, no plugins fighting each other at 2am.',
    tags: ['Vue 3', 'TypeScript', 'GSAP'],
  },
  {
    num: 'iii.',
    title: 'Backends & APIs',
    copy: 'The machinery behind the story: C# / .NET services, databases, and integrations that keep everything running quietly while the front page takes the bow.',
    tags: ['C# / .NET', 'SQL', 'Integrations'],
  },
  {
    num: 'iv.',
    title: 'Rebuilds & rescues',
    copy: 'Stuck with a template that never fit? I rebuild tired sites into something with a pulse &mdash; same business, an entirely different first impression.',
    tags: ['Redesign', 'Migration', 'Performance'],
  },
];

onMounted(() => {
  // Cursor-tracked ember glow on each card — the light follows the reader.
  document.querySelectorAll<HTMLElement>('.craft-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
});
</script>

<template>
  <section id="craft" class="chapter" aria-label="Chapter 2 — The craft">
    <div class="wrap">
      <ChapterHeading
        index="02"
        kicker="Chapter Two &mdash; The Craft"
        title="What I <em>actually do.</em>"
      />
      <p v-reveal class="lede" style="margin-bottom: 3rem">
        Four disciplines, one obsession: a website that reads like it was
        written, not assembled.
      </p>
      <div class="craft-grid">
        <article
          v-for="(s, i) in services"
          :key="s.title"
          v-reveal="(i % 2) * 0.1"
          class="craft-card snap-card"
        >
          <span class="craft-num">{{ s.num }}</span>
          <h3>{{ s.title }}</h3>
          <p v-html="s.copy"></p>
          <ul class="craft-tags">
            <li v-for="tag in s.tags" :key="tag">{{ tag }}</li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>
