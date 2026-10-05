<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';

const root = ref<HTMLElement | null>(null);
const mount = ref<HTMLElement | null>(null);
const line = ref<HTMLElement | null>(null);
const knob = ref<HTMLElement | null>(null);

const LINE_H = 104;
const PULL_MAX = 130;
const PULL_TRIGGER = 36;
/** How far the base slides up to hide inside the G emblem. */
const MOUNT_HIDE = 16;

let dragging = false;
/** True while the cord is retracting into the G — grabs are ignored. */
let retracting = false;
let startY = 0;
let pull = 0;
let sway: gsap.core.Tween | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;

/** The cord only reports the yank — App decides what the yank means
    (plain toggle or a light ritual) and sets the theme. */
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

/** Startled swing for the blacklight entrance: a quick swing side to
    side, then settle back into the gentle sway. */
const shakeViolently = () => {
  if (!root.value) return;
  stopSway();
  gsap.killTweensOf(root.value);
  gsap.fromTo(
    root.value,
    { rotation: 0 },
    {
      rotation: 8,
      duration: 0.15,
      yoyo: true,
      repeat: 5,
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
  if (retracting) return;
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  dragging = true;
  startY = e.clientY;
  pull = 0;
  stopSway();
  // A grab always wins — stop any in-flight entrance first, and tell the
  // header so the scheduled ball drop never fights the user's hand.
  if (knob.value) gsap.killTweensOf(knob.value);
  if (line.value) gsap.killTweensOf(line.value);
  if (mount.value) gsap.killTweensOf(mount.value);
  window.dispatchEvent(new CustomEvent('gs:cord-grabbed'));
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

/** Park the base up inside the G emblem (clipped, invisible) — the
    entrance starts with everything living inside the G. */
const parkBase = () => {
  if (!mount.value) return;
  retracting = false;
  gsap.killTweensOf(mount.value);
  gsap.set(mount.value, { y: -MOUNT_HIDE });
};

/** The base slowly slides out of the bottom of the G. */
const dropBase = () => {
  if (!mount.value) return;
  gsap.killTweensOf(mount.value);
  gsap.to(mount.value, { y: 0, duration: 0.9, ease: 'sine.out' });
};

/** Base in place, no animation (reduced motion). */
const settleBase = () => {
  if (!mount.value) return;
  gsap.killTweensOf(mount.value);
  gsap.set(mount.value, { y: 0 });
};

/** The base slides back up into the G (clipped — never fades through
    the header). */
const retractBase = () => {
  if (!mount.value) return;
  gsap.killTweensOf(mount.value);
  gsap.to(mount.value, { y: -MOUNT_HIDE, duration: 0.9, ease: 'sine.in' });
};

/** Park the line fully retracted into the header — the entrance starts
    with the cord alone, dropping straight down from the mount. */
const parkLine = () => {
  if (!line.value) return;
  gsap.killTweensOf(line.value);
  gsap.set(line.value, { scaleY: 0 });
};

/** The cord drops: the line falls straight down from the header,
    accelerating like gravity. */
const dropLine = () => {
  if (!line.value) return;
  gsap.killTweensOf(line.value);
  gsap.to(line.value, { scaleY: 1, duration: 1.0, ease: 'power2.in' });
};

/** Line to full length, no animation (reduced motion). */
const settleLine = () => {
  if (!line.value) return;
  gsap.killTweensOf(line.value);
  gsap.set(line.value, { scaleY: 1 });
};

/** The line retracts up into the base (clipped by the G — never visible
    above the emblem). */
const retractLine = () => {
  if (!line.value) return;
  gsap.killTweensOf(line.value);
  gsap.to(line.value, { scaleY: 0, duration: 0.6, ease: 'sine.in' });
};

/** How far up the ball must go to hide fully above the header. The cord's
    top edge sits at the G's bottom (53px from viewport top); the knob's
    layout origin is 112px below that, so y must clear -(53 + 112) = -165.
    -200 parks it 35px above the viewport top — fully hidden, never
    overlapping the logo. (Matches the CSS initial parked transform.) */
const ballHideY = () => -200;

/** Park the ball up above the header (fully hidden) — it lives up there
    until the string has dropped, so it never overlaps the logo. */
const parkBall = () => {
  if (!knob.value || !line.value) return;
  gsap.killTweensOf(knob.value);
  gsap.set(knob.value, { y: ballHideY() });
};

/** The ball falls from inside the G to the line's end. */
const dropBall = () => {
  if (!knob.value) return;
  gsap.killTweensOf(knob.value);
  gsap.to(knob.value, { y: 0, duration: 0.8, ease: 'bounce.out' });
};

/** The ball rises back into the G (clipped — never visible above the
    emblem). Grabs are ignored from here until the next entrance. */
const retractBall = () => {
  if (!knob.value || !line.value) return;
  retracting = true;
  gsap.killTweensOf(knob.value);
  gsap.to(knob.value, { y: ballHideY(), duration: 0.6, ease: 'sine.in' });
};

/** Ball to the line's end, no animation (reduced motion). */
const settleBall = () => {
  if (!knob.value) return;
  gsap.killTweensOf(knob.value);
  gsap.set(knob.value, { y: 0 });
};

/** Stop an in-flight drag (e.g. bonus is switched off mid-pull). */
const cancelDrag = () => {
  dragging = false;
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  if (knob.value) gsap.killTweensOf(knob.value);
  if (line.value) gsap.killTweensOf(line.value);
  if (mount.value) gsap.killTweensOf(mount.value);
};

defineExpose({
  parkBase,
  dropBase,
  settleBase,
  retractBase,
  parkLine,
  dropLine,
  settleLine,
  retractLine,
  parkBall,
  dropBall,
  settleBall,
  retractBall,
  cancelDrag,
});

onMounted(() => {
  // Park everything inside the G before the first paint — the CSS above
  // holds the parked pose until JS refines it; the entrance (or the
  // reduced-motion settle) takes it from here.
  parkBase();
  parkLine();
  parkBall();
  // App forces the opening theme; the cord just sways and reports yanks.
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
    <span ref="mount" class="cord-mount" aria-hidden="true"></span>
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
