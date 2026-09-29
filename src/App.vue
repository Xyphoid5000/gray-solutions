<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SiteNav from './components/SiteNav.vue';
import Cover from './components/Cover.vue';
import BookView from './components/BookView.vue';
import BindCinematic from './components/BindCinematic.vue';
import RemoteControl from './components/RemoteControl.vue';
import DeskClutter from './components/DeskClutter.vue';
import FirstDraft from './components/FirstDraft.vue';
import DeskPhone from './components/DeskPhone.vue';
import DeskPencil from './components/DeskPencil.vue';
import RemoteHand from './components/RemoteHand.vue';
import { setLenis } from './lib/scroll';
import { manuscriptBound, markManuscriptBound } from './lib/manuscript';

gsap.registerPlugin(ScrollTrigger);

/** The book is a SPA now — no router. Shelf or the open book, with a
    camera tilt between them. `showBook` is the logical state; the mount
    flags let a tilt hold both views at once. */
const showBook = ref(false);
const homeMounted = ref(true);
const bookMounted = ref(false);
const cameraMoving = ref(false);
/** True while the binding's shelf beat reveals the home page's real
 * bookshelf behind the cinematic; hides the manuscript stack so the
 * filing reads clean. */
const shelfReveal = ref(false);
/** Bumped when the binding finishes so the home page's bound book
 * drops in after the fade. */
const boundBookDrop = ref(0);

function noScroll(on: boolean) {
  document.documentElement.classList.toggle('gs-no-scroll', on);
}

/** Tilt down: the shelf glides up and away, the desk glides in from below. */
async function openBook() {
  if (showBook.value || cameraMoving.value) return;
  if (reducedMotion()) {
    showBook.value = true;
    bookMounted.value = true;
    homeMounted.value = false;
    window.scrollTo(0, 0);
    enterBookLighting();
    return;
  }
  cameraMoving.value = true;
  noScroll(true);
  showBook.value = true;
  bookMounted.value = true;
  await nextTick();
  const home = document.querySelector('.view-home') as HTMLElement | null;
  const book = document.querySelector('.view-book') as HTMLElement | null;
  const vh = window.innerHeight;
  window.scrollTo(0, 0);
  if (home && book) {
    gsap.set(book, { y: vh * 0.6, opacity: 0 });
    await gsap
      .timeline()
      .to(
        home,
        {
          y: -vh * 0.35,
          opacity: 0,
          scale: 0.98,
          duration: 1.25,
          ease: 'power3.inOut',
        },
        0,
      )
      .to(book, { y: 0, opacity: 1, duration: 1.25, ease: 'power3.inOut' }, 0)
      .then();
    gsap.set(book, { clearProps: 'all' });
  }
  homeMounted.value = false;
  cameraMoving.value = false;
  noScroll(false);
  enterBookLighting();
}

/** Tilt up: the desk slides away below, the shelf glides back in. */
async function tiltUp() {
  if (!showBook.value || cameraMoving.value) return;
  if (reducedMotion()) {
    clearLedScene();
    closeBook();
    window.scrollTo(0, 0);
    return;
  }
  cameraMoving.value = true;
  noScroll(true);
  showBook.value = false;
  homeMounted.value = true;
  await nextTick();
  const home = document.querySelector('.view-home') as HTMLElement | null;
  const book = document.querySelector('.view-book') as HTMLElement | null;
  const vh = window.innerHeight;
  window.scrollTo(0, 0);
  if (home && book) {
    gsap.set(home, { y: -vh * 0.35, opacity: 0, scale: 0.98 });
    await gsap
      .timeline()
      .to(
        book,
        { y: vh * 0.6, opacity: 0, duration: 1.15, ease: 'power3.inOut' },
        0,
      )
      .to(
        home,
        { y: 0, opacity: 1, scale: 1, duration: 1.15, ease: 'power3.inOut' },
        0,
      )
      .then();
    gsap.set(home, { clearProps: 'all' });
  }
  bookMounted.value = false;
  cameraMoving.value = false;
  noScroll(false);
  clearLedScene();
}

