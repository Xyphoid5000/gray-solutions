<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { IntroSceneHandle } from '../three/intro';

gsap.registerPlugin(ScrollTrigger);

const emit = defineEmits<{ unavailable: [] }>();

const sectionRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const barWrapRef = ref<HTMLElement | null>(null);
const barRef = ref<HTMLElement | null>(null);
const flashRef = ref<HTMLElement | null>(null);
const veilRef = ref<HTMLElement | null>(null);

let scene: IntroSceneHandle | null = null;
let ctx: gsap.Context | null = null;
let tornDown = false;

/**
 * The story, set in giant DOM type — the full hero philosophy copy, split
 * across five blocks. Each phrase starts dim and illuminates to full
 * brightness as it crosses the viewport center, then dims as it leaves —
 * all scrubbed by scroll, like lenis.dev's statement section.
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
      onFlashLevel: (v) => {
        if (flashRef.value) flashRef.value.style.opacity = v.toFixed(3);
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
    const bar = barRef.value!;
    const barWrap = barWrapRef.value!;
    const veil = veilRef.value!;

    // Fade in from black once the first frame is ready.
    gsap.to(veil, { opacity: 0, duration: 1.2, ease: 'power1.out', delay: 0.1 });

    // THE master timeline driver: one scroll-progress value, 0→1 across
    // the whole intro region. A proxy tween with scrub smoothing gives the
    // progress a silky catch-up (the lenis.dev feel); the smoothed value
    // drives the 3D scene, the progress bar, and the canvas crossfade —
    // so scrolling up rewinds everything exactly.
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
      onUpdate: () => {
        const p = proxy.p;
        scene?.setProgress(p);
        bar.style.transform = `scaleX(${p.toFixed(4)})`;
        // Crossfade the canvas out as the hero arrives; pause rendering
        // once it's fully gone.
        const fade = Math.min(1, Math.max(0, (p - 0.93) / 0.07));
        canvas.style.opacity = (1 - fade).toFixed(3);
        scene?.setVisible(p < 0.985);
      },
    });

    // Spotlight phrases: illuminate crossing center, dim leaving.
    gsap.utils.toArray<HTMLElement>('.phrase-block').forEach((block) => {
      const line = block.querySelector('.phrase');
      if (!line) return;
      gsap.fromTo(
        line,
        { opacity: 0.12 },
        {
          opacity: 1,
          ease: 'none',
          scrollTrigger: { trigger: block, start: 'top 82%', end: 'top 42%', scrub: true },
        },
      );
      gsap.to(line, {
        opacity: 0.12,
        ease: 'none',
        scrollTrigger: { trigger: block, start: 'top 42%', end: 'bottom 30%', scrub: true },
      });
    });
  }, sectionRef.value);
});

onUnmounted(() => {
  teardown();
});
</script>

<template>
  <section ref="sectionRef" class="intro" aria-label="Introduction">
    <canvas ref="canvasRef" class="intro-canvas" aria-hidden="true"></canvas>

    <div class="intro-phrases" aria-hidden="true">
      <div class="intro-spacer"></div>
      <div v-for="(p, i) in phrases" :key="i" class="phrase-block">
        <p class="phrase" :class="{ 'phrase-small': p.small }" v-html="p.html"></p>
      </div>
      <div class="intro-tail"></div>
    </div>

    <div ref="flashRef" class="intro-flash"></div>
    <div ref="veilRef" class="intro-veil"></div>

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

.intro-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 1;
}

.intro-phrases {
  position: relative;
  z-index: 2;
  pointer-events: none;
}

.intro-spacer {
  height: 80vh;
}

.phrase-block {
  min-height: 110vh;
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

.intro-tail {
  height: 70vh;
}

.intro-flash {
  position: fixed;
  inset: 0;
  z-index: 58;
  pointer-events: none;
  background: radial-gradient(
    ellipse at center,
    rgba(190, 225, 255, 0.9) 0%,
    rgba(120, 180, 255, 0.4) 45%,
    transparent 75%
  );
  opacity: 0;
}

.intro-veil {
  position: fixed;
  inset: 0;
  z-index: 59;
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
