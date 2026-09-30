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
    folded up to the right of its base, out of sight; `dropCord` swings
    it down around its mount like a pendulum unfolding, and
    `retractCord` folds it back up before it unmounts. The swing plays on
    the wrapper so it never fights the cord's own sway. */
const cordWrap = ref<HTMLElement | null>(null);
let cordResting = false;
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

/** Swing the cord down from the right side of its base and let it
    settle into its sway. */
function dropCord() {
  const el = cordWrap.value;
  if (!el || cordResting) return;
  cordResting = true;
  if (reducedMotion()) {
    gsap.set(el, { rotation: 0, visibility: 'visible' });
    return;
  }
  gsap.set(el, { visibility: 'visible' });
  gsap.fromTo(
    el,
    { rotation: FOLDED },
    { rotation: 0, duration: 1.15, ease: 'elastic.out(1, 0.32)' },
  );
}

/** Fold the cord back up to the right of its base, then hand back. */
function retractCord(done: () => void) {
  const el = cordWrap.value;
  if (!el || !cordResting) {
    done();
    return;
  }
  cordResting = false;
  if (reducedMotion()) {
    done();
    return;
  }
  gsap.to(el, {
    rotation: FOLDED,
    duration: 0.5,
    ease: 'power2.in',
    onComplete: () => {
      gsap.set(el, { visibility: 'hidden' });
      done();
    },
  });
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
      <PullCord />
    </div>
  </header>
</template>
