<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref, toRef, watch } from 'vue';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SiteNav from './components/SiteNav.vue';
import Cover from './components/Cover.vue';
import CoverHero from './components/CoverHero.vue';
import Office from './components/Office.vue';
import BindCinematic from './components/BindCinematic.vue';
import SandwichBite from './components/SandwichBite.vue';
import OpenTransition from './components/OpenTransition.vue';
import BookIntroModal from './components/BookIntroModal.vue';
import RemoteControl from './components/RemoteControl.vue';
import DeskClutter from './components/DeskClutter.vue';
import FirstDraft from './components/FirstDraft.vue';
import DeskPhone from './components/DeskPhone.vue';
import DeskPencil from './components/DeskPencil.vue';
import DeskCandle from './components/DeskCandle.vue';
import MatchHand from './components/MatchHand.vue';
import MatchGuy from './components/MatchGuy.vue';
import { setLenis } from './lib/scroll';
import { useOfficeStore } from './stores/office';
import { useBonusStore } from './stores/bonus';
import { useSettingsStore } from './stores/settings';
import { useInteractionsStore } from './stores/interactions';
import { useDeviceStore } from './stores/device';
import { manuscriptBound, markManuscriptBound, bookIntroSeen, markBookIntroSeen } from './lib/manuscript';
import { contactTarget } from './lib/contact';
import { motionReduced } from './utils/a11y';

gsap.registerPlugin(ScrollTrigger);

const office = useOfficeStore();
const bonus = useBonusStore();
const settings = useSettingsStore();
const interactions = useInteractionsStore();
// Device capabilities (touch / screen size). Instantiated here so it's
// live from startup; components read it when they need touch-vs-desktop
// behavior. Changes nothing on its own.
const device = useDeviceStore();

/** The book is a SPA now — no router. The Office carousel handles
    shelf vs desk; `office.view` is the single source of truth. */
const showOpenTransition = ref(false);
/** How-to-read modal, shown once per session on first book open. */
const showBookIntro = ref(false);

/** First book-open each session gets the how-to-read modal. */
function maybeShowBookIntro() {
  if (!bookIntroSeen.value) {
    markBookIntroSeen();
    showBookIntro.value = true;
  }
}
/** Bonus content (candle, LEDs, first draft, UV light, phone, discount
    code) lives behind a toggle on the back of the cover. Off by
    default; session-scoped, like the bound state. */
/** The pull cord only exists while bonus content is on. Flipping the
    switch arms its drop; it falls from behind the header once the
    stack's front face swings back into view (or the book opens). */

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

/** Tilt down: pages fall first, then the office carousel slides shelf→desk.
    With `instant`, it does the same thing minus the animation — used by
    the contact section's re-read link. */
async function openBook(instant = false) {
  if ((office.view === 'desk') || office.transitioning) return;
  // Re-entering always starts at chapter 1 with an empty pile.
  officeRef.value?.bookView?.resetBookView();
  // Entering the book in the dark: the candle is already lit — no
  // pitch-black beat, no lighting ceremony.
  if (isDark() && bonus.enabled && !bonus.candleGone) {
    bonus.candleLit = true;
  }
  if (instant || reducedMotion()) {
    office.showDesk();
    window.scrollTo(0, 0);
    updateLights();
    maybeShowBookIntro();
    return;
  }
  office.setTransitioning(true);
  noScroll(true);
  window.scrollTo(0, 0);
  // Pages fall first, on the shelf view.
  showOpenTransition.value = true;
  await new Promise<void>((resolve) => {
    const check = () => {
      if (!showOpenTransition.value) resolve();
      else requestAnimationFrame(check);
    };
    check();
  });
  // Pages are gone; now slide the office to the desk. The carousel's
  // CSS transition handles the animation — await its transitionend
  // before clearing the transitioning flag.
  office.showDesk();
  await new Promise<void>((resolve) => {
    const track = document.querySelector('.office-track');
    if (!track) {
      resolve();
      return;
    }
    const onEnd = (e: Event) => {
      if ((e as TransitionEvent).propertyName === 'transform') {
        track.removeEventListener('transitionend', onEnd);
        resolve();
      }
    };
    track.addEventListener('transitionend', onEnd);
    // Fallback: if transitionend never fires, don't hang.
    setTimeout(() => {
      track.removeEventListener('transitionend', onEnd);
      resolve();
    }, 2000);
  });
  // The desk mounted offscreen, so ScrollTrigger never saw its content
  // enter the viewport. Refresh now that it's in place.
  ScrollTrigger.refresh();
  office.setTransitioning(false);
  noScroll(false);
  updateLights();
  maybeShowBookIntro();
}

