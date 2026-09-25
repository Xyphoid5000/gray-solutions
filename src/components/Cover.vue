<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';
import ContactForm from './ContactForm.vue';
import AboutMe from './AboutMe.vue';
import { returnToSection } from '../lib/ui';
import { scrollSlowTo } from '../lib/scroll';
import { manuscriptBound } from '../lib/manuscript';

const emit = defineEmits(['open-book']);

/** The manuscript becomes a book once the reader finishes and binds it.
    Resets on refresh — every visit starts with the manuscript.
    App marks the shared module ref directly when binding completes. */
const isBound = manuscriptBound;

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

// --- Rotatable book -------------------------------------------------
// The book can be spun by dragging it (front, back, sides). Scrolling
// the home page also steers it: at the top it faces the reader, and by
// the about section it has turned its back — so scrolling back up
// rotates it around to face the reader again. `autoY` is the scroll
// pose, `manualY`/`manualX` are the drag offset (which scrolling eases
// back toward zero so the intended pose re-asserts itself).
const REST_Y = -22;
const REST_X = 8;
const AWAY_Y = REST_Y + 180;

let autoY = REST_Y;
let manualY = 0;
let manualX = 0;
let spinEnabled = false;
let dragging = false;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

function applySpin() {
  const book = bookRef.value;
  if (!book) return;
  gsap.set(book, {
    rotationY: autoY + manualY,
    rotationX: REST_X + manualX,
    transformPerspective: 1400,
  });
}

function updateSpinFromScroll() {
  const about = document.getElementById('about');
  const book = bookRef.value;
  if (!about || !book) return;
  const aboutTop = about.getBoundingClientRect().top + window.scrollY;
  const max = Math.max(1, aboutTop - window.innerHeight * 0.3);
  const p = clamp(window.scrollY / max, 0, 1);
  autoY = REST_Y + p * 180;
  // Scrolling re-asserts the intended pose; ease the manual offset away.
  manualY *= 0.86;
  manualX *= 0.86;
  if (Math.abs(manualY) < 0.05) manualY = 0;
  if (Math.abs(manualX) < 0.05) manualX = 0;
  applySpin();
}

function onScrollSpin() {
  if (!spinEnabled || dragging || reducedMotion()) return;
  updateSpinFromScroll();
}

// Drag-to-rotate on the stage. Horizontal drags spin the book;
// vertical drags are left to the page (touch-action: pan-y).
let dragPointerId: number | null = null;
let dragStartX = 0;
let dragStartY = 0;
let dragLastX = 0;
let dragLastY = 0;
let dragCommitted = false;

function onStagePointerDown(e: PointerEvent) {
  if (!spinEnabled) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  dragPointerId = e.pointerId;
  dragStartX = dragLastX = e.clientX;
  dragStartY = dragLastY = e.clientY;
  dragCommitted = false;
}

function onStagePointerMove(e: PointerEvent) {
  if (e.pointerId !== dragPointerId) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) {
    // Released off-stage — end the drag so hover can't spin the book.
    dragPointerId = null;
    dragCommitted = false;
    dragging = false;
    return;
  }
  const dxTotal = e.clientX - dragStartX;
  const dyTotal = e.clientY - dragStartY;
  if (!dragCommitted) {
    if (Math.abs(dxTotal) > 14 && Math.abs(dxTotal) > Math.abs(dyTotal) * 1.3) {
      dragCommitted = true;
    } else {
      // Primarily vertical (or still ambiguous) — let the page scroll.
      if (Math.abs(dyTotal) > 14 || Math.abs(dxTotal) > 48) dragPointerId = null;
      return;
    }
  }
  const dx = e.clientX - dragLastX;
  const dy = e.clientY - dragLastY;
  dragLastX = e.clientX;
  dragLastY = e.clientY;
  dragging = true;
  manualY = clamp(manualY + dx * 0.5, -320, 320);
  manualX = clamp(manualX + dy * 0.3, -30, 34);
  applySpin();
}

