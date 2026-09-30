<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { gsap } from 'gsap';
import PullCord from './PullCord.vue';

const props = defineProps<{ bonusContent?: boolean }>();

const emit = defineEmits<{
  contact: [];
  home: [];
}>();

/** The cord lives here but only while bonus content is on. It mounts
    with the line retracted and the ball parked at the mount; the drop is
    a two-beat entrance — the line falls straight down from the header
    first, then the ball drops to the line's end. Turning bonus off draws
    the whole cord slowly straight up into the header, dissolving as it
    goes. The drop plays on the wrapper so it never fights the cord's own
    sway. */
const cordWrap = ref<HTMLElement | null>(null);
const pullCord = ref<InstanceType<typeof PullCord> | null>(null);
let cordResting = false;
let dropTl: gsap.core.Timeline | null = null;
let riseTl: gsap.core.Timeline | null = null;
/** The switch flips instantly; the cord mounts/unmounts on its own beat. */
const cordMounted = ref(false);
const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A grab during the entrance wins — stop the scheduled ball drop so it
    never fights the user's hand. */
const onCordGrabbed = () => {
  dropTl?.kill();
  dropTl = null;
};

onMounted(() => window.addEventListener('gs:cord-grabbed', onCordGrabbed));
onUnmounted(() =>
  window.removeEventListener('gs:cord-grabbed', onCordGrabbed),
);

watch(
  () => props.bonusContent,
  (on) => {
    if (!on) {
      // The switch already flipped; the cord animates out on its own
      // beat, then unmounts. (cordResting is cleared inside retractCord.)
      retractCord(() => {
        cordMounted.value = false;
      });
      return;
    }
    // KISS: the bonus switch is the cord's only trigger. Mount it parked
    // (line retracted, ball at the mount), then drop it straight down.
    cordMounted.value = true;
    nextTick(() => {
      dropCord();
    });
  },
  { immediate: true },
);

/** Two-beat entrance, straight down from the header: the line falls
    first, then the ball drops from the mount to the line's end. */
function dropCord() {
  const el = cordWrap.value;
  if (!el || cordResting) return;
  riseTl?.kill();
  riseTl = null;
  cordResting = true;
  // Parked pose: line retracted into the header, ball waiting at the mount.
  pullCord.value?.parkLine();
  pullCord.value?.parkBall();
  gsap.set(el, { y: 0, rotation: 0, opacity: 1, visibility: 'visible' });
  if (reducedMotion()) {
    pullCord.value?.settleLine();
    pullCord.value?.settleBall();
    return;
  }
  dropTl?.kill();
  dropTl = gsap
    .timeline()
    .add(() => pullCord.value?.dropLine(), 0)
    .add(() => pullCord.value?.dropBall(), 1.0);
}

/** The exit: the whole cord is drawn slowly straight up into the
    header, dissolving as it goes so the ball never slides across the
    G. mark, then hands back. */
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
  const lineEl = el.querySelector('.cord-line');
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
    // Straighten first — no fold, no swing toward the right. If the
    // entrance was interrupted mid-drop, finish growing the line so the
    // ball lands on its end.
    .to(knob, { y: 0, duration: 0.35, ease: 'sine.out' }, 0)
    .to(lineEl, { scaleY: 1, duration: 0.35, ease: 'sine.out' }, 0)
    .to(el, { rotation: 0, duration: 0.35, ease: 'sine.out' }, 0)
    // Then the slow draw upward into the header, dissolving as it rises.
    .to(el, { y: -rise, duration: 1.8, ease: 'sine.inOut' }, 0.35)
    .to(el, { opacity: 0, duration: 1.0, ease: 'sine.out' }, 0.35);
}

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
    <div v-if="cordMounted" ref="cordWrap" class="cord-drop-wrap">
      <PullCord ref="pullCord" />
    </div>
  </header>
</template>