function onOpenTransitionDone() {
  showOpenTransition.value = false;
}

/** Tilt up: the office carousel slides desk→shelf. */
async function tiltUp() {
  if (!(office.view === 'desk') || office.transitioning) return;
  if (reducedMotion()) {
    clearLedScene();
    closeBook();
    window.scrollTo(0, 0);
    return;
  }
  office.setTransitioning(true);
  noScroll(true);
  window.scrollTo(0, 0);
  // Slide the office back to the shelf. The carousel's CSS transition
  // handles the animation — await it before clearing the flag.
  office.showShelf();
  await new Promise((resolve) => setTimeout(resolve, 1700));
  office.setTransitioning(false);
  noScroll(false);
  clearLedScene();
}

/** Instant close — used under the binding's blackout, where the swap
    is invisible. */
function closeBook() {
  // Flag the book closed first: updateLights() (via clearLedScene)
  // kills LED mode when the book isn't open, so the main page lands
  // on standard dark mode instead of the LED scene.
  office.showShelf();
  clearLedScene();
}
async function closeBookToSection(section: 'about' | 'contact', after = 100) {
  if ((office.view === 'desk')) await tiltUp();
  else closeBook();
  // "Contact me" roads land on the contact form — unless it's been
  // submitted and retired, in which case they land on the socials.
  const target = section === 'contact' ? contactTarget() : section;
  // After the shelf is back, scroll to the section.
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
    }, after);
  });
}
/** Any road to Contact runs through the binding — once per visit.
    "Start your story" on the Finale binds the manuscript before the
    contact form; so does the header's CONTACT ME while the book is
    open. The book-closed header link just scrolls (nothing to bind). */
const bindCinematic = ref<InstanceType<typeof BindCinematic> | null>(null);
const officeRef = ref<InstanceType<typeof Office> | null>(null);
/** Floating settings shortcut: the desk phone stays mounted (its desk
    slide hides in shelf view, but the picked-up modal teleports to
    <body>), so this reaches it anywhere on the main screen — it picks
    the phone up straight into the Settings app. */
function openPhoneSettings() {
  window.dispatchEvent(new CustomEvent('gs:open-phone-settings'));
}
/** True while the binding cinematic owns the screen — the site nav
    (and its pull cord) hides so it can't collide with SKIP. */
const bindingActive = ref(false);
/** Sandwich binding: the bite overlay owns the screen instead of the
    sewing cinematic. */
const biteActive = ref(false)
/** The binding, from any trigger: the open page joins the pile first so
    the final page is really in the list, then the cinematic gathers it.
    In sandwich mode we take a bite instead — that's the binding. */
async function runBinding() {
  if (office.manuscriptBound) return;
  await officeRef.value?.bookView?.tossCurrentToPile();
  if (settings.sandwich) {
    bindingActive.value = true;
    biteActive.value = true;
    return;
  }
  if (!bindCinematic.value) return;
  bindingActive.value = true;
  bindCinematic.value.start();
}
/** Sandwich binding: the bite is done — finish like the cinematic,
    then back to the main page (the bite skips the cinematic's
    blackout, which is what normally closes the book). */
function onBiteDone() {
  biteActive.value = false;
  onBindDone();
  officeRef.value?.bookView?.resetBookView();
  closeBook();
}
function onFinaleContact() {
  if (!manuscriptBound.value && bindCinematic.value) {
    runBinding();
    return;
  }
  closeBookToSection('contact');
}
function onBindDone() {
  // The book is bound — skip the trip back to the top entirely and
  // glide straight to the contact form (or the socials, if the form
  // has already been submitted and retired this visit).
  bindingActive.value = false;
  if (!manuscriptBound.value) markManuscriptBound();
  boundBookDrop.value++;
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.getElementById(contactTarget())?.scrollIntoView({ behavior: 'smooth' });
    }, 600);
  });
}
/** The binding's fade-to-black: swap in the finished book behind it so
    the fade back in lands on the home page with the bound book. */
