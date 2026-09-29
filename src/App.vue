<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
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
import DeskCandle from './components/DeskCandle.vue';
import MatchHand from './components/MatchHand.vue';
import MatchGuy from './components/MatchGuy.vue';
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
    updateLights();
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
  updateLights();
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
  // Flag the book closed first: updateLights() (via clearLedScene)
  // kills LED mode when the book isn't open, so the main page lands
  // on standard dark mode instead of the LED scene.
  showBook.value = false;
  clearLedScene();
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
/** Accent mode: LEDs on as a hint of color while the main light is
    still up — the step before the hand kills the main light. */
const ledAccent = ref(false);
/** Current LED color — blue is Chris's. Drives the wash via --led. */
const ledColor = ref('#2f6bff');
/** The desk candle: lit only when nothing else is. Persists on the desk. */
const candleLit = ref(false);
const candleSmoking = ref(false);
/** Breeze gust sweeping the desk (pages flutter, candle blows out). */
const breezeOn = ref(false);
/** Light rituals: pitch-black beat, match hand, breeze. */
const pitchBlack = ref(false);
const matchMounted = ref(false);
const matchAtWick = ref(false);
const matchXY = ref({ x: 60, y: 400 });
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

/** No light source left in the book: a beat of pitch black, then a
    hand slides in with a lit match, touches it to the candle's wick,
    and leaves. The candle stays lit until it's blown out or the
    main light comes back on. */
function candleLightingRitual() {
  ritualRunning.value = true;
  setThemePlain(false);
  pitchBlack.value = true;
  updateLights();
  matchXY.value = measureWickSpot();
  later(() => {
    matchMounted.value = true;
    later(() => {
      matchAtWick.value = true;
    }, 60);
  }, 900);
  later(() => {
    // The match touches the wick: the candle catches, black lifts.
    candleLit.value = true;
    pitchBlack.value = false;
    updateLights();
  }, 2100);
  later(() => {
    matchAtWick.value = false;
  }, 2500);
  later(() => {
    matchMounted.value = false;
    ritualRunning.value = false;
    updateLights();
  }, 3100);
}

/** Measure the candle wick's spot for the match hand. */
function measureWickSpot() {
  const el = document.querySelector('.desk-candle');
  if (!el) return { x: 60, y: window.innerHeight * 0.5 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.33 };
}

/** The main light comes back on while the candle burns: a breeze
    sweeps the desk, ruffles the pages, and blows the candle out. */
function breezeRitual() {
  ritualRunning.value = true;
  breezeOn.value = true;
  updateLights();
  later(() => {
    // The gust reaches the candle: the flame gutters out.
    candleLit.value = false;
    candleSmoking.value = true;
    updateLights();
  }, 1300);
  later(() => {
    breezeOn.value = false;
    ritualRunning.value = false;
    updateLights();
  }, 2400);
  later(() => {
    candleSmoking.value = false;
  }, 4400);
}

/** Tapping the lit candle blows it out. It stays out — only the hand
    (or the breeze) changes that. Every fourth blowout of the lone
    candle, the match guy comes out: three complaint cutscenes,
    angrier each time, then the sixteenth blowout is his last — he
    quits, taking the candle. */
function onCandleBlowOut() {
  if (ritualRunning.value || gagRunning.value || !candleLit.value) return;
  // Only counts when the candle was the room's only light.
  const alone = isDark() && !ledOn.value;
  if (alone && !candleGone.value) {
    blowoutCount.value += 1;
    const n = blowoutCount.value;
    // The bit happens every 4th blowout: 4, 8, 12 — and 16 is the
    // resignation. Block the normal relight before the sources update
    // fans out.
    if (n % 4 === 0) gagRunning.value = true;
  }
  candleLit.value = false;
  candleSmoking.value = true;
  updateLights();
  setTimeout(() => {
    candleSmoking.value = false;
  }, 2600);
  const n = blowoutCount.value;
  if (n === 4) matchGuyGag(1);
  else if (n === 8) matchGuyGag(2);
  else if (n === 12) matchGuyGag(3);
  else if (n >= 16 && !candleGone.value) matchGuyQuits();
}

/** The complaint ladder — wearier every cycle. */
const GUY_LINES = [
  "I don't know what you thought was gonna happen. I have to get more matches.",
  'Come on, man. Really?!',
  'Twelve times! TWELVE! Are you doing this on purpose?!',
] as const;

