<script setup lang="ts">
import { ref } from 'vue';
import { gsap } from 'gsap';

const emit = defineEmits<{
  done: [];
}>();

const overlay = ref<HTMLElement | null>(null);
const stack = ref<HTMLElement | null>(null);
const coverEl = ref<HTMLElement | null>(null);
const handL = ref<HTMLElement | null>(null);
const handR = ref<HTMLElement | null>(null);
const playing = ref(false);
const titleTyped = ref('');
const TITLE = 'Gray Solutions';

let tl: gsap.core.Timeline | null = null;

/** Restore the overlay to its resting state and hand off. */
function finish() {
  const ov = overlay.value;
  titleTyped.value = TITLE;
  if (ov) gsap.set(ov, { display: 'none', opacity: 0 });
  if (stack.value) stack.value.innerHTML = '';
  gsap.set(coverEl.value, { clearProps: 'all', display: 'none', opacity: 0 });
  gsap.set([handL.value, handR.value], {
    clearProps: 'transform,opacity',
    opacity: 0,
  });
  playing.value = false;
  tl = null;
  emit('done');
}

/** Skip to the finished book. */
function skip() {
  if (tl) tl.progress(1);
}

/**
 * The binding, beat by beat: the finished pages are gathered from the
 * pile, fanned out and reordered into a neat stack, pressed by the
 * hands, wrapped in the cover, titled, and dropped back into the
 * book's spot on the home page.
 */
