<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ChapterHeading from './ChapterHeading.vue';

gsap.registerPlugin(ScrollTrigger);

const acts = [
  {
    num: 'Act I',
    title: 'Exposition',
    sub: 'Discovery',
    copy: 'We talk. I learn what you do, who it\u2019s for, and the story you\u2019re already telling \u2014 whether you know it yet or not.',
  },
  {
    num: 'Act II',
    title: 'Rising action',
    sub: 'Design',
    copy: 'Narrative becomes structure: sitemap as plot outline, visual design as voice. Tension builds on purpose.',
  },
  {
    num: 'Act III',
    title: 'Climax',
    sub: 'Build',
    copy: 'The site comes alive \u2014 motion, content, and code, built by hand. This is the part visitors feel in their chest.',
  },
  {
    num: 'Act IV',
    title: 'Resolution',
    sub: 'Launch',
    copy: 'We ship, measure, and keep the story sharp long after opening night. Endings should land; then they should last.',
  },
];

const litCount = ref(0);
let st: ScrollTrigger | undefined;

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    litCount.value = acts.length;
    return;
  }

  // The pen-drawn curve is a desktop pleasure — small screens get the
  // vertical spine (pure CSS) instead, so skip the SVG work entirely.
  if (!window.matchMedia('(min-width: 641px)').matches) {
    litCount.value = acts.length;
    return;
  }

  const svg = document.querySelector<SVGSVGElement>('.arc-svg');
  const path = svg?.querySelector<SVGPathElement>('#arc-path');
  if (!svg || !path) return;

  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  gsap.set('.arc-node', { opacity: 0.15 });

  const draw = gsap.to(path, {
    strokeDashoffset: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: '.arc-stage',
      start: 'top 72%',
      end: 'bottom 62%',
      scrub: 0.6,
      onUpdate: (self) => {
        // Light each act as the pen reaches its node.
        litCount.value = Math.min(
          acts.length,
          Math.floor(self.progress * acts.length + 0.15),
        );
        gsap.set('.arc-node', {
          opacity: (i: number) => (i < litCount.value ? 1 : 0.15),
        });
      },
    },
  });
  st = draw.scrollTrigger ?? undefined;
});

onUnmounted(() => {
  st?.kill();
  st = undefined;
});
</script>

<template>
  <section id="arc" class="chapter" aria-label="Chapter 4 — The arc">
    <div class="wrap">
      <ChapterHeading
        index="04"
        kicker="Chapter Four &mdash; The Arc"
        title="Every project follows <em>the arc.</em>"
      />
      <p v-reveal class="lede" style="margin-bottom: 3rem">
        Stories have run on the same shape for three thousand years &mdash;
        so does my process. Watch the pen.
      </p>
      <div v-reveal class="arc-stage">
        <div class="arc-svg-wrap">
          <svg
            class="arc-svg"
            viewBox="0 0 1000 320"
            role="img"
            aria-label="A story arc rising from exposition to climax and resolving"
          >
            <line x1="40" y1="280" x2="960" y2="280" stroke="rgba(243,237,225,0.08)" stroke-width="1" />
            <path
              id="arc-path"
              d="M 60 280 C 220 280, 260 250, 360 170 C 460 90, 540 60, 620 90 C 700 120, 760 220, 940 250"
              fill="none"
              stroke="#e8a33d"
              stroke-width="3"
              stroke-linecap="round"
            />
            <g class="arc-nodes" fill="#e8a33d">
              <circle class="arc-node" cx="60" cy="280" r="7" />
              <circle class="arc-node" cx="360" cy="170" r="7" />
              <circle class="arc-node" cx="620" cy="90" r="9" />
              <circle class="arc-node" cx="940" cy="250" r="7" />
            </g>
            <g font-family="Inter, sans-serif" font-size="15" letter-spacing="3" fill="#6f675a">
              <text x="60" y="308" text-anchor="middle">EXPOSITION</text>
              <text x="360" y="140" text-anchor="middle">RISING ACTION</text>
              <text x="620" y="58" text-anchor="middle">CLIMAX</text>
              <text x="940" y="282" text-anchor="end">RESOLUTION</text>
            </g>
          </svg>
        </div>
        <div class="arc-grid">
          <article
            v-for="(act, i) in acts"
            :key="act.num"
            class="arc-act"
            :class="{ lit: i < litCount }"
          >
            <span class="act-num">{{ act.num }} &mdash; {{ act.sub }}</span>
            <h3>{{ act.title }}</h3>
            <p>{{ act.copy }}</p>
          </article>
        </div>
        <div class="arc-spine">
          <div
            v-for="(act, i) in acts"
            :key="act.num"
            v-reveal="i * 0.06"
            class="arc-stop"
          >
            <span class="arc-dot" aria-hidden="true"></span>
            <div class="arc-stop-body">
              <span class="act-num">{{ act.num }} &mdash; {{ act.sub }}</span>
              <h3>{{ act.title }}</h3>
              <p>{{ act.copy }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
