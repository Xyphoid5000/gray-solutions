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
  // The book is bound — mark it directly so the front page shows the
  // book, not the manuscript. The cover's own drop intro plays the
  // landing; then we glide to the contact form.
  markManuscriptBound();
  closeBookToSection('contact', 2600);
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

function updateCandle() {
  candleLit.value = isDark() && !blacklight.value;
  document.documentElement.dataset.blacklight = blacklight.value ? 'on' : 'off';
}

function blowOutCandle() {
  if (!candleLit.value) return;
  blacklight.value = true;
  updateCandle();
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
      <DeskCandle :lit="candleLit" :blacklight="blacklight" @blowOut="blowOutCandle" />
      <DeskPencil />
    </template>
  </BookView>
  <LostPage :visible="blacklight" @close="onLostPageClose" />
  <BindCinematic ref="bindCinematic" @done="onBindDone" />
</template>