function start() {
  const ov = overlay.value;
  const st = stack.value;
  const cv = coverEl.value;
  const hl = handL.value;
  const hr = handR.value;
  if (!ov || !st || !cv || !hl || !hr) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    .matches;
  if (reduced) {
    emit('done');
    return;
  }

  gsap.set(ov, { display: 'block', opacity: 0 });
  gsap.set(cv, { display: 'none', opacity: 0, y: 0, scale: 0.94 });
  gsap.set([hl, hr], { opacity: 0 });
  gsap.set(st, { scaleY: 1 });
  titleTyped.value = '';
  st.innerHTML = '';
  playing.value = true;

  // Gather: clone the pile pages (the real pile stays intact).
  const pilePages = [
    ...document.querySelectorAll('.read-pile .pile-page'),
  ] as HTMLElement[];
  pilePages.forEach((p) => {
    const clone = p.cloneNode(true) as HTMLElement;
    clone.removeAttribute('data-pile-index');
    clone.setAttribute('aria-hidden', 'true');
    st.appendChild(clone);
    gsap.set(clone, { position: 'absolute', inset: '0' });
  });
  // A few blank pages stand in for the page being finished now.
  for (let i = 0; i < 3; i++) {
    const blank = document.createElement('div');
    blank.className = 'bind-page';
    st.appendChild(blank);
  }

  const pages = [...st.children] as HTMLElement[];
  const n = pages.length;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  // Where each page rests once stacked at the center.
  const restX = pages.map((p) => {
    const r = p.getBoundingClientRect();
    return cx - (r.left + r.width / 2);
  });
  const restY = pages.map((p) => {
    const r = p.getBoundingClientRect();
    return cy - (r.top + r.height / 2);
  });

  tl = gsap.timeline({ onComplete: finish });
  const timeline = tl as gsap.core.Timeline;

  // Beat 1 — the overlay rises; pages fly in from the pile.
  timeline.to(ov, { opacity: 1, duration: 0.5 }, 0);
  pages.forEach((p, i) => {
    timeline.fromTo(
      p,
      { x: 0, y: 0, rotation: (gsap.getProperty(p, 'rotation') as number) || 0 },
      {
        x: restX[i],
        y: restY[i],
        rotation: 0,
        duration: 1.1,
        ease: 'power2.inOut',
      },
      0.4 + i * 0.1,
    );
  });
  const gatheredAt = 0.4 + (n - 1) * 0.1 + 1.1;

  // Beat 2 — reorder: the pages fan out, hold, then settle in order.
  // The fan stays inside the viewport on phones.
  const fanStep = Math.min(
    46,
    (window.innerWidth * 0.92 - 220) / 2 / ((n - 1) / 2),
  );
  const fanAt = gatheredAt + 0.2;
  pages.forEach((p, i) => {
    const spread = (i - (n - 1) / 2) * fanStep;
    timeline.to(
      p,
      {
        x: restX[i] + spread,
        rotation: spread * 0.06,
        duration: 0.5,
        ease: 'power2.out',
      },
      fanAt + i * 0.04,
    );
  });
  const fannedAt = fanAt + (n - 1) * 0.04 + 0.5;
  const settleAt = fannedAt + 0.8;
  pages.forEach((p, i) => {
    timeline.to(
      p,
      { x: restX[i], y: restY[i], rotation: 0, duration: 0.45, ease: 'power2.inOut' },
      settleAt + i * 0.05,
    );
  });
  const settledAt = settleAt + (n - 1) * 0.05 + 0.45;

  // Beat 3 — hands slide in and press the stack.
  const pressAt = settledAt + 0.25;
  timeline.set([hl, hr], { opacity: 1 }, pressAt);
  timeline.to(hl, { x: 0, duration: 0.7, ease: 'power3.out' }, pressAt);
  timeline.to(hr, { x: 0, duration: 0.7, ease: 'power3.out' }, pressAt);
  timeline.to(
    st,
    { scaleY: 0.92, duration: 0.35, ease: 'power2.inOut', yoyo: true, repeat: 1 },
    pressAt + 0.75,
  );
  timeline.to(hl, { x: '-120vw', duration: 0.6, ease: 'power3.in' }, pressAt + 1.55);
  timeline.to(hr, { x: '120vw', duration: 0.6, ease: 'power3.in' }, pressAt + 1.55);
  timeline.set([hl, hr], { opacity: 0 }, pressAt + 2.2);

  // Beat 4 — the cover binds around the stack.
  const coverAt = pressAt + 2.3;
  timeline.set(cv, { display: 'flex', opacity: 0, scale: 0.94 }, coverAt);
  timeline.to(cv, { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out' }, coverAt);

  // Beat 5 — the title is written on.
  const titleAt = coverAt + 1.0;
  for (let i = 0; i < TITLE.length; i++) {
    const ch = TITLE[i];
    timeline.call(
      () => {
        titleTyped.value += ch;
      },
      [],
      titleAt + i * 0.09,
    );
  }
  const heldAt = titleAt + TITLE.length * 0.09 + 1.5;

  // Beat 6 — the finished book drops back into its spot on the home
  // page as the overlay fades.
  timeline.to(cv, { y: 70, duration: 0.55, ease: 'bounce.out' }, heldAt);
  timeline.to(ov, { opacity: 0, duration: 0.6 }, heldAt + 0.4);
}

defineExpose({ start });
</script>

<template>
  <div
    ref="overlay"
    class="bind-overlay"
    role="dialog"
    aria-label="Binding the manuscript"
  >
    <button
      v-if="playing"
      type="button"
      class="bind-skip"
      @click="skip"
    >
      Skip
    </button>
    <!-- The neat stack forms here. -->
    <div ref="stack" class="bind-stack" aria-hidden="true"></div>

    <!-- Hands: flat silhouettes, pressing the stack. -->
    <div ref="handL" class="bind-hand bind-hand-l" aria-hidden="true">
      <svg viewBox="0 0 140 90" fill="currentColor" aria-hidden="true">
        <path
          d="M8 45 C8 28 20 18 38 18 L84 18 C90 18 94 22 94 28 L94 62 C94 68 90 72 84 72 L38 72 C20 72 8 62 8 45 Z"
        />
        <rect x="94" y="24" width="38" height="10" rx="5" />
        <rect x="94" y="38" width="44" height="10" rx="5" />
        <rect x="94" y="52" width="36" height="10" rx="5" />
        <path d="M30 72 C36 84 52 88 64 82 L70 78 L62 70 C52 74 40 72 34 64 Z" />
      </svg>
    </div>
    <div ref="handR" class="bind-hand bind-hand-r" aria-hidden="true">
      <svg viewBox="0 0 140 90" fill="currentColor" aria-hidden="true">
        <path
          d="M132 45 C132 28 120 18 102 18 L56 18 C50 18 46 22 46 28 L46 62 C46 68 50 72 56 72 L102 72 C120 72 132 62 132 45 Z"
        />
        <rect x="8" y="24" width="38" height="10" rx="5" />
        <rect x="2" y="38" width="44" height="10" rx="5" />
        <rect x="10" y="52" width="36" height="10" rx="5" />
        <path
          d="M110 72 C104 84 88 88 76 82 L70 78 L78 70 C88 74 100 72 106 64 Z"
        />
      </svg>
    </div>

    <!-- The bound book cover. -->
    <div ref="coverEl" class="bind-cover" aria-hidden="true">
      <div class="bind-cover-inner">
        <p class="bind-title">{{ titleTyped }}<span class="type-cursor"></span></p>
        <p class="bind-sub">A Gray Solutions manuscript, bound</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bind-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: none;
  background:
    radial-gradient(
      120% 90% at 50% 10%,
      rgba(58, 36, 22, 0.98) 0%,
      rgba(32, 19, 12, 0.99) 55%,
      rgba(18, 11, 7, 1) 100%
    );
  overflow: hidden;
}
.bind-skip {
  position: absolute;
  top: max(1rem, env(safe-area-inset-top));
  right: 1.1rem;
  z-index: 2;
  background: none;
  border: 1px solid rgba(235, 225, 210, 0.35);
  border-radius: 999px;
  color: rgba(235, 225, 210, 0.75);
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.55em 1.1em;
  cursor: pointer;
}
.bind-skip:active {
  background: rgba(235, 225, 210, 0.12);
}
.bind-stack {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 220px;
  height: 300px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.bind-stack .bind-page,
.bind-stack .pile-page {
  position: absolute;
  inset: 0;
  background: var(--page);
  border: 1px solid var(--line-soft);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}
.bind-hand {
  position: absolute;
  top: 50%;
  width: min(320px, 42vw);
  color: rgba(12, 8, 5, 0.92);
  opacity: 0;
  transform: translateY(-50%);
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.5));
}
.bind-hand-l {
  left: -4vw;
  transform: translate(-120%, -50%);
}
.bind-hand-r {
  right: -4vw;
  transform: translate(120%, -50%);
}
.bind-hand svg {
  width: 100%;
  height: auto;
  display: block;
}
.bind-cover {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 260px;
  height: 340px;
  transform: translate(-50%, -50%);
  display: none;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #1a120b 0%, #0f0a06 100%);
  border: 1px solid rgba(208, 138, 78, 0.35);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.6),
    inset 0 0 40px rgba(0, 0, 0, 0.5);
}
.bind-cover-inner {
  text-align: center;
  padding: 2rem;
}
.bind-title {
  font-family: var(--font-display);
  font-size: 1.8rem;
  color: var(--ember);
  margin: 0 0 0.5rem;
  min-height: 2.2em;
}
.bind-sub {
  font-size: 0.8rem;
  color: rgba(235, 225, 210, 0.55);
  margin: 0;
}
</style>
