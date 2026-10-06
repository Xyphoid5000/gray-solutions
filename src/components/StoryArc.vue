<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ChapterHeading from './ChapterHeading.vue';
import { motionReduced } from '../utils/a11y';

gsap.registerPlugin(ScrollTrigger);

const props = defineProps<{ active?: boolean; scrollDriven?: boolean }>();

const stageRef = ref<HTMLElement | null>(null);

const isDesktop = window.matchMedia('(min-width: 641px)').matches;
const reduced = motionReduced();

const acts = [
  {
    num: 'Act I',
    title: 'Exposition',
    sub: 'Discovery',
    copy: 'We talk. I learn what you do, who it\u2019s for, and <em>the story you\u2019re already telling</em> \u2014 whether you know it yet or not.',
  },
  {
    num: 'Act II',
    title: 'Rising action',
    sub: 'Design',
    copy: 'Narrative becomes structure: sitemap as plot outline, visual design as voice. <em>Tension builds on purpose.</em>',
  },
  {
    num: 'Act III',
    title: 'Climax',
    sub: 'Build',
    copy: 'The site comes alive \u2014 motion, content, and code, built by hand. This is the part visitors <em>feel in their chest</em>.',
  },
  {
    num: 'Act IV',
    title: 'Resolution',
    sub: 'Launch',
    copy: 'We ship, measure, and keep the story sharp long after opening night. <em>Endings should land;</em> then they should last.',
  },
];

const litCount = ref(0);
const spineProgress = ref(0);
let spineTriggers: ScrollTrigger[] = [];

/** Desktop pen-draw timeline — replay only. The reader drives the pen
    bullet to bullet; the timeline just replays the full draw. */
let arcTl: gsap.core.Timeline | null = null;
/** Draw checkpoints — the true arc-length fractions of each node, so the
    pen always sits exactly on a bullet. Arrow keys / clicks jump the pen
    straight to them. */
const ACT_CHECKS = [0, 0.338, 0.63, 1];
/** Node positions along the curve, matching the checkpoints. */
const NODE_POS = [
  [60, 280],
  [360, 170],
  [620, 90],
  [940, 250],
];

/** Pen-draw state, wired up in onMounted (desktop only). */
let arcPath: SVGPathElement | null = null;
let arcPen: SVGGElement | null = null;
let arcLen = 0;
const arcProgress = { v: 0 };

function placePen(dist: number) {
  if (!arcPath || !arcPen) return;
  const pt = arcPath.getPointAtLength(Math.max(0, Math.min(arcLen, dist)));
  gsap.set(arcPen, { x: pt.x, y: pt.y });
}

/** Apply a draw progress of 0..1: curve, pen, and lit acts. */
function setProgress(p: number) {
  if (!arcPath) return;
  const drawn = p * arcLen;
  gsap.set(arcPath, { strokeDashoffset: arcLen - drawn });
  placePen(drawn);
  // Light each act whose bullet the pen has reached.
  const lit = ACT_CHECKS.filter((c) => c <= p + 1e-4).length;
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
}

/** The arc always starts at the first bullet — no autoplay. The reader
    drives the pen from bullet to bullet with arrows or clicks. */
function resetArc() {
  arcTl?.pause();
  gsap.killTweensOf(arcProgress);
  if (!arcPath || reduced) {
    litCount.value = 1;
    spineProgress.value = 1 / acts.length;
    return;
  }
  arcProgress.v = ACT_CHECKS[0];
  setProgress(arcProgress.v);
}
/** Simple replay affordance for the finished curve. */
function replayArc() {
  if (reduced) return;
  gsap.killTweensOf(arcProgress);
  if (!arcTl) return;
  arcTl.pause(0);
  arcTl.play();
}
/** Jump the pen to an act: the curve draws (or undraws) to that act's
    checkpoint and the act lights. Arrow keys and clicks land here. */
function goToAct(i: number) {
  // On the routed chapter page the scroll drives the pen — clicks stay out.
  if (props.scrollDriven) return;
  const idx = Math.max(0, Math.min(acts.length - 1, i));
  if (reduced || !arcPath) {
    litCount.value = idx + 1;
    spineProgress.value = (idx + 1) / acts.length;
    return;
  }
  arcTl?.pause();
  gsap.to(arcProgress, {
    v: ACT_CHECKS[idx],
    duration: 0.9,
    ease: 'power2.inOut',
    overwrite: true,
    onUpdate: () => setProgress(arcProgress.v),
  });
}
/** Arrow keys move the highlight between acts — only while the arc stage
    is on the visible book page. Everywhere else the keys fall through to
    the book's own page-turn handler (capture + no stopPropagation there). */
function onArcKey(e: KeyboardEvent) {
  if (!props.active || !isDesktop) return;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const t = e.target as HTMLElement | null;
  if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (document.querySelector('.phone-modal, .draft-modal, .chapter-modal'))
    return;
  // The stage lives on its own paginated page — a hidden page reports a
  // zero rect, so this is false everywhere but the arc page. Use the
  // component's own stage (not document.querySelector).
  const stage = stageRef.value;
  if (!stage) return;
  const r = stage.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return;
  const next = litCount.value - 1 + (e.key === 'ArrowRight' ? 1 : -1);
  if (next < 0 || next >= acts.length) return;
  e.stopPropagation();
  goToAct(next);
}
watch(() => props.active, (on) => {
  if (on && !reduced) resetArc();
});