/** Instant close — used under the binding's blackout, where the swap
    is invisible. */
function closeBook() {
  clearLedScene();
  showBook.value = false;
  bookMounted.value = false;
  homeMounted.value = true;
}
async function closeBookToSection(section: 'about' | 'contact', after = 100) {
  if (showBook.value) await tiltUp();
  else closeBook();
  // After the shelf is back, scroll to the section.
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
    }, after);
  });
}
/** Any road to Contact runs through the binding — once per visit.
    "Start your story" on the Finale binds the manuscript before the
    contact form; so does the header's CONTACT ME while the book is
    open. The book-closed header link just scrolls (nothing to bind). */
const bindCinematic = ref<InstanceType<typeof BindCinematic> | null>(null);
const bookView = ref<InstanceType<typeof BookView> | null>(null);
/** The binding, from any trigger: the open page joins the pile first so
    the final page is really in the list, then the cinematic gathers it. */
async function runBinding() {
  if (manuscriptBound.value || !bindCinematic.value) return;
  await bookView.value?.tossCurrentToPile();
  bindCinematic.value.start();
}
function onFinaleContact() {
  if (!manuscriptBound.value && bindCinematic.value) {
    runBinding();
    return;
  }
  closeBookToSection('contact');
}
function onBindDone() {
  // The book is bound — the home page already shows it after the
  // blackout; drop the 3D book in, let it land and breathe, then glide
  // to the contact form.
  if (!manuscriptBound.value) markManuscriptBound();
  boundBookDrop.value++;
  closeBookToSection('contact', 2600);
}
/** The binding's fade-to-black: swap in the finished book behind it so
    the fade back in lands on the home page with the bound book. */
function onBindBlackout() {
  shelfReveal.value = false;
  markManuscriptBound();
  closeBook();
}
/** The binding's shelf beat: mount the home page behind the cinematic
    so the 3D book files into the real bookshelf. */
