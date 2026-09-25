<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
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

/** The book is a SPA now — no router. Cover or the stacked manuscript. */
const showBook = ref(false);
function openBook() {
  showBook.value = true;
}
function closeBook() {
  showBook.value = false;
}
function closeBookToSection(section: 'about' | 'contact', after = 100) {
  showBook.value = false;
  // After the cover renders, scroll to the section.
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
function onFinaleContact() {
  if (!manuscriptBound.value && bindCinematic.value) {
    bindCinematic.value.start();
    return;
  }
  closeBookToSection('contact');
}
function onBindDone() {
  // The book is bound — the home page already shows it after the
  // blackout; glide to the contact form once the reveal lands.
  if (!manuscriptBound.value) markManuscriptBound();
  closeBookToSection('contact', 1400);
}
/** The binding's fade-to-black: swap in the finished book behind it so
    the fade back in lands on the home page with the bound book. */
function onBindBlackout() {
  markManuscriptBound();
  closeBook();
}
/** Header nav: CONTACT ME lands on the contact section; the brand goes home. */
function onNavContact() {
  if (showBook.value) {
    if (!manuscriptBound.value && bindCinematic.value) {
      bindCinematic.value.start();
      return;
    }
    closeBookToSection('contact');
  } else {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  }
}
function onNavHome() {
  showBook.value = false;
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
  <div class="grain" aria-hidden="true"></div>
  <SiteNav @contact="onNavContact" @home="onNavHome" />
  <Cover v-if="!showBook" @open-book="openBook" />
  <BookView
    v-else
    @back-to-cover="closeBook"
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
  <LostPage :visible="blacklight" @close="onLostPageClose" />
  <BindCinematic ref="bindCinematic" @done="onBindDone" @blackout="onBindBlackout" />
  <!-- Light rituals: true darkness between the cord pull and the flame. -->
  <div class="pitch-black" :class="{ on: pitchBlack }" aria-hidden="true"></div>
  <MatchHand
    v-if="matchVisible"
    :x="matchXY.x"
    :y="matchXY.y"
    :at-wick="matchAtWick"
  />
</template>
