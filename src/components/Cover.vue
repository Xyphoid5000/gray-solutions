<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { gsap } from 'gsap';
import ContactForm from './ContactForm.vue';
import { returnToContact } from '../lib/ui';
import { scrollSlowTo } from '../lib/scroll';

const router = useRouter();

const stageRef = ref<HTMLElement | null>(null);
const bookRef = ref<HTMLElement | null>(null);
const shadowRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

let introTl: gsap.core.Timeline | null = null;
let raf = 0;
let looping = false;
let sprite: HTMLCanvasElement | null = null;
let W = 0;
let H = 0;

interface Mote {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; grow: number;
}

let motes: Mote[] = [];

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function makeSprite(): HTMLCanvasElement {
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const g = s.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(220,200,168,0.85)');
  grad.addColorStop(0.5, 'rgba(206,184,150,0.38)');
  grad.addColorStop(1, 'rgba(206,184,150,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return s;
}

function sizeCanvas() {
  const canvas = canvasRef.value;
  const stage = stageRef.value;
  if (!canvas || !stage) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const rect = stage.getBoundingClientRect();
  W = rect.width;
  H = rect.height;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Dust kicks up from the book's base when it lands. */
function burst(power: number) {
  const stage = stageRef.value;
  const book = bookRef.value;
  if (!stage || !book || !sprite) return;
  const sr = stage.getBoundingClientRect();
  const br = book.getBoundingClientRect();
  const x = br.left + br.width / 2 - sr.left;
  const y = br.bottom - sr.top - 4;
  const n = Math.round(30 * power) + 8;
  for (let i = 0; i < n; i++) {
    const maxLife = 0.8 + Math.random() * 0.8;
    motes.push({
      x: x + (Math.random() - 0.5) * br.width * 0.5,
      y: y - Math.random() * 8,
      vx: (Math.random() * 2 - 1) * 200 * power,
      vy: -(50 + Math.random() * 180) * power,
      life: 0,
      maxLife,
      size: 6 + Math.random() * 12,
      grow: 14 + Math.random() * 18,
    });
  }
  ensureLoop();
}

let last = 0;
function frame(ts: number) {
  const canvas = canvasRef.value;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx || !sprite) {
    looping = false;
    return;
  }
  const dt = Math.min((ts - last) / 1000, 0.05);
  last = ts;
  ctx.clearRect(0, 0, W, H);
  motes = motes.filter((m) => m.life < m.maxLife);
  for (const m of motes) {
    m.life += dt;
    m.vy += 320 * dt; // dust rises, then settles
    m.vx *= 1 - 1.6 * dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    const k = m.life / m.maxLife;
    ctx.globalAlpha = (1 - k) * 0.55;
    const s = m.size + m.grow * k;
    ctx.drawImage(sprite, m.x - s / 2, m.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
  if (motes.length) {
    raf = requestAnimationFrame(frame);
  } else {
    looping = false;
  }
}

function ensureLoop() {
  if (!looping) {
    looping = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}

function land(power: number) {
  burst(power);
  const shadow = shadowRef.value;
  if (shadow) {
    gsap.fromTo(
      shadow,
      { opacity: 0.2, scale: 0.55 },
      { opacity: 0.6, scale: 1, duration: 0.55, ease: 'power2.out', overwrite: 'auto' },
    );
  }
}

/**
 * How the book must be transformed — squared to camera, centered, and
 * scaled — so its cover exactly fills the viewport, never more.
 * Measures the book flattened (resting 3D tilt would shrink the reading)
 * and restores the resting pose before returning.
 */
function coverFit() {
  const book = bookRef.value;
  if (!book) return null;
  const rest = {
    x: gsap.getProperty(book, 'x'),
    y: gsap.getProperty(book, 'y'),
    rotationX: gsap.getProperty(book, 'rotationX'),
    rotationY: gsap.getProperty(book, 'rotationY'),
    rotationZ: gsap.getProperty(book, 'rotationZ'),
  };
  gsap.set(book, { x: 0, y: 0, rotationX: 0, rotationY: 0, rotationZ: 0 });
  const r = book.getBoundingClientRect();
  gsap.set(book, rest);
  const scale =
    Math.min(window.innerWidth / r.width, window.innerHeight / r.height) *
    0.985;
  return {
    scale,
    x: window.innerWidth / 2 - (r.left + r.width / 2),
    y: window.innerHeight / 2 - (r.top + r.height / 2),
  };
}

function open() {
  if (reducedMotion()) {
    router.push('/premise');
    return;
  }
  introTl?.kill();
  const book = bookRef.value;
  if (!book) {
    router.push('/premise');
    return;
  }
  const fit = coverFit();
  // Dive into the front cover: square the book to camera and grow it
  // until the cover fills the frame — then the router's normal
  // page-turn carries us into the book.
  const tl = gsap.timeline({ onComplete: () => router.push('/premise') });
  tl.to('.cover-ui, .cover-kicker', { opacity: 0, y: -24, duration: 0.45, ease: 'power2.in' }, 0)
    .to('.cover-glow', { opacity: 0.2, duration: 0.9, ease: 'power1.inOut' }, 0)
    .to('.book-shadow', { opacity: 0, scale: 1.5, duration: 0.9, ease: 'power2.in' }, 0)
    .to(
      book,
      {
        x: fit ? fit.x : 0,
        y: fit ? fit.y : 0,
        scale: fit ? fit.scale : 1,
        rotationX: 0,
        rotationY: 0,
        rotationZ: 0,
        duration: 1.3,
        ease: 'power2.inOut',
      },
      0.1,
    );
}

/**
 * The reverse journey: the reader asked for the contact form from
 * somewhere inside the book. We arrive already dived into the cover —
 * the book closes, the camera eases back out to the full scene, and
 * then we drift slowly down to the form.
 */
function playReturn() {
  const book = bookRef.value;
  if (!book) return;
  if (reducedMotion()) {
    document.getElementById('contact')?.scrollIntoView();
    return;
  }
  // Start where open() left off: squared to camera, centered, filling
  // the frame — then ease back out to the resting presentation.
  const fit = coverFit();
  gsap.set(book, {
    x: fit ? fit.x : 0,
    y: fit ? fit.y : 0,
    scale: fit ? fit.scale : 1,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    transformPerspective: 1400,
  });
  gsap.set(['.cover-kicker', '.cover-ui > *'], { opacity: 0, y: 18 });
  gsap.set('.cover-glow', { opacity: 0.25 });
  gsap.set('.book-shadow', { opacity: 0, scale: 1.4 });

  const tl = gsap.timeline();
  tl.to(
      book,
      {
        x: 0,
        y: 0,
        scale: 1,
        rotationX: 8,
        rotationY: -22,
        duration: 1.9,
        ease: 'power2.inOut',
      },
      0.25,
    )
    .to('.cover-glow', { opacity: 1, duration: 1.4, ease: 'power1.inOut' }, 0.5)
    .to(
      '.book-shadow',
      { opacity: 0.6, scale: 1, duration: 1.2, ease: 'power2.out' },
      0.7,
    )
    .to(
      ['.cover-kicker', '.cover-ui > *'],
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' },
      1.1,
    )
    .add(() => {
      const form = document.getElementById('contact');
      if (form) scrollSlowTo(form);
    }, 2.1);
}

onMounted(() => {
  sprite = makeSprite();
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  const book = bookRef.value;
  const shadow = shadowRef.value;
  if (!book || !shadow) return;

  gsap.set(shadow, { xPercent: -50, opacity: 0, scale: 0.5, transformOrigin: '50% 50%' });

  // Asked for the contact form from inside the book? Skip the drop —
  // play the return: the book closes, we zoom back out, slow scroll.
  if (returnToContact.value) {
    returnToContact.value = false;
    playReturn();
    return;
  }

  if (reducedMotion()) {
    gsap.set(['.cover-kicker', '.cover-ui > *'], { opacity: 1, y: 0 });
    gsap.set(shadow, { opacity: 0.6, scale: 1 });
    gsap.set(book, { rotationX: 8, rotationY: -22, transformPerspective: 1400 });
    return;
  }

  gsap.set(book, {
    y: -window.innerHeight * 0.95,
    rotationX: 8,
    rotationY: -26,
    rotationZ: -5,
    transformPerspective: 1400,
  });
  gsap.set(['.cover-kicker', '.cover-ui > *'], { opacity: 0, y: 18 });

  // The drop: gravity in, dust up, a bounce, then settle.
  introTl = gsap.timeline({ delay: 0.35 });
  introTl
    .to(book, { y: 0, rotationZ: 0, duration: 0.8, ease: 'power2.in' })
    .add(() => land(1))
    .to(book, { scaleY: 0.93, scaleX: 1.04, duration: 0.1, ease: 'power2.out' })
    .to(book, {
      scaleY: 1,
      scaleX: 1,
      y: -54,
      rotationY: -20,
      duration: 0.32,
      ease: 'power2.out',
    })
    .to(book, { y: 0, rotationY: -22, duration: 0.42, ease: 'power2.in' })
    .add(() => land(0.45))
    .to(book, { scaleY: 0.97, scaleX: 1.015, duration: 0.09 })
    .to(book, { scaleY: 1, scaleX: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)' })
    .to(
      ['.cover-kicker', '.cover-ui > *'],
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out' },
      '-=0.35',
    );
});

onUnmounted(() => {
  introTl?.kill();
  introTl = null;
  cancelAnimationFrame(raf);
  looping = false;
  motes = [];
  window.removeEventListener('resize', sizeCanvas);
});
</script>

<template>
  <div class="cover-page">
    <section class="cover" aria-label="Cover">
      <div class="cover-glow" aria-hidden="true"></div>
      <div class="cover-scene">
        <p class="cover-kicker">A portfolio &middot; by Chris Gray</p>
        <div ref="stageRef" class="book-stage">
          <div ref="shadowRef" class="book-shadow" aria-hidden="true"></div>
          <div ref="bookRef" class="book3d" aria-hidden="true">
            <div class="b-face b-back"></div>
            <div class="b-face b-spine"><span>Gray Solutions</span></div>
            <div class="b-face b-top"></div>
            <div class="b-face b-pages"></div>
            <div class="b-face b-front">
              <div class="b-cover-frame">
                <span class="b-mark">G.</span>
                <p class="b-title">Gray<br />Solutions<em>.</em></p>
                <p class="b-tag"><em>Websites that tell stories.</em></p>
                <p class="b-by">Chris Gray</p>
              </div>
            </div>
          </div>
          <canvas ref="canvasRef" class="dust-canvas" aria-hidden="true"></canvas>
        </div>
        <div class="cover-ui">
          <div class="cover-cta">
            <button class="btn btn-solid" @click="open()">
              Open the book <span class="arrow" aria-hidden="true">&rarr;</span>
            </button>
          </div>
          <p class="cover-hint">Seven pages &middot; best read front to back</p>
        </div>
      </div>
    </section>
    <section id="contact" class="cover-contact" aria-label="Contact">
      <div class="wrap">
        <p v-reveal class="contact-kicker">Contact</p>
        <h2 v-reveal class="contact-title">
          Let&rsquo;s write <em>your story.</em>
        </h2>
        <p v-reveal class="contact-sub">
          Tell me about your business, your goals, and where your website
          stands today. Everything below is wrapped into one email —
          straight to my inbox.
        </p>
        <div v-reveal>
          <ContactForm />
        </div>
      </div>
    </section>
  </div>
</template>
