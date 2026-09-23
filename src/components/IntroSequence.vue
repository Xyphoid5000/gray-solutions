<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Hero from './Hero.vue';
import type { IntroSceneHandle } from '../three/intro';

gsap.registerPlugin(ScrollTrigger);

const emit = defineEmits<{ unavailable: [] }>();

const sectionRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const heroWrapRef = ref<HTMLElement | null>(null);
const barWrapRef = ref<HTMLElement | null>(null);
const barRef = ref<HTMLSpanElement | null>(null);
const vignetteRef = ref<HTMLElement | null>(null);
const veilRef = ref<HTMLElement | null>(null);
const phraseRefs = ref<HTMLElement[]>([]);

let scene: IntroSceneHandle | null = null;
let ctx: gsap.Context | null = null;
let tornDown = false;

/**
 * TEMP SIMPLIFICATION (2026-09-23, per Chris): forget the text for now —
 * the bridge scroll-out is the whole shot. Phrases are parked behind this
 * flag; set to true to bring them back. Nothing was deleted.
 */
const SHOW_PHRASES = false;

/**
 * The story, set in giant DOM type — the full hero philosophy copy, split
 * across five blocks. Each phrase starts dim and illuminates to full SOLID
 * brightness as its scroll window passes, then dims as it leaves — all
 * scrubbed by scroll, like lenis.dev's statement section.
 *
 * G-S word pairs wear the logo's colors: the G-word in silver, the S-word
 * in electric blue.
 */
const phrases = [
  {
    html: 'Every <em class="g">good</em> <em class="s">story</em> needs <em class="g">great</em> <em class="s">structure</em>.',
    small: false,
  },
  {
    html: 'Something that <em class="g">generates</em> <em class="s">smiles</em>.',
    small: false,
  },
  {
    html: 'Something that <em class="g">solves</em> <em class="s">problems</em>.',
    small: false,
  },
  {
    html: 'Something that stands apart.',
    small: false,
  },
  {
    html: 'That&rsquo;s Gray Solutions. I build software and digital experiences that turn ideas into something real.',
    small: true,
  },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

function teardown() {
  if (tornDown) return;
  tornDown = true;
  ctx?.revert();
  ctx = null;
  scene?.dispose();
  scene = null;
}

onMounted(async () => {
  if (!sectionRef.value || !canvasRef.value) {
    emit('unavailable');
    return;
  }

  try {
    // three.js stays code-split: the heavy chunk downloads only when the
    // intro actually runs (never on no-WebGL devices — App gates those).
    const intro = await import('../three/intro');
    if (tornDown || !canvasRef.value) return;
    scene = intro.startIntroScene(canvasRef.value, {
      // Sells "infinite space" at the start: frame edges dissolve to
      // black at p=0, fully gone by p≈0.35. Deterministic + reversible.
      onVignetteLevel: (v) => {
        if (vignetteRef.value) vignetteRef.value.style.opacity = v.toFixed(3);
      },
    });
  } catch {
    // WebGL context creation or module load failed: drop the intro region
    // entirely and land the visitor on the hero.
    emit('unavailable');
    return;
  }

  ctx = gsap.context(() => {
    const section = sectionRef.value!;
    const canvas = canvasRef.value!;
    const heroWrap = heroWrapRef.value!;
    const bar = barRef.value!;
    const barWrap = barWrapRef.value!;
    const veil = veilRef.value!;
    const phraseEls = phraseRefs.value;

    // Fade in from black once the first frame is ready.
    gsap.to(veil, { opacity: 0, duration: 1.2, ease: 'power1.out', delay: 0.1 });

    // THE master timeline driver: one scroll-progress value, 0→1 across
    // the whole intro region. A proxy tween with scrub smoothing gives the
    // progress a silky catch-up (the lenis.dev feel); the smoothed value
    // drives the 3D scene, the hero reveal, the phrases, the progress bar,
    // and the canvas crossfade — so scrolling up rewinds everything
    // exactly. Do NOT use ScrollTrigger enter events inside the sticky
    // stage; positions are unreliable there.
    const applyProgress = (p: number) => {
      scene?.setProgress(p);
      bar.style.transform = `scaleX(${p.toFixed(4)})`;

      // Crossfade the canvas out as the hero arrives; pause rendering
      // once it's fully gone.
      const canvasFade = clamp01((p - 0.9) / 0.1);
      canvas.style.opacity = (1 - canvasFade).toFixed(3);
      scene?.setVisible(p < 0.985);

      // The hero was there the whole time — revealed in place behind the
      // fading canvas. It never slides up; we started inside it.
      const heroO = clamp01((p - 0.88) / 0.12);
      heroWrap.style.opacity = heroO.toFixed(3);
      // Keep the hero's links/buttons out of the tab order until visible.
      heroWrap.inert = p < 0.95;

      // Spotlight phrases: parked behind SHOW_PHRASES (see top of file).
      // SOLID at peak (opacity 1), dim (0.12) off-center. Each phrase owns
      // a scroll window matching the old 110vh-block layout: illuminate
      // over the first 40vh, dim over the next 122vh. All phrases fade
      // with the canvas so the hero arrives clean.
      if (SHOW_PHRASES) {
        for (let i = 0; i < phraseEls.length; i++) {
          const a = (110 * i - 2) / 600;
          const b = (110 * i + 38) / 600;
          const c = (110 * i + 160) / 600;
          let o: number;
          if (p <= a) o = 0.12;
          else if (p <= b) o = 0.12 + 0.88 * smooth((p - a) / (b - a));
          else if (p <= c) o = 1 - 0.88 * smooth((p - b) / (c - b));
          else o = 0.12;
          phraseEls[i].style.opacity = (o * (1 - canvasFade)).toFixed(3);
        }
      }
    };

    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        onToggle: (self) => {
          barWrap.classList.toggle('is-active', self.isActive);
        },
      },
      onUpdate: () => applyProgress(proxy.p),
    });

    // Set the initial state deterministically (in case ScrollTrigger
    // hasn't fired onUpdate yet).
    applyProgress(0);
  }, sectionRef.value);
});