function endStageDrag(e: PointerEvent) {
  if (e.pointerId !== dragPointerId) return;
  dragPointerId = null;
  dragCommitted = false;
  dragging = false;
}

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
 * How the book must be transformed — squared to camera and settled —
 * so it lands in the manuscript's page lane: the same centered column
 * where chapter 1's page lives, desk around it. Measures the book
 * flattened (resting 3D tilt would shrink the reading) and restores
 * the resting pose before returning.
 */
function laneFit() {
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
  // The manuscript page lane: desk side lanes clear, page max 640 wide.
  const narrow = window.matchMedia('(max-width: 640px)').matches;
  const pl = narrow ? 70 : 120;
  const pr = narrow ? 44 : 60;
  const laneW = Math.max(0, window.innerWidth - pl - pr);
  const targetW = Math.min(640, laneW);
  const scale = targetW / r.width;
  const targetH = r.height * scale;
  const cx = pl + laneW / 2;
  const top = 72 + 12; // below the fixed nav, where the page begins
  return {
    scale,
    x: cx - (r.left + r.width / 2),
    y: top + targetH / 2 - (r.top + r.height / 2),
  };
}

function open() {
  if (reducedMotion()) {
    emit('open-book');
    return;
  }
  introTl?.kill();
  spinEnabled = false;
  dragging = false;
  dragPointerId = null;
  const book = bookRef.value;
  if (!book) {
    emit('open-book');
    return;
  }
  const fit = laneFit();
  // Open the book: the desk fades in, the book squares to the camera and
  // glides into the manuscript's page lane — then the swap lands chapter
  // 1's page exactly where the cover settled.
  const tl = gsap.timeline({ onComplete: () => emit('open-book') });
  tl.to('.cover-ui, .cover-kicker', { opacity: 0, y: -24, duration: 0.45, ease: 'power2.in' }, 0)
    .to('.cover-desk', { opacity: 1, duration: 0.9, ease: 'power1.inOut' }, 0)
    .to('.cover-glow', { opacity: 0.2, duration: 0.9, ease: 'power1.inOut' }, 0)
    .to('.book-shadow', { opacity: 0, scale: 1.5, duration: 0.9, ease: 'power2.in' }, 0)
    .to(
      book,
      { rotationX: 0, rotationY: 0, duration: 0.9, ease: 'power2.inOut' },
      0.35,
    )
    .to(
      book,
      {
        x: fit ? fit.x : 0,
        y: fit ? fit.y : 0,
        scale: fit ? fit.scale : 1,
        rotationZ: 0,
        duration: 1.3,
        ease: 'power2.inOut',
      },
      1.0,
    );
}

/**
 * The reverse journey: the reader asked for the contact form from
 * somewhere inside the book. We arrive already dived into the cover —
 * the book closes, the camera eases back out to the full scene, and
 * then we drift slowly down to the form.
 */
function playReturn(target: 'contact' | 'about') {
  const book = bookRef.value;
  if (!book) return;
  if (reducedMotion()) {
    document.getElementById(target)?.scrollIntoView();
    return;
  }
  // The book turns its back as it lands — scrolling back up will swing
  // it around to face the reader again.
  spinEnabled = false;
  dragging = false;
  dragPointerId = null;
  autoY = AWAY_Y;
  manualY = 0;
  manualX = 0;
  // Start where open() left off: squared to camera, settled in the
  // page lane — then ease back out, turning its back to the reader.
  const fit = laneFit();
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
  // Start where open() left off: desk visible, book in the page lane.
  gsap.set('.cover-scene', { y: 0 });
  gsap.set('.cover-desk', { opacity: 1 });

  const tl = gsap.timeline();
  tl.to(
      book,
      {
        x: 0,
        y: 0,
        scale: 1,
        rotationX: 8,
        rotationY: AWAY_Y,
        duration: 1.9,
        ease: 'power2.inOut',
      },
      0.25,
    )
    // Reverse of the open: the book turns away, the camera settles back
    // down, and the desk fades out.
    .to('.cover-scene', { y: 0, duration: 1.4, ease: 'power2.inOut' }, 0.6)
    .to('.cover-desk', { opacity: 0, duration: 1.0, ease: 'power1.inOut' }, 1.0)
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
      const el = document.getElementById(target);
      if (el) {
        let spinOn = false;
        const enableSpin = () => {
          if (spinOn) return;
          spinOn = true;
          // The return scroll is done (or was grabbed mid-flight) — the
          // scroll pose takes over from here.
          spinEnabled = true;
          updateSpinFromScroll();
        };
        scrollSlowTo(el, enableSpin);
        // Fallback: Lenis only fires onComplete on a clean finish. If the
        // reader grabs the scroll mid-return, re-enable on a timer so the
        // book can never get stuck facing away.
        window.setTimeout(enableSpin, 3800);
      } else {
        spinEnabled = true;
      }
    }, 2.1);
}