function onBindShelf() {
  bookMounted.value = false;
  homeMounted.value = true;
  shelfReveal.value = true;
}
/** Header nav: CONTACT ME lands on the contact section; the brand goes home. */
function onNavContact() {
  if (showBook.value) {
    if (!manuscriptBound.value && bindCinematic.value) {
      runBinding();
      return;
    }
    closeBookToSection('contact');
  } else {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  }
}
function onNavHome() {
  if (showBook.value) {
    tiltUp();
  } else {
    closeBook();
  }
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

const isDark = () => document.documentElement.dataset.theme === 'dark';
/** The LED strip is lit: dark mode, in the book. */
const ledOn = ref(false);
/** Current LED color — blue is Chris's. Drives the wash via --led. */
const ledColor = ref('#2f6bff');
/** Light rituals: pitch-black beat, rescue hand, page shake. */
const pitchBlack = ref(false);
const handMounted = ref(false);
const handArrived = ref(false);
const handHolding = ref(false);
const handPress = ref(false);
const handYank = ref(false);
const handYankPull = ref(false);
const handXY = ref({ x: 60, y: 400 });
const ritualRunning = ref(false);
let ritualTimers: ReturnType<typeof setTimeout>[] = [];
const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function later(fn: () => void, ms: number) {
  ritualTimers.push(setTimeout(fn, ms));
}
function clearRitual() {
  ritualTimers.forEach(clearTimeout);
  ritualTimers = [];
}

/** Where the remote lives on the desk — the hand aims for its center.
    The remote keeps its layout box while parked, so it's measurable. */
/** Plain theme switch, with the half-second palette crossfade. */
function setThemePlain(light: boolean) {
  const root = document.documentElement;
  root.classList.add('theme-fade');
  root.dataset.theme = light ? 'light' : 'dark';
  // If the lights come back on, the blacklight is over.
  if (light) window.dispatchEvent(new CustomEvent('gs:lights-on'));
  setTimeout(() => root.classList.remove('theme-fade'), 650);
}

/** Cord pulled (lights out): a beat of pitch black, then the hand
    reaches in and thumbs the remote's power — the LEDs bloom. The
    remote lives on the desk now; the hand just works it. */
function ledEntrySequence() {
  ritualRunning.value = true;
  setThemePlain(false);
  ledOn.value = false;
  pitchBlack.value = true;
  updateLights();
  handXY.value = measureRemoteSpot();
  later(() => {
    handHolding.value = false;
    handYank.value = false;
    handYankPull.value = false;
    handPress.value = false;
    handArrived.value = false;
    handMounted.value = true;
    later(() => {
      handArrived.value = true;
    }, 60);
  }, 900);
  later(() => {
    // The thumb hits power: LEDs bloom as the black lifts.
    handPress.value = true;
    ledOn.value = true;
    pitchBlack.value = false;
    updateLights();
  }, 2100);
  later(() => {
    handArrived.value = false;
    handPress.value = false;
  }, 2400);
  later(() => {
    handMounted.value = false;
    ritualRunning.value = false;
    updateLights();
  }, 3000);
}

/** Measure the remote's spot for the hand. */
function measureRemoteSpot() {
  const el = document.querySelector('.remote-control');
  if (!el) return { x: 60, y: window.innerHeight * 0.52 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Pitch black: the LEDs are off and it's dark. A hand reaches in,
    grabs the cord, yanks it, and the regular light comes back on. */
function pitchBlackRescueSequence() {
  ritualRunning.value = true;
  pitchBlack.value = true;
  updateLights();
  handXY.value = measureCordSpot();
  later(() => {
    handHolding.value = false;
    handYank.value = true;
    handYankPull.value = false;
    handPress.value = false;
    handArrived.value = false;
    handMounted.value = true;
    later(() => {
      handArrived.value = true;
    }, 60);
  }, 900);
  later(() => {
    // The yank: fist pulls down, regular light on, black lifts.
    handYankPull.value = true;
    setThemePlain(true);
    ledOn.value = false;
    pitchBlack.value = false;
    updateLights();
  }, 2100);
  later(() => {
    // Release: the cord swings from the yank.
    handYankPull.value = false;
    window.dispatchEvent(new CustomEvent('gs:shake-cord'));
  }, 2450);
  later(() => {
    handArrived.value = false;
    handYank.value = false;
  }, 2700);
  later(() => {
    handMounted.value = false;
    ritualRunning.value = false;
    updateLights();
  }, 3200);
}

/** Measure the pull-cord knob's spot for the rescue hand. */
function measureCordSpot() {
  const el = document.querySelector('.cord-knob');
  if (!el) return { x: 60, y: 120 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** The cord was yanked — decide what the yank means. */
function onCordPulled() {
  if (ritualRunning.value) return;
  const goingDark = !isDark();
  if (goingDark && showBook.value) {
    // In the book: pitch black, then the hand thumbs the remote's
    // power and the LEDs bloom.
    if (!reducedMotion()) {
      ledEntrySequence();
      return;
    }
    setThemePlain(false);
    ledOn.value = true;
    updateLights();
    return;
  }
  // On the cover the cord is a plain light switch: regular dark mode,
  // no LED scene. Lights on is always a plain switch back.
  if (goingDark) {
    setThemePlain(false);
    ledOn.value = true;
  } else {
    setThemePlain(true);
    ledOn.value = false;
  }
  updateLights();
}

function updateLights() {
  document.documentElement.style.setProperty('--led', ledColor.value);
  if (!ritualRunning.value) {
    // The LED scene lives in the book only — the cover keeps the
    // plain dark theme.
    ledOn.value = isDark() && showBook.value;
  }
}

/** Leaving the book: the LED scene stays behind. Plain theme, no
    remote, no wash, no hand. */
function clearLedScene() {
  clearRitual();
  ritualRunning.value = false;
  pitchBlack.value = false;
  handMounted.value = false;
  handArrived.value = false;
  handHolding.value = false;
  handPress.value = false;
  document.documentElement.classList.remove('page-shake');
  updateLights();
}

/** Entering the book while it's dark: the LEDs are on, remote
    already on the desk. */
function enterBookLighting() {
  if (!isDark()) return;
  ledOn.value = true;
  updateLights();
}

function onRemotePower() {
  if (ritualRunning.value) return;
  const turningOff = ledOn.value;
  ledOn.value = !ledOn.value;
  // Killing the LEDs in the dark leaves pitch black — the hand
  // reaches in and yanks the cord for the regular light.
  if (turningOff && isDark() && !reducedMotion()) {
    pitchBlackRescueSequence();
    return;
  }
  if (turningOff && isDark()) {
    // Reduced motion: no hand, just turn the lights back on.
    setThemePlain(true);
    ledOn.value = false;
  }
  updateLights();
}

function onLedColor(hex: string) {
  ledColor.value = hex;
  updateLights();
}

function onLightsOn() {
  updateLights();
}

let themeObs: MutationObserver | null = null;
let lenis: Lenis | null = null;

onMounted(() => {
  updateLights();
  themeObs = new MutationObserver(updateLights);
  themeObs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  window.addEventListener('gs:lights-on', onLightsOn);
  window.addEventListener('gs:cord-pulled', onCordPulled);

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lenis = new Lenis({ duration: 1.25, smoothWheel: true });
    setLenis(lenis);
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
  }

  requestAnimationFrame(() => ScrollTrigger.refresh());
  if (document.fonts) {
    document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
  }
});

onUnmounted(() => {
  themeObs?.disconnect();
  window.removeEventListener('gs:lights-on', onLightsOn);
  window.removeEventListener('gs:cord-pulled', onCordPulled);
  clearRitual();
  document.documentElement.classList.remove('page-shake');
  lenis?.destroy();
  lenis = null;
  setLenis(null);
});
</script>

<template>
  <div class="app-root" :class="{ 'camera-moving': cameraMoving }">
  <div class="grain" aria-hidden="true"></div>
  <SiteNav @contact="onNavContact" @home="onNavHome" />
  <div v-if="homeMounted" class="view view-home" :class="{ 'shelf-reveal': shelfReveal }">
    <Cover @open-book="openBook" :book-drop-key="boundBookDrop" />
  </div>
  <div v-if="bookMounted" class="view view-book">
  <BookView
    ref="bookView"
    @back-to-cover="tiltUp"
    @back-to-cover-section="closeBookToSection"
    @finale-contact="onFinaleContact"
  >
    <template #desk-props>
      <RemoteControl
        :led-on="ledOn"
        :color="ledColor"
        @power="onRemotePower"
        @set-color="onLedColor"
      />
      <DeskPencil />
      <DeskClutter />
      <FirstDraft />
      <DeskPhone />
    </template>
  </BookView>
  </div>
  <BindCinematic
    ref="bindCinematic"
    @done="onBindDone"
    @blackout="onBindBlackout"
    @shelf="onBindShelf"
  />
  <!-- Light rituals: true darkness between the cord pull and the LEDs. -->
  <div class="pitch-black" :class="{ on: pitchBlack }" aria-hidden="true"></div>
  <!-- LED wash: the room lit by the strip, tinted to the remote's color. -->
  <div class="led-wash" :class="{ on: ledOn }" aria-hidden="true"></div>
  <RemoteHand
    v-if="handMounted"
    :x="handXY.x"
    :y="handXY.y"
    :arrived="handArrived"
    :holding="handHolding"
    :press="handPress"
    :yank="handYank"
    :class="{ 'yank-pull': handYankPull }"
  />
  </div>
</template>

<style>
.gs-no-scroll {
  overflow: hidden;
}
/* During the binding's shelf beat the home page sits behind the
   cinematic; hide its manuscript stack so the filing reads clean. */
.view-home.shelf-reveal .cover-scene {
  opacity: 0;
  pointer-events: none;
}
/* During the shelf filing: no blur on the bookshelf, titles visible. */
.view-home.shelf-reveal .bs-blur-veil {
  display: none;
}
/* While the camera tilts, both views are fixed full-screen stages. */
.camera-moving .view {
  position: fixed;
  inset: 0;
  overflow: hidden;
}
.camera-moving .view-home {
  z-index: 1;
}
.camera-moving .view-book {
  z-index: 2;
}
</style>
