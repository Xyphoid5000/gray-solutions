<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';

const root = ref<HTMLElement | null>(null);
const line = ref<HTMLElement | null>(null);
const knob = ref<HTMLElement | null>(null);

const LINE_H = 104;
const PULL_MAX = 130;
const PULL_TRIGGER = 36;

let dragging = false;
let startY = 0;
let pull = 0;
let sway: gsap.core.Tween | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;

/** The cord only reports the yank — App decides what the yank means
    (plain toggle, match-lighting ritual, or smoke) and sets the theme. */
const reportYank = () => {
  window.dispatchEvent(new CustomEvent('gs:cord-pulled'));
};

const startSway = () => {
  if (!root.value || sway) return;
  sway = gsap.to(root.value, {
    rotation: 1.8,
    duration: 3.1,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut',
  });
};

const stopSway = () => {
  sway?.kill();
  sway = null;
};

/** Violent swing for the blacklight entrance: thrash side to side,
    then settle back into the gentle sway. */
const shakeViolently = () => {
  if (!root.value) return;
  stopSway();
  gsap.killTweensOf(root.value);
  gsap.fromTo(
    root.value,
    { rotation: 0 },
    {
      rotation: 22,
      duration: 0.08,
      yoyo: true,
      repeat: 9,
      ease: 'sine.inOut',
      onComplete: () => {
        gsap.set(root.value, { rotation: 0 });
        startSway();
      },
    },
  );
};

const applyPull = (dy: number) => {
  pull = Math.max(0, Math.min(PULL_MAX, dy));
  // Measure the real line height (it shrinks on mobile) so the knob
  // always rides the line's visual end instead of separating from it.
  const lineH = line.value?.offsetHeight || LINE_H;
  if (line.value) gsap.set(line.value, { scaleY: 1 + pull / lineH });
  if (knob.value) gsap.set(knob.value, { y: pull });
};

const release = () => {
  if (!dragging && pull === 0) return;
  dragging = false;
  const pulledFar = pull >= PULL_TRIGGER;
  // The cord snaps back…
  gsap.to(line.value, { scaleY: 1, duration: 0.32, ease: 'power3.out' });
  gsap.to(knob.value, { y: 0, duration: 0.32, ease: 'power3.out' });
  pull = 0;
  // …and the whole thing swings like a pendulum before settling.
  stopSway();
  gsap.fromTo(
    root.value,
    { rotation: pulledFar ? 10 : 5 },
    {
      rotation: 0,
      duration: 2.4,
      ease: 'elastic.out(1, 0.11)',
      onComplete: startSway,
    },
  );
  if (pulledFar) reportYank();
};

const onPointerDown = (e: PointerEvent) => {
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  dragging = true;
  startY = e.clientY;
  pull = 0;
  stopSway();
  gsap.set(root.value, { rotation: 0 });
};

const onPointerMove = (e: PointerEvent) => {
  if (!dragging) return;
  applyPull(e.clientY - startY);
};

const onPointerUp = () => {
  if (!dragging) return;
  if (pull < 8) {
    // A tap is a quick pull-and-let-go.
    applyPull(64);
    releaseTimer = setTimeout(() => {
      releaseTimer = null;
      release();
    }, 130);
  } else {
    release();
  }
};

// Keyboard users don't get the pull gesture — Enter/Space gives them
// the full yank treatment instead. (e.detail === 0 means keyboard;
// mouse clicks already toggled via the pointer handlers above.)
const onClick = (e: MouseEvent) => {
  if (e.detail !== 0) return;
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  stopSway();
  applyPull(64);
  releaseTimer = setTimeout(() => {
    releaseTimer = null;
    release();
  }, 130);
};

onMounted(() => {
  // The page always opens in light mode — the candle is unlit until
  // the reader pulls the cord.
  document.documentElement.dataset.theme = 'light';
  try {
    localStorage.removeItem('gs-theme');
  } catch {
    /* ignore */
  }
  startSway();
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('gs:shake-cord', shakeViolently);
});

onUnmounted(() => {
  stopSway();
  if (releaseTimer) clearTimeout(releaseTimer);
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
  window.removeEventListener('gs:shake-cord', shakeViolently);
});
</script>

<template>
  <div ref="root" class="pull-cord" aria-hidden="false">
    <span class="cord-mount" aria-hidden="true"></span>
    <span ref="line" class="cord-line" aria-hidden="true"></span>
    <button
      ref="knob"
      type="button"
      class="cord-knob"
      aria-label="Pull to toggle light and dark mode"
      title="Pull for light / dark"
      @pointerdown="onPointerDown"
      @click="onClick"
    >
      <svg class="cord-icon icon-sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2" />
        <g stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="12" y1="2.5" x2="12" y2="5.5" />
          <line x1="12" y1="18.5" x2="12" y2="21.5" />
          <line x1="2.5" y1="12" x2="5.5" y2="12" />
          <line x1="18.5" y1="12" x2="21.5" y2="12" />
          <line x1="5.3" y1="5.3" x2="7.4" y2="7.4" />
          <line x1="16.6" y1="16.6" x2="18.7" y2="18.7" />
          <line x1="5.3" y1="18.7" x2="7.4" y2="16.6" />
          <line x1="16.6" y1="7.4" x2="18.7" y2="5.3" />
        </g>
      </svg>
      <svg class="cord-icon icon-moon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>
