<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface Ember {
  x: number;
  y: number;
  vy: number;
  sway: number;
  phase: number;
  size: number;
  alpha: number;
  depth: number;
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
let raf = 0;
let running = false;
let embers: Ember[] = [];
let sprite: HTMLCanvasElement | null = null;
let W = 0;
let H = 0;
let triggers: ScrollTrigger[] = [];

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Pre-rendered radial ember sprite — one drawImage per particle. */
function makeSprite(): HTMLCanvasElement {
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const g = s.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,214,140,1)');
  grad.addColorStop(0.3, 'rgba(232,163,61,0.9)');
  grad.addColorStop(0.65, 'rgba(180,95,34,0.35)');
  grad.addColorStop(1, 'rgba(180,95,34,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return s;
}

function spawn(initial: boolean): Ember {
  return {
    x: Math.random() * W,
    y: initial ? Math.random() * H : H + 20,
    vy: 0.35 + Math.random() * 1.15,
    sway: 12 + Math.random() * 42,
    phase: Math.random() * Math.PI * 2,
    size: 3 + Math.random() * 11,
    alpha: 0.25 + Math.random() * 0.6,
    depth: 0.4 + Math.random() * 0.6,
  };
}

function sizeCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const rect = canvas.getBoundingClientRect();
  W = rect.width;
  H = rect.height;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

let t = 0;
function tick() {
  if (!running) return;
  const canvas = canvasRef.value;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx || !sprite) {
    raf = requestAnimationFrame(tick);
    return;
  }
  t += 0.016;
  ctx.clearRect(0, 0, W, H);
  for (const e of embers) {
    e.y -= e.vy * e.depth;
    e.phase += 0.012 * e.depth;
    const x = e.x + Math.sin(e.phase) * e.sway;
    if (e.y < -30) Object.assign(e, spawn(false));
    // Flicker like a real spark.
    const flicker = 0.72 + 0.28 * Math.sin(t * 7 * e.depth + e.phase * 3);
    ctx.globalAlpha = e.alpha * flicker;
    const s = e.size * (0.7 + 0.3 * Math.sin(t * 3 + e.phase));
    ctx.drawImage(sprite, x - s / 2, e.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
  raf = requestAnimationFrame(tick);
}

function start() {
  if (running) return;
  running = true;
  raf = requestAnimationFrame(tick);
}

function stop() {
  running = false;
  cancelAnimationFrame(raf);
}

onMounted(() => {
  const section = document.querySelector<HTMLElement>('.intermission');
  const stage = section?.querySelector<HTMLElement>('.intermission-stage');
  if (!section || !stage) return;

  if (reducedMotion()) {
    gsap.set('.intermission-text', { opacity: 1, y: 0 });
    return;
  }

  sprite = makeSprite();
  sizeCanvas();
  const count = Math.round(Math.min(150, Math.max(60, W / 9)));
  embers = Array.from({ length: count }, () => spawn(true));
  window.addEventListener('resize', sizeCanvas);

  // The camera holds while the story breathes: pin the stage, let the
  // scroll drive the swell.
  const pin = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=220%',
    pin: stage,
    scrub: 1,
    anticipatePin: 1,
    onToggle: (self) => (self.isActive ? start() : stop()),
  });
  triggers.push(pin);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: '+=220%',
      scrub: 1,
    },
  });
  tl.fromTo(
    '.intermission-text .h-line-inner',
    { y: '115%' },
    { y: '0%', duration: 1, stagger: 0.35, ease: 'power2.out' },
    0,
  )
    .fromTo(
      '.intermission-kicker',
      { opacity: 0, letterSpacing: '0.6em' },
      { opacity: 1, letterSpacing: '0.34em', duration: 1, ease: 'power2.out' },
      0.1,
    )
    // Hold the swell, then drift it upward and dim as we release.
    .to('.intermission-text', { yPercent: -14, scale: 1.05, duration: 1.2, ease: 'power1.inOut' }, 1.6)
    .to('.intermission-text', { opacity: 0, duration: 0.8, ease: 'power1.in' }, 2.1);
  if (tl.scrollTrigger) triggers.push(tl.scrollTrigger);

  // Settle measurements after fonts land.
  requestAnimationFrame(() => ScrollTrigger.refresh());
});

onUnmounted(() => {
  stop();
  window.removeEventListener('resize', sizeCanvas);
  triggers.forEach((s) => s.kill());
  triggers = [];
});
</script>

<template>
  <section id="intermission" class="intermission" aria-label="Intermission">
    <div class="intermission-stage">
      <div class="intermission-bg" aria-hidden="true"></div>
      <canvas
        ref="canvasRef"
        class="intermission-canvas"
        aria-hidden="true"
      ></canvas>
      <div class="intermission-vignette" aria-hidden="true"></div>
      <div class="intermission-text">
        <p class="intermission-kicker">Intermission</p>
        <h2 class="intermission-title">
          <span class="h-line"><span class="h-line-inner">This is the part</span></span>
          <span class="h-line"><span class="h-line-inner">where the music <em>swells.</em></span></span>
        </h2>
      </div>
    </div>
  </section>
</template>
