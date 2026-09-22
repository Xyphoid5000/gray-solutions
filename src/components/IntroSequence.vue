<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';
import type { IntroHandle } from '../three/intro';

const emit = defineEmits<{ done: [] }>();

const overlay = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const veil = ref<HTMLElement | null>(null);
const flash = ref<HTMLElement | null>(null);
const showSkip = ref(false);

let handle: IntroHandle | null = null;
let done = false;

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const params = new URLSearchParams(window.location.search);
const forceSkip = params.has('skip-intro');

/** Cheap WebGL probe so we don't download three.js where it can't run. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    );
  } catch {
    return false;
  }
}

function complete() {
  if (done) return;
  done = true;
  document.body.classList.remove('intro-locked');
  // Crossfade the overlay so the 3D logo "snaps flat" into the hero SVG.
  if (overlay.value) {
    gsap.to(overlay.value, {
      opacity: 0,
      duration: 0.9,
      ease: 'power2.inOut',
      onComplete: () => emit('done'),
    });
  } else {
    emit('done');
  }
}

function onSkip() {
  handle?.skip();
}

function onFlash() {
  if (!flash.value) return;
  gsap.fromTo(
    flash.value,
    { opacity: 0 },
    { opacity: 0.85, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.out' },
  );
}

onMounted(async () => {
  // Accessibility / fallback paths: never trap the visitor in the intro.
  // The WebGL check runs before the (heavy) three.js chunk is downloaded.
  if (prefersReducedMotion || forceSkip || !canvasRef.value || !hasWebGL()) {
    complete();
    return;
  }

  document.body.classList.add('intro-locked');

  try {
    // Load the 3D world on demand while the display font settles, so the
    // intro's text sprites render in Space Grotesk.
    const [intro] = await Promise.all([
      import('../three/intro'),
      Promise.race([
        document.fonts.ready,
        new Promise((res) => setTimeout(res, 1500)),
      ]),
    ]);
    if (done || !canvasRef.value || !intro.isWebGLAvailable()) {
      complete();
      return;
    }
    handle = intro.startIntro(canvasRef.value, { onDone: complete, onFlash });
  } catch {
    complete();
    return;
  }

  // Fade from black, then reveal the skip affordance.
  if (veil.value) {
    gsap.to(veil.value, { opacity: 0, duration: 1.4, ease: 'power1.out', delay: 0.15 });
  }
  window.setTimeout(() => {
    if (!done) showSkip.value = true;
  }, 1200);
});

onUnmounted(() => {
  handle?.dispose();
  handle = null;
  document.body.classList.remove('intro-locked');
});
</script>

<template>
  <div ref="overlay" class="intro-overlay" aria-hidden="true">
    <canvas ref="canvasRef" class="intro-canvas"></canvas>
    <div ref="veil" class="intro-veil"></div>
    <div ref="flash" class="intro-flash"></div>
    <button v-if="showSkip" class="intro-skip" @click="onSkip" type="button">
      Skip intro
      <span class="intro-skip-arrow" aria-hidden="true">&rarr;</span>
    </button>
  </div>
</template>

<style scoped>
.intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: #05070b;
}

.intro-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.intro-veil {
  position: absolute;
  inset: 0;
  background: #000;
  pointer-events: none;
}

.intro-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(190, 225, 255, 0.95) 0%, rgba(120, 180, 255, 0.45) 45%, transparent 75%);
  opacity: 0;
  pointer-events: none;
}

.intro-skip {
  position: absolute;
  right: 1.4rem;
  bottom: 1.4rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--silver-dim);
  background: rgba(10, 13, 18, 0.55);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.65rem 1.2rem;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.intro-skip:hover {
  color: #fff;
  border-color: rgba(199, 204, 212, 0.4);
  transform: translateY(-1px);
}

.intro-skip-arrow {
  color: var(--blue);
}
</style>
