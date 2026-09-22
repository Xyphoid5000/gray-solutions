<script setup lang="ts">
const steps = [
  {
    n: '01',
    title: 'Discover',
    body: 'We talk through your business, your customers, and the story the site needs to tell. No jargon, no 40-page questionnaire.',
  },
  {
    n: '02',
    title: 'Design',
    body: 'I design around that story — structure first, then the creative moments that make it memorable.',
  },
  {
    n: '03',
    title: 'Build',
    body: 'Clean, fast, hand-built code. You see working progress early and often, not a big reveal at the end.',
  },
  {
    n: '04',
    title: 'Launch',
    body: 'Tested, tuned, and deployed. Then I hand you the keys — and stick around if you need me.',
  },
];
</script>

<template>
  <section id="process" class="section process">
    <div class="container">
      <div v-reveal>
        <p class="eyebrow">Process</p>
        <h2>Simple, by design</h2>
        <p class="process-lede">
          One person, one project at a time. You always know where things
          stand and what happens next.
        </p>
      </div>
      <ol class="steps">
        <li v-for="(s, i) in steps" :key="s.n" v-reveal="i * 0.1" class="step">
          <span class="step-n">{{ s.n }}</span>
          <h3>{{ s.title }}</h3>
          <p>{{ s.body }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.process {
  background: var(--bg-soft);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.process-lede {
  max-width: 36rem;
  font-size: 1.05rem;
}

.steps {
  list-style: none;
  margin: 2.8rem 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.4rem;
  counter-reset: step;
}

.step {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 1.2rem;
  padding: 1.8rem 1.6rem;
  position: relative;
}

.step-n {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--blue);
}

.step h3 {
  font-size: 1.25rem;
  margin: 0.7rem 0 0.6rem;
}

.step p {
  font-size: 0.92rem;
  margin: 0;
}

@media (max-width: 900px) {
  .steps {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .steps {
    grid-template-columns: 1fr;
  }
}
</style>
