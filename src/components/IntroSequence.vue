<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Hero from './Hero.vue';
import type { IntroSceneHandle } from '../three/intro';
import { outroState } from '../lib/introOutro';

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
 * THE ENDING (2026-09-23, Chris's words): "just remove the cross bar
 * from that [logo asset] and replace it with the bridge. Then it should
 * come into view from behind the camera and the end of the bridge
 * should be at the same z increment as the logo so that it gives the
 * illusion that we started inside of the logo."
 *
 * The intro OPENS inside the 3D bridge — which IS the logo's crossbar —
 * traveling +Z away from the logo (behind the camera, unseen). At the
 * end the camera yaws 180° and the logo comes into view FROM BEHIND
 * THE CAMERA: his mark with the bridge plugging into its crossbar slot.
 * The 3D story (travel, the turn, the mark fade-in) lives in
 * `three/intro.ts`, driven by the same scroll progress below. This
 * component owns the DOM handoff: at the very end the canvas fades out
 * and the hero — which was behind the canvas the whole time — reveals
 * in place. It never slides up; we started inside it.
 */
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

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

      // HANDOFF (0.965 -> 0.985): the 3D scene — holding the full
      // logo, the bridge running into its mark — fades out; the hero
      // reveals in place behind it. The outro state machine (src/lib/introOutro.ts)
      // forces the exact finished state at/above its threshold, so a
      // scroll that stalls just shy of 1.0 can never leave ghosts over
      // the hero (2026-09-23). The .is-done class is the hard guarantee
      // (!important CSS below); it is removed whenever p drops back
      // under the threshold, so scrubbing up restores the 3D scene
      // exactly. Fully scrub-reversible.
      const outro = outroState(p);

      // Once finished the canvas is visibility:hidden (not just
      // transparent) so no WebGL frame can bleed through the hero — and
      // rendering pauses.
      canvas.style.opacity = outro.canvasOpacity.toFixed(3);
      canvas.style.visibility = outro.canvasHidden ? 'hidden' : 'visible';
      scene?.setVisible(!outro.done && p < 0.995);

      heroWrap.style.opacity = outro.heroOpacity.toFixed(3);
      // Keep the hero's links/buttons out of the tab order until visible.
      heroWrap.inert = !outro.heroInteractive;

      // Hard completion guarantee (see .is-done CSS): toggled purely
      // from p, so scrolling back up removes it and restores the
      // scrubbed 3D state.
      section.classList.toggle('is-done', outro.done);

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
          phraseEls[i].style.opacity = (o * outro.canvasOpacity).toFixed(3);
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
        // If raw scroll passes the very end while the smoothed proxy is
        // still catching up, force the finished visuals now (the sticky
        // stage has scrolled away, so the snap is invisible). Scrolling
        // back up releases the class; the next scrub update restores the
        // exact 3D state.
        onLeave: () => {
          section.classList.add('is-done');
          applyProgress(1);
        },
        onEnterBack: () => {
          section.classList.remove('is-done');
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

/* OUTRO COMPLETION (2026-09-23): hard guarantee — once the handoff is
   done, the WebGL canvas is truly gone and the hero is fully revealed,
   even if scroll progress never lands exactly on 1. The class is
   removed whenever p drops back under the threshold, so scrubbing up
   restores the 3D scene exactly (inline styles are recomputed on every
   scroll update). */
.intro.is-done .intro-canvas {
  opacity: 0 !important;
  visibility: hidden !important;
}

.intro.is-done .intro-hero {
  opacity: 1 !important;
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
