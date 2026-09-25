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
const spineProgress = ref(0);
let st: ScrollTrigger | undefined;
let spineSt: ScrollTrigger | undefined;

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    litCount.value = acts.length;
    spineProgress.value = 1;
    return;
  }

  const isDesktop = window.matchMedia('(min-width: 641px)').matches;

  if (!isDesktop) {
    // Mobile: the vertical spine fills with light as the reader scrolls
    // through the acts, and each stop lights in turn. The end is the
    // maximum scroll — the arc always completes at the bottom of the
    // page, whatever the viewport or the padding below the spine.
    const spine = document.querySelector<HTMLElement>('.arc-spine');
    if (!spine) {
      litCount.value = acts.length;
      spineProgress.value = 1;
      return;
    }
    gsap.set('.arc-stop', { opacity: 0.25 });
    spineSt = ScrollTrigger.create({
      trigger: spine,
      start: 'top 78%',
      end: 'max',
      scrub: 0.5,
      onUpdate: (self) => {
        const p = self.progress;
        spineProgress.value = p;
        const lit = Math.min(acts.length, Math.floor(p * acts.length + 0.2));
        if (lit !== litCount.value) {
          litCount.value = lit;
          gsap.set('.arc-stop', {
            opacity: (i: number) => (i < lit ? 1 : 0.25),
          });
          // Pop the newly lit stop.
          const stops = document.querySelectorAll('.arc-stop');
          const el = stops[lit - 1] as HTMLElement | undefined;
          if (el) {
            gsap.fromTo(
              el.querySelector('.arc-dot'),
              { scale: 1.9 },
              { scale: 1, duration: 0.5, ease: 'back.out(2.5)' },
            );
          }
        }
      },
    });
    return;
  }

  // Desktop: the pen-drawn curve. A glowing pen tip travels the path as
  // it draws, and each act node pulses as the pen reaches it.
  const svg = document.querySelector<SVGSVGElement>('.arc-svg');
  const path = svg?.querySelector<SVGPathElement>('#arc-path');
  const pen = svg?.querySelector<SVGGElement>('.arc-pen');
  if (!svg || !path || !pen) return;

  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  gsap.set('.arc-node', { opacity: 0.15 });
  gsap.set(pen, { opacity: 1 });

  const placePen = (dist: number) => {
    const pt = path.getPointAtLength(Math.max(0, Math.min(len, dist)));
    gsap.set(pen, { x: pt.x, y: pt.y });
  };
  placePen(0);

  const draw = gsap.to(path, {
    strokeDashoffset: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: '.arc-stage',
      start: 'top 72%',
      end: 'bottom 62%',
      scrub: 0.6,
      onUpdate: (self) => {
        const drawn = self.progress * len;
        placePen(drawn);
        // Light each act as the pen reaches its node.
        const lit = Math.min(
          acts.length,
          Math.floor(self.progress * acts.length + 0.15),
        );
        if (lit !== litCount.value) {
          litCount.value = lit;
          gsap.set('.arc-node', {
            opacity: (i: number) => (i < lit ? 1 : 0.15),
          });
          // Pulse the newly lit node.
          const nodes = document.querySelectorAll('.arc-node');
          const node = nodes[lit - 1] as SVGCircleElement | undefined;
          if (node) {
            gsap.fromTo(
              node,
              { scale: 1.8, transformOrigin: 'center' },
              { scale: 1, duration: 0.6, ease: 'back.out(2)' },
            );
          }
        }
      },
    },
  });
  st = draw.scrollTrigger ?? undefined;
});

onUnmounted(() => {
  st?.kill();
  st = undefined;
  spineSt?.kill();
  spineSt = undefined;
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
            <line x1="40" y1="280" x2="960" y2="280" stroke="rgba(242,236,223,0.08)" stroke-width="1" />
            <path
              id="arc-path"
              d="M 60 280 C 220 280, 260 250, 360 170 C 460 90, 540 60, 620 90 C 700 120, 760 220, 940 250"
              fill="none"
              stroke="#d08a4e"
              stroke-width="3"
              stroke-linecap="round"
            />
            <g class="arc-nodes" fill="#d08a4e">
              <circle class="arc-node" cx="60" cy="280" r="7" />
              <circle class="arc-node" cx="360" cy="170" r="7" />
              <circle class="arc-node" cx="620" cy="90" r="9" />
              <circle class="arc-node" cx="940" cy="250" r="7" />
            </g>
            <g class="arc-pen" opacity="0">
              <circle class="arc-pen-glow" cx="0" cy="0" r="16" fill="#d08a4e" opacity="0.25" />
              <circle class="arc-pen-tip" cx="0" cy="0" r="5" fill="#f1ecdf" />
              <circle class="arc-pen-core" cx="0" cy="0" r="2.5" fill="#d08a4e" />
            </g>
            <g font-family="Inter, sans-serif" font-size="15" letter-spacing="3" fill="#6f6a5e">
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
            class="arc-spine-progress"
            :style="{ transform: `scaleY(${spineProgress})` }"
            aria-hidden="true"
          ></div>
          <div
            v-for="(act, i) in acts"
            :key="act.num"
            class="arc-stop"
            :class="{ lit: i < litCount }"
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
