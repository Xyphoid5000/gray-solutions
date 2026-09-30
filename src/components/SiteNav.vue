<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { gsap } from 'gsap';
import PullCord from './PullCord.vue';

const props = defineProps<{ bonusContent?: boolean }>();

const emit = defineEmits<{
  contact: [];
  home: [];
}>();

/** The cord lives here but only while bonus content is on. It mounts
    with the ball parked up at the base behind the header; the drop is a
    two-beat entrance — the line swings down slow and graceful, then the
    ball falls to the line's end. Turning bonus off draws the whole cord
    slowly straight up into the header. The swing plays on the wrapper so
    it never fights the cord's own sway. */
const cordWrap = ref<HTMLElement | null>(null);
const pullCord = ref<InstanceType<typeof PullCord> | null>(null);
let cordResting = false;
let dropTl: gsap.core.Timeline | null = null;
let riseTl: gsap.core.Timeline | null = null;
/** Folded pose: tucked up to the right of the base, off-screen. */
const FOLDED = -150;
const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Park the cord folded up around its mount (the bracket under the G.),
    so the drop always starts attached at the base. */
function foldUp() {
  const el = cordWrap.value;
  if (!el || cordResting) return;
  const cord = el.querySelector('.pull-cord');
  const wr = el.getBoundingClientRect();
  let ox = wr.width / 2;
  let oy = wr.height / 2;
  if (cord) {
    const r = cord.getBoundingClientRect();
    ox = r.left + r.width / 2 - wr.left;
    oy = r.top - wr.top;
  }
  gsap.set(el, {
    transformOrigin: `${ox}px ${oy}px`,
    rotation: FOLDED,
    visibility: 'hidden',
  });
}

watch(
  () => props.bonusContent,
  (on) => {
    if (!on) {
      cordResting = false;
      return;
    }
    // KISS: the bonus switch is the cord's only trigger — on mount it
    // parks folded above the header, then immediately swings down.
    nextTick(() => {
      foldUp();
      dropCord();
    });
  },
  { immediate: true },
);

/** Two-beat entrance: the line swings down slow and graceful first,
    then the ball drops from up by the base to the line's end. */
function dropCord() {
  const el = cordWrap.value;
  if (!el || cordResting) return;
  riseTl?.kill();
  riseTl = null;
  foldUp();
  pullCord.value?.parkBall();
  cordResting = true;
  gsap.set(el, { y: 0, opacity: 1, visibility: 'visible' });
  if (reducedMotion()) {
    gsap.set(el, { rotation: 0 });
    pullCord.value?.settleBall();
    return;
  }
  dropTl?.kill();
  // Beat one: a gravity-weighted descent — the line falls slowly at
  // first, accelerating down like a real hanging cord. Beat two: a
  // soft pendulum wobble as it settles. Then the ball drops.
  dropTl = gsap
    .timeline()
    .fromTo(
      el,
      { rotation: FOLDED },
      { rotation: 10, duration: 1.6, ease: 'power2.in' },
      0,
    )
    .to(el, { rotation: 0, duration: 1.3, ease: 'elastic.out(1, 0.28)' }, 1.6)
    .add(() => pullCord.value?.dropBall(), 2.1);
}

/** The exit: the whole cord is drawn slowly straight up into the
    header, fading as it goes, then hands back. */
function retractCord(done: () => void) {
  const el = cordWrap.value;
  if (!el || !cordResting) {
    done();
    return;
  }
  cordResting = false;
  dropTl?.kill();
  dropTl = null;
  if (reducedMotion()) {
    done();
    return;
  }
  // How far the wrap must rise to tuck the ball fully into the header.
  const knob = el.querySelector('.cord-knob');
  const wr = el.getBoundingClientRect();
  const rise =
    (knob ? knob.getBoundingClientRect().bottom - wr.top : 200) + 24;
  riseTl?.kill();
  riseTl = gsap
    .timeline({
      onComplete: () => {
        gsap.set(el, { visibility: 'hidden', y: 0, opacity: 1 });
        riseTl = null;
        done();
      },
    })
    // Straighten first — no fold, no swing toward the right.
    .to(knob, { y: 0, duration: 0.35, ease: 'sine.out' }, 0)
    .to(el, { rotation: 0, duration: 0.35, ease: 'sine.out' }, 0)
    // Then the slow draw upward into the header.
    .to(el, { y: -rise, duration: 1.8, ease: 'sine.inOut' }, 0.35)
    .to(el, { opacity: 0, duration: 0.6, ease: 'sine.in' }, 1.55);
}

defineExpose({ dropCord, retractCord });
</script>

<template>
  <header class="site-nav site-nav-min">
    <div class="nav-inner">
      <a
        class="brand"
        href="#/"
        @click.prevent="emit('home')"
        aria-label="Gray Solutions — back to the cover"
      >
        <span class="brand-mark" aria-hidden="true">G.</span>
        <span>Gray Solutions<em>.</em></span>
      </a>
      <button class="nav-contact" @click="emit('contact')">
        Contact me
      </button>
    </div>
    <div v-if="bonusContent" ref="cordWrap" class="cord-drop-wrap">
      <PullCord ref="pullCord" />
    </div>
  </header>
</template>