/** The match guy's fuse: consecutive lone-candle blowouts this session. */
const blowoutCount = ref(0);
/** He quit and took the candle — it's gone for the session, and the
    dark just stays dark. */
const candleGone = ref(false);
/** A match-guy gag is playing: the normal relight ritual stands down. */
const gagRunning = ref(false);
/** The walker himself. */
const guyMounted = ref(false);
const guyX = ref(-160);
const guyMode = ref<'flashlight' | 'match' | 'carry'>('flashlight');
const guyFacing = ref<1 | -1>(1);
const guyLine = ref<string | null>(null);
let guyTimer: ReturnType<typeof setInterval> | null = null;

/** Walk the guy toward a viewport x at px/sec, then call back. */
function walkGuyTo(targetX: number, speed: number, onArrive: () => void) {
  if (guyTimer) clearInterval(guyTimer);
  guyTimer = setInterval(() => {
    const diff = targetX - guyX.value;
    const step = speed * 0.05;
    if (Math.abs(diff) <= step) {
      guyX.value = targetX;
      if (guyTimer) clearInterval(guyTimer);
      guyTimer = null;
      onArrive();
    } else {
      guyX.value += Math.sign(diff) * step;
    }
  }, 50);
}

function stopGuy() {
  if (guyTimer) clearInterval(guyTimer);
  guyTimer = null;
  guyMounted.value = false;
  guyLine.value = null;
}

/** Every fourth blowout: the room stays dark, and the match guy
    walks across the desk with a flashlight to complain — angrier each
    cycle — then walks back with a lit match and relights the candle
    anyway. */
function matchGuyGag(level: 1 | 2 | 3) {
  gagRunning.value = true;
  const vw = window.innerWidth;
  const wick = measureWickSpot();
  if (reducedMotion()) {
    pitchBlack.value = true;
    updateLights();
    later(() => {
      candleLit.value = true;
      pitchBlack.value = false;
      gagRunning.value = false;
      updateLights();
    }, 1200);
    return;
  }
  pitchBlack.value = true;
  updateLights();
  later(() => {
    // The complaint walk: in from the left, flashlight sweeping.
    guyMode.value = 'flashlight';
    guyFacing.value = 1;
    guyX.value = -160;
    guyLine.value = GUY_LINES[level - 1];
    guyMounted.value = true;
    walkGuyTo(vw + 160, 180, () => {
      stopGuy();
      later(() => {
        // Back with a lit match, from the right this time.
        guyMode.value = 'match';
        guyFacing.value = -1;
        guyX.value = vw + 160;
        guyMounted.value = true;
        walkGuyTo(wick.x, 180, () => {
          later(() => {
            candleLit.value = true;
            pitchBlack.value = false;
            updateLights();
            later(() => {
              walkGuyTo(-160, 180, () => {
                stopGuy();
                gagRunning.value = false;
                updateLights();
              });
            }, 700);
          }, 450);
        });
      }, 1200);
    });
  }, 900);
}

/** Sixteenth consecutive blowout: he quits. Walks in from the right,
    says the line, takes the candle, and leaves. The room light comes
    back on to reveal a HELP WANTED flyer where the candle was. */
function matchGuyQuits() {
  gagRunning.value = true;
  const vw = window.innerWidth;
  const wick = measureWickSpot();
  if (reducedMotion()) {
    candleGone.value = true;
    setThemePlain(true);
    pitchBlack.value = false;
    gagRunning.value = false;
    updateLights();
    return;
  }
  pitchBlack.value = true;
  updateLights();
  later(() => {
    guyMode.value = 'flashlight';
    guyFacing.value = -1;
    guyX.value = vw + 160;
    guyLine.value = "That's it. I QUIT.";
    guyMounted.value = true;
    walkGuyTo(wick.x + 34, 180, () => {
      later(() => {
        // He takes the candle.
        guyLine.value = null;
        candleGone.value = true;
        guyMode.value = 'carry';
        updateLights();
        later(() => {
          guyFacing.value = 1;
          walkGuyTo(vw + 160, 180, () => {
            stopGuy();
            later(() => {
              // The lights come back on. Just the flyer now.
              setThemePlain(true);
              pitchBlack.value = false;
              gagRunning.value = false;
              updateLights();
            }, 900);
          });
        }, 500);
      }, 900);
    });
  }, 900);
}