onMounted(() => {
  sprite = makeSprite();
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);
  window.addEventListener('scroll', onScrollSpin, { passive: true });

  const book = bookRef.value;
  const shadow = shadowRef.value;
  if (!book || !shadow) return;

  gsap.set(shadow, { xPercent: -50, opacity: 0, scale: 0.5, transformOrigin: '50% 50%' });

  // Asked for a home-page section from inside the book? Skip the drop —
  // play the return: the book closes, we zoom back out, slow scroll.
  const returnTarget = returnToSection.value;
  if (returnTarget) {
    returnToSection.value = null;
    playReturn(returnTarget);
    return;
  }

  if (reducedMotion()) {
    gsap.set(['.cover-kicker', '.cover-ui > *'], { opacity: 1, y: 0 });
    gsap.set(shadow, { opacity: 0.6, scale: 1 });
    gsap.set(book, { rotationX: 8, rotationY: -22, transformPerspective: 1400 });
    // Manual drag still works; the scroll pose stays put.
    spinEnabled = true;
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
    )
    .add(() => {
      // The drop is done — hand the book to the reader: draggable, and
      // scroll-linked from here on.
      autoY = REST_Y;
      manualY = 0;
      manualX = 0;
      spinEnabled = true;
      updateSpinFromScroll();
    });
});

onUnmounted(() => {
  introTl?.kill();
  introTl = null;
  cancelAnimationFrame(raf);
  looping = false;
  motes = [];
  spinEnabled = false;
  dragging = false;
  dragPointerId = null;
  window.removeEventListener('resize', sizeCanvas);
  window.removeEventListener('scroll', onScrollSpin);
});
</script>

<template>
  <div class="cover-page">
    <section class="cover" aria-label="Cover">
      <div class="cover-desk" aria-hidden="true"></div>
      <div class="cover-glow" aria-hidden="true"></div>
      <div class="cover-scene">
        <p class="cover-kicker">A portfolio &middot; by Chris Gray</p>
        <div
          ref="stageRef"
          class="book-stage"
          @pointerdown="onStagePointerDown"
          @pointermove="onStagePointerMove"
          @pointerup="endStageDrag"
          @pointercancel="endStageDrag"
          @pointerleave="endStageDrag"
        >
          <div ref="shadowRef" class="book-shadow" aria-hidden="true"></div>
          <!-- Bound book: 3D. Manuscript: a flat loose stack (no 3D glitches). -->
          <div
            v-if="isBound"
            ref="bookRef"
            class="book3d"
            aria-hidden="true"
          >
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
          <div v-else ref="bookRef" class="manuscript-stack" aria-hidden="true">
            <div class="ms-page ms-p3"></div>
            <div class="ms-page ms-p2"></div>
            <div class="ms-page ms-p1">
              <div class="b-manuscript-frame">
                <p class="b-stamp">Manuscript</p>
                <p class="b-msub">Six pages &middot; first draft</p>
              </div>
            </div>
          </div>
          <canvas ref="canvasRef" class="dust-canvas" aria-hidden="true"></canvas>
        </div>
        <div class="cover-ui">
          <div class="cover-cta">
            <button class="btn btn-solid" @click="open()">
              {{ isBound ? 'Open the book' : 'Read the manuscript' }} <span class="arrow" aria-hidden="true">&rarr;</span>
            </button>
          </div>
          <p class="cover-hint">Six pages &middot; best read front to back</p>
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
    <section v-reveal id="about" class="about-section" aria-label="About me">
      <div class="wrap">
        <AboutMe />
      </div>
    </section>
  </div>
</template>
