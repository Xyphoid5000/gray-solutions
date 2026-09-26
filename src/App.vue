<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SiteNav from './components/SiteNav.vue';
import Cover from './components/Cover.vue';
import BookView from './components/BookView.vue';
import BindCinematic from './components/BindCinematic.vue';
import DeskCandle from './components/DeskCandle.vue';
import DeskPencil from './components/DeskPencil.vue';
import MatchHand from './components/MatchHand.vue';
import LostPage from './components/LostPage.vue';
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
}

/** Tilt up: the desk slides away below, the shelf glides back in. */
async function tiltUp() {
  if (!showBook.value || cameraMoving.value) return;
  if (reducedMotion()) {
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
}

/** Instant close — used under the binding's blackout, where the swap
    is invisible. */
function closeBook() {
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

/** Blacklight: the candle is blown out, the lost page surfaces. */
const blacklight = ref(false);
const isDark = () => document.documentElement.dataset.theme === 'dark';
const candleLit = ref(false);

/** Light rituals: pitch-black beat, match hand, smoke wisp, page shake. */
const pitchBlack = ref(false);
const matchVisible = ref(false);
const matchAtWick = ref(false);
const matchXY = ref({ x: 0, y: 0 });
const smoking = ref(false);
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

/** Plain theme switch, with the half-second palette crossfade. */
function setThemePlain(light: boolean) {
  const root = document.documentElement;
  root.classList.add('theme-fade');
  root.dataset.theme = light ? 'light' : 'dark';
  // If the lights come back on, the blacklight is over.
  if (light) window.dispatchEvent(new CustomEvent('gs:lights-on'));
  setTimeout(() => root.classList.remove('theme-fade'), 650);
}

/** Lights off: a beat of true darkness, then a hand brings a match
    to the wick and the candle catches. */
function matchSequence() {
  const candle = document.querySelector('.desk-candle');
  if (!candle) {
    setThemePlain(false);
    return;
  }
  ritualRunning.value = true;
  // The match tip must land on the wick, wherever the candle sits.
  const r = candle.getBoundingClientRect();
  matchXY.value = { x: r.left + r.width * 0.5, y: r.top + r.height * 0.38 };
  pitchBlack.value = true;
  later(() => {
    matchVisible.value = true;
    later(() => {
      matchAtWick.value = true;
    }, 60);
  }, 900);
  later(() => {
    // Ignition: the room is already dark underneath; the flame is
    // burning before the black lifts.
    setThemePlain(false);
    matchAtWick.value = false;
  }, 2300);
  later(() => {
    pitchBlack.value = false;
  }, 2500);
  later(() => {
    matchVisible.value = false;
    ritualRunning.value = false;
  }, 3600);
}

/** Lights on: the room brightens and a thin wisp curls off the wick. */
function smokeSequence() {
  ritualRunning.value = true;
  setThemePlain(true);
  smoking.value = true;
  later(() => {
    smoking.value = false;
    ritualRunning.value = false;
  }, 2600);
}

/** The cord was yanked — decide what the yank means. */
function onCordPulled() {
  if (ritualRunning.value) return;
  const goingDark = !isDark();
  if (goingDark && showBook.value && !reducedMotion()) {
    matchSequence();
    return;
  }
  if (!goingDark && showBook.value && candleLit.value && !reducedMotion()) {
    smokeSequence();
    return;
  }
  setThemePlain(!goingDark);
}

function updateCandle() {
  candleLit.value = isDark() && !blacklight.value;
  document.documentElement.dataset.blacklight = blacklight.value ? 'on' : 'off';
}

/** Blow out the candle for blacklight: the flame dies, the same beat
    of darkness falls but holds longer, the black lifts as the page
    shivers — then the UV washes in. */
function blowOutCandle() {
  if (!candleLit.value || ritualRunning.value) return;
  if (reducedMotion()) {
    blacklight.value = true;
    updateCandle();
    return;
  }
  ritualRunning.value = true;
  candleLit.value = false;
  pitchBlack.value = true;
  later(() => {
    // The black lifts and the page shivers as it does — the cord
    // swings wildly too.
    pitchBlack.value = false;
    document.documentElement.classList.add('page-shake');
    window.dispatchEvent(new CustomEvent('gs:shake-cord'));
  }, 2200);
  later(() => {
    blacklight.value = true;
    updateCandle();
  }, 3000);
  later(() => {
    document.documentElement.classList.remove('page-shake');
    ritualRunning.value = false;
  }, 3200);
}

function onLightsOn() {
  blacklight.value = false;
  updateCandle();
}

function onLostPageClose() {
  // Closing the lost page exits blacklight and relights the candle.
  blacklight.value = false;
  updateCandle();
}

let themeObs: MutationObserver | null = null;
let lenis: Lenis | null = null;

onMounted(() => {
  updateCandle();
  themeObs = new MutationObserver(updateCandle);
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
      <DeskCandle
        :lit="candleLit"
        :blacklight="blacklight"
        :smoking="smoking"
        @blowOut="blowOutCandle"
      />
      <DeskPencil />
    </template>
  </BookView>
  </div>
  <LostPage :visible="blacklight" @close="onLostPageClose" />
  <BindCinematic
    ref="bindCinematic"
    @done="onBindDone"
    @blackout="onBindBlackout"
    @shelf="onBindShelf"
  />
  <!-- Light rituals: true darkness between the cord pull and the flame. -->
  <div class="pitch-black" :class="{ on: pitchBlack }" aria-hidden="true"></div>
  <MatchHand
    v-if="matchVisible"
    :x="matchXY.x"
    :y="matchXY.y"
    :at-wick="matchAtWick"
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
