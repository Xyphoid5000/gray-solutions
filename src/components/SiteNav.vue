<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { gsap } from 'gsap';
import PullCord from './PullCord.vue';
import { a11yModeOn, setA11yMode, initA11yMode, motionReduced } from '../utils/a11y';

const props = defineProps<{ bonusContent?: boolean }>();

const emit = defineEmits<{
  contact: [];
  home: [];
}>();

/** The cord lives here but only while bonus content is on. It mounts
    with everything hidden inside the G. emblem (the G is its housing —
    the cord container clips at the G's bottom edge). The drop is a
    three-beat entrance: the base slides slowly out of the G, the string
    drops, then the ball falls from inside the G to the string's end.
    Turning bonus off reverses it — ball, string and base all return up
    into the G, clipped, never fading through the header. The drop plays
    on the wrapper so it never fights the cord's own sway. */
const cordWrap = ref<HTMLElement | null>(null);
const pullCord = ref<InstanceType<typeof PullCord> | null>(null);
let cordResting = false;
let dropTl: gsap.core.Timeline | null = null;
let riseTl: gsap.core.Timeline | null = null;
/** The switch flips instantly; the cord mounts/unmounts on its own beat. */
const cordMounted = ref(false);
const reducedMotion = () =>
  motionReduced();

/** A grab during the entrance wins — stop the scheduled ball drop so it
    never fights the user's hand. */
const onCordGrabbed = () => {
  dropTl?.kill();
  dropTl = null;
};

/** Accessibility toggle: hidden checkbox that forces off animations. */
const a11yChecked = ref(false);

function onA11yToggle() {
  setA11yMode(a11yChecked.value);
}

onMounted(() => {
  initA11yMode();
  a11yChecked.value = a11yModeOn();
  window.addEventListener('gs:cord-grabbed', onCordGrabbed);
});
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

/** Three-beat entrance, straight down from the G. emblem: the base
    slides slowly out of the G first, then the string drops, then the
    ball falls from inside the G to the string's end. */
function dropCord() {
  const el = cordWrap.value;
  if (!el || cordResting) return;
  riseTl?.kill();
  riseTl = null;
  cordResting = true;
  // Parked pose: everything lives inside the G (clipped, invisible).
  pullCord.value?.parkBase();
  pullCord.value?.parkLine();
  pullCord.value?.parkBall();
  gsap.set(el, { y: 0, rotation: 0, opacity: 1, visibility: 'visible' });
  if (reducedMotion()) {
    pullCord.value?.settleBase();
    pullCord.value?.settleLine();
    pullCord.value?.settleBall();
    return;
  }
  dropTl?.kill();
  dropTl = gsap
    .timeline()
    .add(() => pullCord.value?.dropBase(), 0)
    .add(() => pullCord.value?.dropLine(), 0.9)
    .add(() => pullCord.value?.dropBall(), 1.9);
}

/** The exit, clipped by the G emblem: the ball rises back into the G,
    the string retracts up into the base, then the base slides slowly
    back into the G — no fade, no wrapper travel, nothing visible above
    the G's bottom edge. Then hands back for unmount. */
function retractCord(done: () => void) {
  const el = cordWrap.value;
  if (!el || !cordResting) {
    done();
    return;
  }
  cordResting = false;
  dropTl?.kill();
  dropTl = null;
  riseTl?.kill();
  riseTl = null;
  pullCord.value?.cancelDrag();
  if (reducedMotion()) {
    pullCord.value?.parkBase();
    pullCord.value?.parkLine();
    pullCord.value?.parkBall();
    done();
    return;
  }
  riseTl = gsap
    .timeline({
      onComplete: () => {
        riseTl = null;
        done();
      },
    })
    .add(() => pullCord.value?.retractBall(), 0)
    .add(() => pullCord.value?.retractLine(), 0.15)
    .add(() => pullCord.value?.retractBase(), 0.7)
    // The callbacks above fire-and-forget their tweens; hold the timeline
    // open until the base finishes sliding into the G (0.7s + 0.9s).
    .to({}, { duration: 1.6 });
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
      <!-- Hidden accessibility toggle: forces off animations for WCAG 2 compliance. -->
      <label class="a11y-toggle">
        <input
          type="checkbox"
          v-model="a11yChecked"
          @change="onA11yToggle"
          aria-label="Reduce motion and disable animations"
        />
        <span class="a11y-toggle-text" aria-hidden="true">Calm mode</span>
      </label>
    </div>
    <div v-if="cordMounted" ref="cordWrap" class="cord-drop-wrap">
      <PullCord ref="pullCord" />
    </div>
  </header>
</template>