/** The cord was yanked — decide what the yank means. */
function onCordPulled() {
  if (ritualRunning.value || gagRunning.value) return;
  const goingDark = !isDark();
  if (!showBook.value) {
    // Main view: the cord is just a light switch. No candle out there.
    setThemePlain(!goingDark);
    updateLights();
    return;
  }
  if (goingDark) {
    // Lights out in the book. The LEDs stay exactly as they are —
    // if that leaves no light source, the watcher lights the candle.
    setThemePlain(false);
  } else if (candleLit.value) {
    // Lights on while the candle burns: the breeze blows it out.
    setThemePlain(true);
    if (!reducedMotion()) {
      breezeRitual();
      return;
    }
    candleLit.value = false;
    candleSmoking.value = true;
    setTimeout(() => {
      candleSmoking.value = false;
    }, 2600);
  } else {
    setThemePlain(true);
  }
  updateLights();
}

/** Active light sources. The one rule: if this is ever empty while
    the book is open, the hand comes in and lights the candle. */
const lightSources = ref<string[]>(['main']);

function refreshSources() {
  const s: string[] = [];
  if (!isDark()) s.push('main');
  if (showBook.value && ledOn.value) s.push('led');
  if (showBook.value && candleLit.value) s.push('candle');
  lightSources.value = s;
}

watch(lightSources, (s) => {
  if (
    s.length === 0 &&
    showBook.value &&
    !ritualRunning.value &&
    !gagRunning.value &&
    !candleGone.value
  ) {
    candleLightingRitual();
  }
});

function updateLights() {
  document.documentElement.style.setProperty('--led', ledColor.value);
  // The LEDs only exist in the desk view — leaving the book kills them.
  if (!showBook.value) ledOn.value = false;
  // Faded accent wash while the main light is up; full scene in the dark.
  ledAccent.value = ledOn.value && !isDark();
  document.documentElement.dataset.led = ledOn.value && !ledAccent.value ? 'on' : 'off';
  refreshSources();
}

/** Leaving the book: the LED scene stays behind. Plain theme, no
    wash, no hand. The candle stays as it is on the desk. */
function clearLedScene() {
  clearRitual();
  stopGuy();
  ritualRunning.value = false;
  gagRunning.value = false;
  pitchBlack.value = false;
  matchMounted.value = false;
  matchAtWick.value = false;
  breezeOn.value = false;
  candleSmoking.value = false;
  document.documentElement.classList.remove('page-shake');
  updateLights();
}

function onRemotePower() {
  if (ritualRunning.value || gagRunning.value) return;
  // The remote only toggles the LEDs — nothing else. If switching them
  // off leaves no light source, the watcher lights the candle.
  ledOn.value = !ledOn.value;
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
  <div class="app-root" :class="{ 'camera-moving': cameraMoving, breezing: breezeOn }">
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
      <DeskCandle
        v-if="!candleGone"
        :lit="candleLit"
        :smoking="candleSmoking"
        @blow-out="onCandleBlowOut"
      />
      <!-- After the match guy quits, all that's left is this flyer. -->
      <div v-if="candleGone" class="help-wanted-flyer" aria-hidden="true">
        <span class="hw-tape"></span>
        <span class="hw-title">HELP<br />WANTED</span>
        <span class="hw-sub">inquire within</span>
      </div>
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
  <!-- Light rituals: true darkness before the match hand comes in. -->
  <div class="pitch-black" :class="{ on: pitchBlack }" aria-hidden="true"></div>
  <!-- LED wash: the room lit by the strip, tinted to the remote's color. -->
  <div class="led-wash" :class="{ on: ledOn, accent: ledAccent }" aria-hidden="true"></div>
  <!-- Candlelight: warm wash while the candle burns. -->
  <div class="candle-wash" :class="{ on: candleLit }" aria-hidden="true"></div>
  <!-- Breeze gust sweeping the desk, left to right. -->
  <div class="breeze" :class="{ on: breezeOn }" aria-hidden="true"></div>
  <MatchHand
    v-if="matchMounted"
    :x="matchXY.x"
    :y="matchXY.y"
    :at-wick="matchAtWick"
  />
  <!-- The match guy's complaint walk / resignation. -->
  <MatchGuy
    v-if="guyMounted"
    :x="guyX"
    :mode="guyMode"
    :facing="guyFacing"
    :line="guyLine"
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
