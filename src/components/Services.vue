<script setup lang="ts">
const services = [
  {
    title: 'Custom Websites',
    tag: 'Designed & built from scratch',
    body: 'No templates, no page-builder compromises. A site designed around your story and engineered to load fast, rank well, and convert visitors.',
    points: ['Bespoke design, not a theme', 'Fast, accessible, SEO-friendly', 'Yours to own outright'],
  },
  {
    title: 'Rebuilds & Modernization',
    tag: 'From sluggish to striking',
    body: 'Still on Squarespace, Wix, or a site from 2016? I rebuild it as lean custom code — same content, radically better speed, feel, and presence.',
    points: ['Squarespace → custom code', 'Performance-first rebuilds', 'Zero content left behind'],
  },
  {
    title: 'Interactive Experiences',
    tag: 'The creative edge',
    body: 'Cinematic intros, scroll-driven storytelling, 3D scenes, motion design. The kind of work people remember — and send to other people.',
    points: ['GSAP motion & choreography', 'Three.js 3D scenes', 'Restrained, purposeful spectacle'],
  },
];
</script>

<template>
  <section id="services" class="section services">
    <div class="container">
      <div v-reveal>
        <p class="eyebrow">Services</p>
        <h2>What I build</h2>
        <p class="services-lede">
          Custom websites are the starting point. Everything below is one
          discipline: turning your idea into something real on the web.
        </p>
      </div>

      <div class="cards">
        <article v-for="(s, i) in services" :key="s.title" v-reveal="i * 0.12" class="card">
          <p class="card-tag">{{ s.tag }}</p>
          <h3>{{ s.title }}</h3>
          <p>{{ s.body }}</p>
          <ul>
            <li v-for="p in s.points" :key="p">{{ p }}</li>
          </ul>
        </article>
      </div>

      <p v-reveal class="services-note">
        Every project is one of one. <a href="#contact">Tell me about yours.</a>
      </p>
    </div>
  </section>
</template>

<style scoped>
.services {
  background: var(--bg-soft);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.services-lede {
  max-width: 38rem;
  font-size: 1.05rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.4rem;
  margin-top: 2.8rem;
}

.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 1.2rem;
  padding: 2rem 1.8rem;
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--blue-deep), var(--blue));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.card:hover {
  transform: translateY(-6px);
  border-color: rgba(47, 155, 255, 0.35);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}

.card:hover::before {
  opacity: 1;
}

.card-tag {
  font-family: var(--font-display);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--blue);
  margin-bottom: 0.7rem;
}

.card h3 {
  font-size: 1.35rem;
  margin-bottom: 0.7rem;
}

.card p {
  font-size: 0.95rem;
}

.card ul {
  list-style: none;
  margin: 1.1rem 0 0;
  padding: 0;
}

.card li {
  font-size: 0.9rem;
  color: var(--silver);
  padding: 0.35rem 0 0.35rem 1.4rem;
  position: relative;
}

.card li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.85em;
  width: 0.7rem;
  height: 1.5px;
  background: var(--blue);
}

.services-note {
  margin-top: 2.6rem;
  font-size: 1.08rem;
  color: var(--silver);
  text-align: center;
}

@media (max-width: 900px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