onUnmounted(() => {
  teardown();
});
</script>

<template>
  <section ref="sectionRef" class="intro" aria-label="Introduction">
    <!-- Sticky 100vh stage: the hero lives here for the whole sequence,
         behind the WebGL canvas. At the end the canvas fades and the hero
         is revealed in place — it never slides up into view. -->
    <div class="intro-stage">
      <div ref="heroWrapRef" class="intro-hero">
        <Hero />
      </div>

      <canvas ref="canvasRef" class="intro-canvas" aria-hidden="true"></canvas>

      <div ref="vignetteRef" class="intro-vignette" aria-hidden="true"></div>

      <div v-if="SHOW_PHRASES" class="intro-phrases" aria-hidden="true">
        <div v-for="(p, i) in phrases" :key="i" class="phrase-slot">
          <p
            ref="phraseRefs"
            class="phrase"
            :class="{ 'phrase-small': p.small }"
            v-html="p.html"
          ></p>
        </div>
      </div>

      <div ref="veilRef" class="intro-veil"></div>
    </div>

    <div ref="barWrapRef" class="intro-progress">
      <span ref="barRef" class="intro-progress-bar"></span>
    </div>
  </section>
</template>

<style scoped>
.intro {
  position: relative;
  height: 700vh;
  background: #05070b;
}

.intro-stage {
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100svh;
  overflow: hidden;
}

/* The hero, behind everything for the entire sequence. Revealed in
   place by scroll progress — never slides. */
.intro-hero {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0;
  background: var(--bg);
}

.intro-hero :deep(.hero) {
  min-height: 100%;
  height: 100%;
}

.intro-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 1;
}

.intro-vignette {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(
    ellipse at center,
    transparent 22%,
    rgba(2, 4, 8, 0.55) 58%,
    rgba(0, 0, 0, 0.92) 84%,
    #000 100%
  );
  opacity: 1;
}

/* Giant story type, overlaid on the stage. Each slot fills the stage;
   opacity is driven deterministically by scroll progress. */
.intro-phrases {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.phrase-slot {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6vw;
}

.phrase {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(2.6rem, 9vw, 7.5rem);
  line-height: 1.08;
  letter-spacing: -0.02em;
  text-align: center;
  color: #f2f4f7;
  opacity: 0.12;
  text-wrap: balance;
}

.phrase-small {
  font-size: clamp(1.7rem, 4.6vw, 3.9rem);
  font-weight: 600;
  line-height: 1.22;
  max-width: 60rem;
}

.phrase :deep(em) {
  font-style: normal;
}

.phrase :deep(em.g) {
  color: var(--silver);
  text-shadow: 0 0 36px rgba(199, 204, 212, 0.35);
}

.phrase :deep(em.s) {
  color: var(--blue);
  text-shadow: 0 0 42px rgba(47, 155, 255, 0.55);
}

.intro-veil {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background: #000;
}

.intro-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 60;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.intro-progress.is-active {
  opacity: 1;
}

.intro-progress-bar {
  display: block;
  height: 100%;
  background: var(--blue);
  box-shadow: 0 0 12px rgba(47, 155, 255, 0.8);
  transform: scaleX(0);
  transform-origin: left center;
}
</style>
