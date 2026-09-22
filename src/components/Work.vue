<script setup lang="ts">
import { siteConfig } from '../config';

const stats = [
  { value: '70%', label: 'image payload reduction' },
  { value: 'GSAP', label: 'glass-shatter intro sequence' },
  { value: '3D', label: 'windshield page transitions' },
];
</script>

<template>
  <section id="work" class="section">
    <div class="container">
      <div v-reveal>
        <p class="eyebrow">Featured work</p>
        <h2>Burning River Auto Glass</h2>
        <p class="work-lede">
          A local auto glass company on a generic Squarespace template. I
          rebuilt it as a cinematic custom site &mdash; the same business,
          an entirely different first impression.
        </p>
      </div>

      <article v-reveal class="case">
        <div class="case-body">
          <p class="case-kicker">Squarespace &rarr; custom Vue / GSAP build</p>
          <h3>From template to theater</h3>
          <p>
            The rebuild opens with a glass-shattering intro and moves between
            pages with windshield-replacement transitions &mdash; motion that
            tells the company&rsquo;s story instead of decorating it. Under the
            hood, a performance pass converted assets to modern formats and cut
            the served image payload by roughly seventy percent.
          </p>
          <div class="case-stats">
            <div v-for="s in stats" :key="s.label" class="stat">
              <span class="stat-value">{{ s.value }}</span>
              <span class="stat-label">{{ s.label }}</span>
            </div>
          </div>
          <div class="case-actions">
            <span class="tag">Vue 3</span>
            <span class="tag">GSAP</span>
            <span class="tag">TypeScript</span>
            <span class="tag">Vite</span>
            <a
              class="case-link"
              :href="`${siteConfig.github}/Brag`"
              target="_blank"
              rel="noopener"
            >
              View source on GitHub
              <span aria-hidden="true">&nearr;</span>
            </a>
          </div>
        </div>
        <div class="case-visual" aria-hidden="true">
          <div class="shard-field">
            <span v-for="n in 9" :key="n" :class="`shard shard-${n}`"></span>
          </div>
          <p class="case-visual-caption">glass-shatter intro &middot; windshield transitions</p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.work-lede {
  max-width: 40rem;
  font-size: 1.05rem;
}

.case {
  margin-top: 2.8rem;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 1.4rem;
  overflow: hidden;
}

.case-body {
  padding: clamp(1.8rem, 4vw, 3rem);
}

.case-kicker {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--blue);
  margin-bottom: 0.8rem;
}

.case-body h3 {
  font-size: clamp(1.5rem, 3vw, 2rem);
}

.case-stats {
  display: flex;
  gap: 2rem;
  margin: 1.8rem 0;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-family: var(--font-display);
  font-size: 1.7rem;
  font-weight: 700;
  background: linear-gradient(180deg, #f4f6f9, #8b93a1);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.stat-label {
  font-size: 0.82rem;
  color: var(--silver-dim);
  max-width: 9rem;
  line-height: 1.4;
}

.case-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.tag {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--silver-dim);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
}

.case-link {
  margin-left: auto;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.92rem;
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
}

.case-visual {
  position: relative;
  background:
    radial-gradient(ellipse 80% 60% at 50% 40%, rgba(47, 155, 255, 0.1), transparent 70%),
    #0b0f16;
  border-left: 1px solid var(--line);
  min-height: 320px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}

.shard-field {
  position: absolute;
  inset: 0;
}

.shard {
  position: absolute;
  background: linear-gradient(135deg, rgba(199, 204, 212, 0.28), rgba(47, 155, 255, 0.12));
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  animation: shard-drift 9s ease-in-out infinite;
}

.shard-1 { width: 90px; height: 120px; top: 8%; left: 12%; }
.shard-2 { width: 60px; height: 80px; top: 55%; left: 8%; animation-delay: -2s; }
.shard-3 { width: 110px; height: 90px; top: 30%; left: 45%; animation-delay: -4s; }
.shard-4 { width: 70px; height: 100px; top: 65%; left: 55%; animation-delay: -1s; }
.shard-5 { width: 50px; height: 70px; top: 15%; left: 72%; animation-delay: -6s; }
.shard-6 { width: 95px; height: 75px; top: 48%; left: 78%; animation-delay: -3s; }
.shard-7 { width: 55px; height: 90px; top: 78%; left: 30%; animation-delay: -5s; }
.shard-8 { width: 75px; height: 60px; top: 5%; left: 38%; animation-delay: -7s; }
.shard-9 { width: 65px; height: 85px; top: 38%; left: 22%; animation-delay: -8s; }

@keyframes shard-drift {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
  50% { transform: translateY(-18px) rotate(8deg); opacity: 1; }
}

.case-visual-caption {
  position: relative;
  font-family: var(--font-display);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--silver-dim);
  padding: 1.2rem;
  margin: 0;
}

@media (max-width: 900px) {
  .case {
    grid-template-columns: 1fr;
  }

  .case-visual {
    border-left: none;
    border-top: 1px solid var(--line);
    min-height: 240px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shard {
    animation: none;
  }
}
</style>