onMounted(() => {
  window.addEventListener('keydown', onArcKey, true);

  if (reduced) {
    litCount.value = acts.length;
    spineProgress.value = 1;
    return;
  }

  if (!isDesktop) {
    // Mobile: each stop lights as it scrolls into view, and the glowing
    // line fills to match. Per-stop triggers — no single trigger's total
    // scroll range to miscompute, so the last act always lights at the
    // bottom whatever the viewport or the padding below the spine.
    const stopEls = [
      ...document.querySelectorAll<HTMLElement>('.arc-stop'),
    ];
    if (!stopEls.length) {
      litCount.value = acts.length;
      spineProgress.value = 1;
      return;
    }
    gsap.set('.arc-stop', { opacity: 0.25 });
    const lightUpTo = (n: number) => {
      if (n === litCount.value && spineProgress.value === n / acts.length)
        return;
      litCount.value = n;
      spineProgress.value = n / acts.length;
      gsap.set('.arc-stop', {
        opacity: (i: number) => (i < n ? 1 : 0.25),
      });
      // Pop the newly lit stop.
      const el = stopEls[n - 1] as HTMLElement | undefined;
      if (el) {
        gsap.fromTo(
          el.querySelector('.arc-dot'),
          { scale: 1.9 },
          { scale: 1, duration: 0.5, ease: 'back.out(2.5)' },
        );
      }
    };
    stopEls.forEach((el, i) => {
      const trigger = ScrollTrigger.create({
        trigger: el,
        start: 'top 72%',
        onEnter: () => lightUpTo(i + 1),
        onLeaveBack: () => lightUpTo(i),
      });
      spineTriggers.push(trigger);
    });
    return;
  }

  // Desktop: the pen-drawn curve. Page scroll is locked on desktop, so
  // the reader steps the pen through the acts with arrows or clicks —
  // it eases between bullets and holds on the finished curve. The arc
  // always starts at the first bullet.
  const svg = document.querySelector<SVGSVGElement>('.arc-svg');
  arcPath = svg?.querySelector<SVGPathElement>('#arc-path') ?? null;
  arcPen = svg?.querySelector<SVGGElement>('.arc-pen') ?? null;
  if (!svg || !arcPath || !arcPen) return;

  arcLen = arcPath.getTotalLength();
  gsap.set(arcPath, { strokeDasharray: arcLen, strokeDashoffset: arcLen });
  gsap.set('.arc-node', { opacity: 0.15 });
  gsap.set(arcPen, { opacity: 1 });
  placePen(0);

  if (props.scrollDriven) {
    // Routed chapter page: the original scroll-driven design. The page
    // scrolls, so the pen draws the curve with the reader — every scroll
    // position maps to a draw progress via setProgress. The scrub ends at
    // the page's real max scroll, so the finale always lands no matter
    // what follows the stage (no viewport-guessing, no margin hacks).
    const scrub = ScrollTrigger.create({
      trigger: '.arc-stage',
      start: 'top 72%',
      end: 'max',
      onUpdate: (self) => {
        spineProgress.value = self.progress;
        setProgress(self.progress);
      },
    });
    spineTriggers.push(scrub);
    return;
  }

  // Book: page scroll is locked on desktop, so the reader steps the pen
  // through the acts with arrows or clicks — it eases between bullets
  // and holds on the finished curve. The arc always starts at the first
  // bullet.
  arcTl = gsap.timeline({ paused: true });
  // Checkpoints chosen so each one lights the next act.
  for (const cp of ACT_CHECKS) {
    arcTl.to(arcProgress, {
      v: cp,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => setProgress(arcProgress.v),
    });
    // Readable pause at each beat; the last one holds the finished curve.
    arcTl.to({}, { duration: 2 });
  }
  // Start at the first bullet — the reader drives from here.
  resetArc();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onArcKey, true);
  arcTl?.kill();
  arcTl = null;
  spineTriggers.forEach((t) => t.kill());
  spineTriggers = [];
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
        Stories have run on the same shape for
        <em>three thousand years</em> &mdash; so does my process.
      </p>
      <div v-reveal ref="stageRef" class="arc-stage">
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
              <circle
                v-for="(act, i) in acts"
                :key="act.num"
                class="arc-node"
                :cx="NODE_POS[i][0]"
                :cy="NODE_POS[i][1]"
                :r="i === 2 ? 9 : 7"
                @click="goToAct(i)"
              />
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
            @click="goToAct(i)"
          >
            <span class="act-num">{{ act.num }} &mdash; {{ act.sub }}</span>
            <h3>{{ act.title }}</h3>
            <p v-html="act.copy"></p>
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
              <p v-html="act.copy"></p>
            </div>
          </div>
        </div>
        <button
          v-if="isDesktop && !reduced && !scrollDriven"
          type="button"
          class="arc-replay"
          @click="replayArc"
        >
          Replay the arc
        </button>
      </div>
    </div>
  </section>
</template>
