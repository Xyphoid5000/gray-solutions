<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { gsap } from 'gsap';
import PullCord from './PullCord.vue';
import { a11yModeOn, setA11yMode, initA11yMode, motionReduced } from '../utils/a11y';
import { useSettingsStore } from '../stores/settings';
import { storeToRefs } from 'pinia';

const props = defineProps<{ bonusContent?: boolean }>();
const { siteName, logoMark } = storeToRefs(useSettingsStore());

const emit = defineEmits<{
  contact: [];
  home: [];
}>();

const router = useRouter();
const route = useRoute();

/** Mobile menu open state. */
const menuOpen = ref(false);
/** Desktop "more pages" menu open state. */
const desktopMenuOpen = ref(false);
function closeMenu() { menuOpen.value = false; }
function goContact() { closeMenu(); emit('contact'); }
function goHome() { closeMenu(); emit('home'); }
/** About/Projects are plain routes — no binding logic, just go. */
function goPath(path: string) {
  menuOpen.value = false;
  desktopMenuOpen.value = false;
  if (route.path !== path) router.push(path);
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}

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
    never fights the user's hand, and drop the animation clipping. */
const onCordGrabbed = () => {
  dropTl?.kill();
  dropTl = null;
  pullCord.value?.setAnimating(false);
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
  pullCord.value?.setAnimating(true);
  gsap.set(el, { y: 0, rotation: 0, opacity: 1, visibility: 'visible' });
  if (reducedMotion()) {
    pullCord.value?.settleBase();
    pullCord.value?.settleLine();
    pullCord.value?.settleBall();
    pullCord.value?.setAnimating(false);
    return;
  }
  dropTl?.kill();
  dropTl = gsap
    .timeline({
      onComplete: () => {
        dropTl = null;
        pullCord.value?.setAnimating(false);
      },
    })
    .add(() => pullCord.value?.dropBase(), 0)
    .add(() => pullCord.value?.dropLine(), 0.9)
    .add(() => pullCord.value?.dropBall(), 1.9)
    // The callbacks above fire-and-forget their tweens; hold the timeline
    // open until the ball finishes falling (1.9s + 0.8s).
    .to({}, { duration: 2.7 });
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
  pullCord.value?.setAnimating(true);
  if (reducedMotion()) {
    pullCord.value?.parkBase();
    pullCord.value?.parkLine();
    pullCord.value?.parkBall();
    pullCord.value?.setAnimating(false);
    done();
    return;
  }
  riseTl = gsap
    .timeline({
      onComplete: () => {
        riseTl = null;
        pullCord.value?.setAnimating(false);
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
        :aria-label="`${siteName} — back to the cover`"
      >
        <span class="brand-mark" aria-hidden="true">{{ logoMark }}</span>
        <span>{{ siteName }}<em>.</em></span>
        <span v-if="cordMounted" ref="cordWrap" class="brand-cord-wrap">
          <PullCord ref="pullCord" />
        </span>
      </a>
      <button class="nav-contact" @click="emit('contact')">
        Contact me
      </button>
    <!-- Desktop hamburger: About and Projects live here. -->
    <button
      type="button"
      class="nav-hamburger nav-hamburger-desktop"
      :class="{ open: desktopMenuOpen }"
      @click="desktopMenuOpen = !desktopMenuOpen"
      :aria-label="desktopMenuOpen ? 'Close menu' : 'More pages'"
      :aria-expanded="desktopMenuOpen"
    >
      <span></span><span></span><span></span>
    </button>
    <div v-if="desktopMenuOpen" class="nav-dropdown-menu">
      <button type="button" @click="goPath('/about')">About me</button>
      <button type="button" @click="goPath('/projects')">Projects</button>
    </div>
    <!-- Mobile hamburger. -->
    <button
      type="button"
      class="nav-hamburger"
      :class="{ open: menuOpen }"
      @click="menuOpen = !menuOpen"
      :aria-label="menuOpen ? 'Close menu' : 'Menu'"
      :aria-expanded="menuOpen"
    >
      <span></span><span></span><span></span>
    </button>
    <!-- Mobile menu. -->
    <div v-if="menuOpen" class="nav-mobile-menu">
      <button type="button" @click="goHome">Home</button>
      <button type="button" @click="goContact">Contact me</button>
      <button type="button" @click="goPath('/about')">About me</button>
      <button type="button" @click="goPath('/projects')">Projects</button>
    </div>
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

  </header>
</template>