function onBindBlackout() {
  shelfReveal.value = false;
  markManuscriptBound();
  // Reset the book view so reopening starts fresh, not at the old desk state.
  officeRef.value?.bookView?.resetBookView();
  closeBook();
}
/** The binding's shelf beat: mount the home page behind the cinematic
    so the 3D book files into the real bookshelf. */
function onBindShelf() {
  shelfReveal.value = true;
}
/** Header nav: CONTACT ME lands on the contact form (or the socials once
    the form has been submitted and retired); the brand goes home. */
function onNavContact() {
  if ((office.view === 'desk')) {
    if (!manuscriptBound.value && bindCinematic.value) {
      runBinding();
      return;
    }
    closeBookToSection('contact');
  } else {
    document.getElementById(contactTarget())?.scrollIntoView({ behavior: 'smooth' });
  }
}
function onNavHome() {
  if ((office.view === 'desk')) {
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
/** Accent mode: LEDs on as a hint of color while the main light is
    still up — the step before the hand kills the main light. */
/** Current LED color — blue is Chris's. Drives the wash via --led. */
/** The desk candle: lit only when nothing else is. Persists on the desk. */
/** Breeze gust sweeping the desk (pages flutter, candle blows out). */
/** Light rituals: pitch-black beat, match hand, breeze. */
let ritualTimers: ReturnType<typeof setTimeout>[] = [];
const reducedMotion = () =>
  motionReduced();

function later(fn: () => void, ms: number) {
  ritualTimers.push(setTimeout(fn, ms));
}
function clearRitual() {
  ritualTimers.forEach(clearTimeout);
  ritualTimers = [];
}

/** Where the remote lives on the desk — the hand aims for its center.
    The remote keeps its layout box while parked, so it's measurable. */
/** Plain theme switch, with the half-second palette crossfade.
    A manual Light/Dark pick from the phone's settings is authoritative:
    the rituals still run, but they can't move the base palette until
    the visitor goes back to Auto. */
function setThemePlain(light: boolean) {
  if (settings.mode === 'light') light = true;
  else if (settings.mode === 'dark') light = false;
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
  interactions.ritualRunning = true;
  setThemePlain(false);
  interactions.pitchBlack = true;
  updateLights();
  interactions.matchXY = measureWickSpot();
  later(() => {
    interactions.matchMounted = true;
    later(() => {
      interactions.matchAtWick = true;
    }, 60);
  }, 900);
  later(() => {
    // The match touches the wick: the candle catches, black lifts.
    bonus.candleLit = true;
    interactions.pitchBlack = false;
    updateLights();
  }, 2100);
  later(() => {
    interactions.matchAtWick = false;
  }, 2500);
  later(() => {
    interactions.matchMounted = false;
    interactions.ritualRunning = false;
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
  interactions.ritualRunning = true;
  bonus.breezeOn = true;
  updateLights();
  later(() => {
    // The gust reaches the candle: the flame gutters out.
    bonus.candleLit = false;
    bonus.candleSmoking = true;
    updateLights();
  }, 1300);
  later(() => {
    bonus.breezeOn = false;
    interactions.ritualRunning = false;
    updateLights();
  }, 2400);
  later(() => {
    bonus.candleSmoking = false;
  }, 4400);
}

/** Tapping the lit candle blows it out. It stays out — only the hand
    (or the breeze) changes that. Keep blowing out the lone candle and
    the match guy comes out to complain: three cutscenes, angrier each
    time — on the 3rd, 6th and 8th blowouts — then the 9th blowout is
    his last: he quits, taking the candle. */
function onCandleBlowOut() {
  if (interactions.ritualRunning || interactions.gagRunning || !bonus.candleLit) return;
  // Only counts when the candle was the room's only light.
  const alone = isDark() && !bonus.ledOn;
  if (alone && !bonus.candleGone) {
    bonus.blowoutCount += 1;
    const n = bonus.blowoutCount;
    // The bit: 3 blowouts to trigger the first complaint, 3 more for
    // the second, 2 for the third, then 1 more and he quits (3/6/8/9).
    // Block the normal relight before the sources update fans out.
    if (n === 3 || n === 6 || n === 8 || n >= 9) interactions.gagRunning = true;
  }
  bonus.candleLit = false;
  bonus.candleSmoking = true;
  updateLights();
  setTimeout(() => {
    bonus.candleSmoking = false;
  }, 2600);
  const n = bonus.blowoutCount;
  if (n === 3) matchGuyGag(1);
  else if (n === 6) matchGuyGag(2);
  else if (n === 8) matchGuyGag(3);
  else if (n >= 9 && !bonus.candleGone) matchGuyQuits();
}

/** The complaint ladder — wearier every cycle. */
const GUY_LINES = [
  "I don't know what you thought was gonna happen. I have to get more matches.",
  'Come on, man. Really?!',
  'Eight times! EIGHT! Are you doing this on purpose?!',
] as const;

/** The match guy's fuse: consecutive lone-candle blowouts this session. */
/** He quit and took the candle — it's gone for the session, and the
    dark just stays dark. */
/** A match-guy gag is playing: the normal relight ritual stands down. */
/** The walker himself. */
let guyTimer: ReturnType<typeof setInterval> | null = null;

/** Walk the guy toward a viewport x at px/sec, then call back. */
function walkGuyTo(targetX: number, speed: number, onArrive: () => void) {
  if (guyTimer) clearInterval(guyTimer);
  guyTimer = setInterval(() => {
    const diff = targetX - interactions.guyX;
    const step = speed * 0.05;
    if (Math.abs(diff) <= step) {
      interactions.guyX = targetX;
      if (guyTimer) clearInterval(guyTimer);
      guyTimer = null;
      onArrive();
    } else {
      interactions.guyX += Math.sign(diff) * step;
    }
  }, 50);
}

function stopGuy() {
  if (guyTimer) clearInterval(guyTimer);
  guyTimer = null;
  interactions.guyMounted = false;
  interactions.guyLine = null;
  interactions.guyFading = false;
}

/** On larger screens the guy doesn't hike the whole viewport — he
    exits through an invisible doorway: a short walk in his facing
    direction while fading out. Small screens keep the full walk. */
function walkGuyToDoorway(onDone: () => void) {
  interactions.guyFading = true;
  walkGuyTo(interactions.guyX + interactions.guyFacing * 150, 110, onDone);
}

/** A blowout on the ladder: the room stays dark, and the match guy
    walks across the desk with a flashlight to complain — angrier each
    cycle — then strides back through with a lit match, lighting the
    candle mid-stride without stopping. */
function matchGuyGag(level: 1 | 2 | 3) {
  interactions.gagRunning = true;
  const vw = window.innerWidth;
  if (reducedMotion()) {
    interactions.pitchBlack = true;
    updateLights();
    later(() => {
      bonus.candleLit = true;
      interactions.pitchBlack = false;
      interactions.gagRunning = false;
      updateLights();
    }, 1200);
    return;
  }
  interactions.pitchBlack = true;
  updateLights();
  // On larger screens the full-viewport hike takes forever — he walks
  // in from the nearest edge and leaves through an invisible doorway.
  const doorway = device.isSmallScreen === false;
  later(() => {
    // The complaint walk: in from the left, flashlight sweeping.
    interactions.guyMode = 'flashlight';
    interactions.guyFacing = 1;
    interactions.guyX = -160;
    interactions.guyLine = GUY_LINES[level - 1];
    interactions.guyMounted = true;
    // Desktop: he stops at the screen midpoint, where the doorway is.
    walkGuyTo(doorway ? vw / 2 : vw + 160, 110, () => {
      const afterComplaint = () => {
        // Back with a lit match — and he doesn't break stride. Past
        // the candle; the flame catches a beat after he's gone.
        interactions.guyMode = 'match';
        interactions.guyLine = null;
        interactions.guyMounted = true;
        if (doorway) {
          // Back through the doorway the other way, match in hand:
          // fade in just right of it, walk left through the lit
          // doorway, past the candle, off the left edge — then the
          // door closes behind him.
          interactions.guyFacing = -1;
          interactions.guyX = vw / 2 + 80;
          interactions.guyFading = true;
          interactions.guyMounted = true;
          requestAnimationFrame(() => requestAnimationFrame(() => {
            interactions.guyFading = false;
          }));
          walkGuyTo(-160, 110, () => {
            // The door swings shut behind him, then the slab fades away.
            interactions.doorOpen = false;
            later(() => {
              interactions.doorSlab = false;
              stopGuy();
              lightCandleAfterGag();
            }, 750);
          });
        } else {
          interactions.guyFacing = -1;
          interactions.guyX = vw + 160;
          walkGuyTo(-160, 110, () => {
            stopGuy();
            lightCandleAfterGag();
          });
        }
      };
      if (doorway) {
        // He stops at the midpoint, delivers the line, and a plain dark
        // slab door fades into the black in front of him — then it swings
        // open on its hinge, revealing the doorway blazing amber over the
        // lit page beneath. He walks through silhouetted; the door stays
        // open behind him until he comes back.
        later(() => {
          interactions.doorSlab = true;
          later(() => {
            // The slab stays mounted and swings open (CSS hinge) while
            // the amber blaze fades up behind it.
            interactions.doorOpen = true;
            later(() => {
              interactions.guyFading = true;
              walkGuyTo(vw / 2 + 220, 110, () => {
                stopGuy();
                // The open doorway holds a beat, then he's back.
                later(afterComplaint, 1200);
              });
            }, 750);
          }, 650);
        }, 1400);
      } else {
        stopGuy();
        later(afterComplaint, 1200);
      }
    });
  }, 900);
}

/** Shared ending for the gag's match walk: the candle catches after
    he's gone and the lights come back. */
function lightCandleAfterGag() {
  later(() => {
    bonus.candleLit = true;
    interactions.pitchBlack = false;
    interactions.gagRunning = false;
    updateLights();
  }, 600);
}

/** Ninth blowout: he quits. Walks in from the right,
    says the line, takes the candle, and leaves. The room light comes
    back on to reveal a HELP WANTED flyer where the candle was. */
function matchGuyQuits() {
  interactions.gagRunning = true;
  const vw = window.innerWidth;
  const wick = measureWickSpot();
  if (reducedMotion()) {
    bonus.candleGone = true;
    setThemePlain(true);
    interactions.pitchBlack = false;
    interactions.gagRunning = false;
    updateLights();
    return;
  }
  interactions.pitchBlack = true;
  updateLights();
  // On larger screens he walks in from the nearest edge (the candle
  // lives on the left) and leaves through the invisible doorway.
  const doorway = device.isSmallScreen === false;
  later(() => {
    interactions.guyMode = 'flashlight';
    interactions.guyFacing = doorway ? 1 : -1;
    interactions.guyX = doorway ? -160 : vw + 160;
    interactions.guyLine = "That's it. I QUIT.";
    interactions.guyMounted = true;
    walkGuyTo(wick.x + 34, 110, () => {
      later(() => {
        // He takes the candle.
        interactions.guyLine = null;
        bonus.candleGone = true;
        interactions.guyMode = 'carry';
        updateLights();
        later(() => {
          interactions.guyFacing = 1;
          const leave = () => {
            stopGuy();
            later(() => {
              // The lights come back on. Just the flyer now.
              setThemePlain(true);
              interactions.pitchBlack = false;
              interactions.gagRunning = false;
              updateLights();
            }, 900);
          };
          if (doorway) walkGuyToDoorway(leave);
          else walkGuyTo(vw + 160, 110, leave);
        }, 500);
      }, 900);
    });
  }, 900);
}

/** The match guy un-quits — hired back from the phone's contacts. He
    walks back in with the candle, sets it down where the flyer was,
    and leaves. Fresh fuse: the blowout count resets. */
function rehireMatchGuy() {
  if (!bonus.candleGone || interactions.gagRunning || interactions.ritualRunning) return;
  bonus.blowoutCount = 0;
  const vw = window.innerWidth;
  if (reducedMotion()) {
    bonus.candleGone = false;
    updateLights();
    return;
  }
  interactions.gagRunning = true;
  // The flyer sits where the candle was.
  const flyer = document.querySelector('.help-wanted-flyer');
  const spotX = flyer
    ? flyer.getBoundingClientRect().left + flyer.getBoundingClientRect().width / 2
    : measureWickSpot().x;
  // On larger screens he walks in from the nearest edge and leaves
  // through the invisible doorway.
  const doorway = device.isSmallScreen === false;
  interactions.guyMode = 'carry';
  interactions.guyFacing = doorway ? 1 : -1;
  interactions.guyX = doorway ? -160 : vw + 160;
  interactions.guyLine = "Fine. I'm back.";
  interactions.guyMounted = true;
  walkGuyTo(spotX + 34, 110, () => {
    later(() => {
      // He sets the candle down and the flyer comes with him.
      interactions.guyLine = null;
      bonus.candleGone = false;
      interactions.guyMode = 'empty';
      updateLights();
      later(() => {
        interactions.guyFacing = 1;
        const leave = () => {
          stopGuy();
          interactions.gagRunning = false;
        };
        if (doorway) walkGuyToDoorway(leave);
        else walkGuyTo(vw + 160, 110, leave);
      }, 500);
    }, 900);
  });
}

/** The desk phone's contacts can see whether the match guy has quit
    and hire him back. */
provide('matchGuy', {
  candleGone: toRef(bonus, 'candleGone'),
  rehire: rehireMatchGuy,
});

/** The phone's settings app drives the desk's LED rig through this. */
provide('lights', {
  refresh: updateLights,
});

/** The cord was yanked — decide what the yank means. */
function onCordPulled() {
  if (interactions.ritualRunning || interactions.gagRunning) return;
  const goingDark = !isDark();
  if (!(office.view === 'desk')) {
    // Main view: the cord is just a light switch. No candle out there.
    setThemePlain(!goingDark);
    updateLights();
    return;
  }
  if (goingDark) {
    // Lights out in the book. The LEDs stay exactly as they are —
    // if that leaves no light source, the watcher lights the candle.
    setThemePlain(false);
  } else if (bonus.candleLit) {
    // Lights on while the candle burns: the breeze blows it out.
    setThemePlain(true);
    if (!reducedMotion()) {
      breezeRitual();
      return;
    }
    bonus.candleLit = false;
    bonus.candleSmoking = true;
    setTimeout(() => {
      bonus.candleSmoking = false;
    }, 2600);
  } else {
    setThemePlain(true);
  }
  updateLights();
}

/** Active light sources. The one rule: if this is ever empty while
    the book is open, the hand comes in and lights the candle. */

function refreshSources() {
  const s: string[] = [];
  if (!isDark()) s.push('main');
  if ((office.view === 'desk') && bonus.ledOn) s.push('led');
  if ((office.view === 'desk') && bonus.candleLit) s.push('candle');
  bonus.lightSources = s;
}

watch(() => bonus.lightSources, (s) => {
  if (
    s.length === 0 &&
    (office.view === 'desk') &&
    bonus.enabled &&
    !interactions.ritualRunning &&
    !interactions.gagRunning &&
    !bonus.candleGone
  ) {
    candleLightingRitual();
  }
});

function updateLights() {
  document.documentElement.style.setProperty('--led', bonus.ledColor);
  // The LEDs only exist in the desk view — leaving the book kills them.
  if (!(office.view === 'desk')) bonus.ledOn = false;
  // Faded accent wash while the main light is up; full scene in the dark.
  bonus.ledAccent = bonus.ledOn && !isDark();
  document.documentElement.dataset.led = bonus.ledOn && !bonus.ledAccent ? 'on' : 'off';
  refreshSources();
}

/** Leaving the book: the LED scene stays behind. Plain theme, no
    wash, no hand. The candle stays as it is on the desk. */
function clearLedScene() {
  clearRitual();
  stopGuy();
  interactions.ritualRunning = false;
  interactions.gagRunning = false;
  interactions.pitchBlack = false;
  interactions.matchMounted = false;
  interactions.matchAtWick = false;
  bonus.breezeOn = false;
  bonus.candleSmoking = false;
  document.documentElement.classList.remove('page-shake');
  updateLights();
}

function onRemotePower() {
  if (interactions.ritualRunning || interactions.gagRunning) return;
  // The remote only toggles the LEDs — nothing else. If switching them
  // off leaves no light source, the watcher lights the candle.
  bonus.ledOn = !bonus.ledOn;
  updateLights();
}

function onLedColor(hex: string) {
  bonus.ledColor = hex;
  updateLights();
}

/** The bonus switch on the back of the stack. On: the pull cord drops
    itself from the header. Off: the switch flips instantly and the bonus
    layer wipes — the cord draws itself back up into the header on its
    own beat via the header watcher. The room stays as it was, so a dark
    page stays dark. */
function toggleBonus() {
  if (!bonus.enabled) {
    bonus.enabled = true;
    return;
  }
  bonus.enabled = false;
  bonus.ledOn = false;
  bonus.candleLit = false;
  clearRitual();
  stopGuy();
  interactions.ritualRunning = false;
  interactions.gagRunning = false;
  interactions.pitchBlack = false;
  interactions.matchMounted = false;
  interactions.matchAtWick = false;
  bonus.breezeOn = false;
  bonus.candleSmoking = false;
  document.documentElement.classList.remove('page-shake');
  updateLights();
}

function onLightsOn() {
  updateLights();
}

let themeObs: MutationObserver | null = null;
let lenis: Lenis | null = null;

onMounted(() => {
  // The page always opens in light mode — the LEDs stay off until the
  // reader pulls the cord. This used to live in PullCord, but the cord
  // only mounts once bonus content is on, so it has to run regardless.
  // A manual dark pick from the phone's settings wins over the default.
  document.documentElement.dataset.theme = settings.mode === 'dark' ? 'dark' : 'light';
  try {
    localStorage.removeItem('gs-theme');
  } catch {
    /* ignore */
  }
  // A refresh always restarts at the manuscript cover — never restore the
  // browser's saved scroll position (which could land on contact/about).
  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  } catch {
    /* ignore */
  }
  window.scrollTo(0, 0);
  updateLights();
  themeObs = new MutationObserver(updateLights);
  themeObs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  window.addEventListener('gs:lights-on', onLightsOn);
  window.addEventListener('gs:cord-pulled', onCordPulled);

  if (!motionReduced()) {
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
  <div class="app-root" :class="{ 'camera-moving': office.transitioning, breezing: bonus.breezeOn, 'binding-active': bindingActive }">
  <a href="#main-content" class="skip-link">Skip to content</a>
  <!-- No-CSS escape hatch: raw HTML is deliberately disorienting, so the
       way back is always one tap away. Inline styles survive the
       stylesheet kill switch. -->
  <div
    v-if="settings.noCss"
    style="position:fixed;top:0;left:0;right:0;z-index:999999;background:#fff;color:#000;padding:10px 14px;font:14px/1.4 sans-serif;border-bottom:2px solid #000;"
  >
    <span>You're browsing raw, unstyled HTML. </span>
    <button
      type="button"
      style="font:inherit;padding:6px 12px;cursor:pointer;"
      @click="settings.toggleNoCss()"
    >
      Turn the styles back on
    </button>
  </div>
  <SiteNav v-show="!bindingActive" :bonus-content="bonus.enabled" @contact="onNavContact" @home="onNavHome" />
  <main id="main-content">
  <h1 class="sr-only">{{ settings.siteName }} — websites that tell stories</h1>
  <Office
    ref="officeRef"
    @open-book="openBook"
    @back-to-cover="tiltUp"
    @back-to-cover-section="closeBookToSection"
    @finale-contact="onFinaleContact"
  >
    <template #cover>
      <CoverHero
        :book-drop-key="boundBookDrop"
        :bonus-content="bonus.enabled"
        @open-book="openBook"
        @toggle-bonus="toggleBonus"
      />
    </template>
    <template #desk-props>
      <RemoteControl
        v-if="bonus.enabled"
        :led-on="bonus.ledOn"
        :color="bonus.ledColor"
        @power="onRemotePower"
        @set-color="onLedColor"
      />
      <DeskCandle
        v-if="bonus.enabled && !bonus.candleGone"
        :lit="bonus.candleLit"
        :smoking="bonus.candleSmoking"
        @blow-out="onCandleBlowOut"
      />
      <!-- After the match guy quits, all that's left is this flyer. -->
      <div v-if="bonus.enabled && bonus.candleGone" class="help-wanted-flyer" aria-hidden="true">
        <span class="hw-tape"></span>
        <span class="hw-title">HELP<br />WANTED</span>
        <span class="hw-sub">inquire within</span>
      </div>
      <DeskPencil />
      <DeskClutter />
      <FirstDraft v-if="bonus.enabled" />
      <DeskPhone v-if="bonus.enabled" shortcut />
    </template>
  </Office>
  </main>
  <!-- Contact/about sections (below the Office carousel, shelf view only). -->
  <div v-if="office.view === 'shelf'" class="home-sections">
    <Cover :is-bound="manuscriptBound" @open-book-instant="openBook(true)" />
  </div>
  <BindCinematic
    ref="bindCinematic"
    :bonus-content="bonus.enabled"
    @done="onBindDone"
    @blackout="onBindBlackout"
    @shelf="onBindShelf"
  />
  <SandwichBite v-if="biteActive" @done="onBiteDone" />
  <!-- Settings shortcut: appears on the main screen only when the user
       has changed something, and only while the book is closed. Taps
       open the desk phone's Settings app. -->
  <button
    v-if="settings.isModified && office.view !== 'desk' && !bindingActive"
    type="button"
    class="settings-fab"
    aria-label="Open phone settings"
    @click="openPhoneSettings"
  >
    <span aria-hidden="true">⚙</span>
  </button>
  <OpenTransition
    v-if="showOpenTransition"
    @done="onOpenTransitionDone"
  />
  <BookIntroModal
    v-if="showBookIntro"
    @close="showBookIntro = false"
  />
  <!-- Light rituals: true darkness before the match hand comes in. -->
  <div class="pitch-black" :class="{ on: interactions.pitchBlack && !interactions.doorOpen }" aria-hidden="true"></div>
  <!-- The match guy's doorway (desktop gag levels). Closed: a plain
       flat dark slab faded into the black at the screen midpoint.
       Open: the slab swings open on its hinge to a doorway blazing
       amber, revealing the lit page beneath, with light spilling onto
       the floor. No fire — the reveal is the swing. -->
  <div class="door-slab" :class="{ on: interactions.doorSlab, open: interactions.doorOpen }" aria-hidden="true"></div>
  <svg
    class="pitch-door"
    :class="{ open: interactions.doorOpen }"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <defs>
      <mask id="mgDoorMask">
        <rect x="0" y="0" width="100" height="100" fill="#fff" />
        <path d="M44 76 V40 H56 V76 Z" fill="#000" />
      </mask>
    </defs>
    <rect x="0" y="0" width="100" height="100" fill="#000" mask="url(#mgDoorMask)" />
  </svg>
  <div class="doorway" :class="{ on: interactions.doorOpen }" aria-hidden="true">
    <div class="doorway-blaze"></div>
    <div class="doorway-spill"></div>
  </div>
  <!-- LED wash: the room lit by the strip, tinted to the remote's color. -->
  <div class="led-wash" :class="{ on: bonus.ledOn, accent: bonus.ledAccent }" aria-hidden="true"></div>
  <!-- Candlelight: warm wash while the candle burns. Desk view only —
       never on the main page. -->
  <div class="candle-wash" :class="{ on: bonus.candleLit && office.view === 'desk' }" aria-hidden="true"></div>
  <!-- Breeze gust sweeping the desk, left to right. -->
  <div class="breeze" :class="{ on: bonus.breezeOn }" aria-hidden="true"></div>
  <MatchHand
    v-if="interactions.matchMounted"
    :x="interactions.matchXY.x"
    :y="interactions.matchXY.y"
    :at-wick="interactions.matchAtWick"
  />
  <!-- The match guy's complaint walk / resignation. -->
  <MatchGuy
    v-if="interactions.guyMounted"
    :x="interactions.guyX"
    :mode="interactions.guyMode"
    :facing="interactions.guyFacing"
    :line="interactions.guyLine"
    :fading="interactions.guyFading"
    :class="{ 'door-glow': interactions.doorOpen }"
  />
  </div>
</template>

<style>
.gs-no-scroll {
  overflow: hidden;
}
/* Floating settings shortcut: bottom-right, only when the user has
   changed a setting and the book is closed. */
.settings-fab {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 900;
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(16, 14, 12, 0.82);
  color: #f5ead6;
  font-size: 1.3rem;
  cursor: pointer;
  backdrop-filter: blur(6px);
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.45);
  transition: transform 0.2s ease;
}
.settings-fab:hover {
  transform: scale(1.08);
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
