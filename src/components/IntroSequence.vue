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
const zoomRef = ref<HTMLElement | null>(null);
const zoomImgRef = ref<HTMLImageElement | null>(null);
const phraseRefs = ref<HTMLElement[]>([]);

let scene: IntroSceneHandle | null = null;
let ctx: gsap.Context | null = null;
let tornDown = false;
let lastP = 0;
let applyProgressFn: ((p: number) => void) | null = null;

/**
 * TEMP SIMPLIFICATION (2026-09-23, per Chris): forget the text for now —
 * the bridge scroll-out is the whole shot. Phrases are parked behind this
 * flag; set to true to bring them back. Nothing was deleted.
 */
const SHOW_PHRASES = false;

/**
 * ZOOM OUT (2026-09-23, Chris): "when you are about to hit the end, the
 * zoom on the logo zooms out rapidly." His mark drops in HUGE over the
 * bridge — the crossbar IS the bridge — then whips down to exactly where
 * the hero's logo sits while the canvas fades.
 *
 * Measured from the assets (PIL, 2026-09-23):
 * - public/logo-mark.png is 464x423. Its crossbar: x 120..407, y 130..185.
 * - mark.png -> public/logo-lockup.jpg (1254x1254, the hero's asset):
 *   lockup_px = 1.15 * mark_px + (341, 321.5)
 *   (crossbar template-matched via FFT NCC, mapped rect visually verified
 *   against the G/S/pixels — it hugs the mark exactly).
 *
 * The landed transform is solved at runtime from the hero img's own rect,
 * so it tracks responsive sizes; the zoomed transform centers the
 * crossbar on the viewport with the crossbar covering the frame (cover
 * semantics — correct on any aspect ratio). All math is
 * deterministic — scrubbing back reverses the zoom exactly.
 */
const MARK_W = 464;
const MARK_H = 423;
const CB_X0 = 120;
const CB_X1 = 407;
const CB_Y0 = 130;
const CB_Y1 = 185;
const MAP_S = 1.15;
const MAP_OX = 341;
const MAP_OY = 321.5;
const LOCKUP = 1254;

const zoom = { sBig: 1, txBig: 0, tyBig: 0, sEnd: 1, txEnd: 0, tyEnd: 0 };

function layoutZoom() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const L0 = (vw - MARK_W) / 2;
  const T0 = (vh - MARK_H) / 2;
  // Zoomed: the crossbar COVERS the viewport — no S, no pixels, just the
  // crossbar's silver-grey filling the frame — centered on the viewport.
  // Cover semantics: scale = max(vw/cbW, vh/cbH). Width-only math fails on
  // portrait (2026-09-23 bug: crossbar rendered tiny, S + pixels visible).
  const cbW = CB_X1 - CB_X0;
  const cbH = CB_Y1 - CB_Y0;
  const cbCx = (CB_X0 + CB_X1) / 2;
  const cbCy = (CB_Y0 + CB_Y1) / 2;
  const sBig = Math.max(vw / cbW, vh / cbH);
  zoom.sBig = sBig;
  zoom.txBig = vw / 2 - L0 - cbCx * sBig;
  zoom.tyBig = vh / 2 - T0 - cbCy * sBig;
  // Landed: the mark coincides with the mark inside the hero's lockup.
  // (r.width for both axes: the lockup is square, and height:auto can
  // report 0 before the image loads — width is CSS-driven and stable.)
  const heroImg = heroWrapRef.value?.querySelector(
    '.hero-mark',
  ) as HTMLImageElement | null;
  const r = heroImg?.getBoundingClientRect();
  if (r && r.width > 0) {
    const sEnd = (MAP_S * r.width) / LOCKUP;
    zoom.sEnd = sEnd;
    zoom.txEnd = r.left + (MAP_OX / LOCKUP) * r.width - L0;
    zoom.tyEnd = r.top + (MAP_OY / LOCKUP) * r.width - T0;
  }
}

/** Re-solve the zoom geometry (resize, font settle, reveal settle). */
function relayoutZoom() {
  if (tornDown) return;
  layoutZoom();
  applyProgressFn?.(lastP);
}

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
  window.removeEventListener('resize', relayoutZoom);
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
      lastP = p;
      scene?.setProgress(p);
      bar.style.transform = `scaleX(${p.toFixed(4)})`;

      // ZOOM OUT (0.80 -> 1.0): his mark drops in HUGE over the bridge —
      // the crossbar IS the bridge — then whips down to exactly where
      // the hero's logo sits. Exponential scale interpolation = constant
      // zoom velocity; ease-out = rapid. Fully scrub-reversible.
      const zoomEl = zoomRef.value;
      const zoomImg = zoomImgRef.value;
      if (zoomEl && zoomImg) {
        const zT = clamp01((p - 0.8) / 0.2);
        const ze = 1 - Math.pow(1 - zT, 2.2);
        const zs = zoom.sBig * Math.pow(zoom.sEnd / zoom.sBig, ze);
        const ztx = zoom.txBig + (zoom.txEnd - zoom.txBig) * ze;
        const zty = zoom.tyBig + (zoom.tyEnd - zoom.tyBig) * ze;
        zoomImg.style.transform =
          `translate(${ztx.toFixed(1)}px, ${zty.toFixed(1)}px) scale(${zs.toFixed(5)})`;
        // Fade in fast over the bridge, hold through the whip, then out
        // as the hero lands.
        const zO = smooth((p - 0.8) / 0.04) * (1 - smooth((p - 0.965) / 0.035));
        zoomEl.style.opacity = zO.toFixed(3);
        zoomEl.style.visibility = zO > 0.002 ? 'visible' : 'hidden';
      }

      // The canvas fades as the mark whips down; pause rendering once
      // it's fully gone.
      const canvasFade = clamp01((p - 0.84) / 0.16);
      canvas.style.opacity = (1 - canvasFade).toFixed(3);
      scene?.setVisible(p < 0.995);

      // The hero was there the whole time — revealed in place behind the
      // fading canvas. It never slides up; we started inside it.
      const heroO = clamp01((p - 0.9) / 0.1);
      heroWrap.style.opacity = heroO.toFixed(3);
      // Keep the hero's links/buttons out of the tab order until visible.
      heroWrap.inert = p < 0.97;

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
    applyProgressFn = applyProgress;
    layoutZoom();
    applyProgress(0);

    // Re-solve the zoom geometry once the display font settles and once
    // the hero's scroll-in reveal has cleared its transform.
    if (document.fonts) {
      document.fonts.ready.then(() => relayoutZoom()).catch(() => {});
    }
    window.setTimeout(relayoutZoom, 1600);
  }, sectionRef.value);

  window.addEventListener('resize', relayoutZoom);
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

      <!-- ZOOM OUT (0.80 -> 1.0): his mark drops in huge over the bridge —
           the crossbar IS the bridge — then whips down to exactly where
           the hero's logo sits. -->
      <div ref="zoomRef" class="intro-zoomlogo" aria-hidden="true">
        <img ref="zoomImgRef" src="/logo-mark.png" alt="" />
      </div>

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

/* The zoom-out mark (0.80 -> 1.0): huge over the bridge, whipping down to
   the hero's logo position. Transform is fully JS-driven (layoutZoom +
   scroll progress); the base box is just the mark's natural size,
   centered, with a top-left transform origin for the computed math. */
.intro-zoomlogo {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
}

.intro-zoomlogo img {
  position: absolute;
  left: calc(50% - 232px);
  top: calc(50% - 211.5px);
  width: 464px;
  height: 423px;
  transform-origin: 0 0;
  will-change: transform;
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
