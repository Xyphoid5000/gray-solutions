<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import IntroSequence from './components/IntroSequence.vue';
import Nav from './components/Nav.vue';
import Hero from './components/Hero.vue';
import About from './components/About.vue';
import Services from './components/Services.vue';
import Work from './components/Work.vue';
import Process from './components/Process.vue';
import Contact from './components/Contact.vue';
import Footer from './components/Footer.vue';
import { setLenis } from './lib/scroll';

gsap.registerPlugin(ScrollTrigger);

/** Cheap WebGL probe so we never download three.js where it can't run. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    );
  } catch {
    return false;
  }
}

const params = new URLSearchParams(window.location.search);
const reducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The intro region exists only when it can actually run. Reduced-motion,
// no-WebGL, and ?skip-intro visitors land straight on the hero.
const showIntro = ref(
  !reducedMotion && !params.has('skip-intro') && hasWebGL(),
);

let lenis: Lenis | null = null;
let anchorHandler: ((e: MouseEvent) => void) | null = null;

onMounted(() => {
  if (reducedMotion) return;

  // Lenis smooth scrolling — the buttery, inertial feel is the message.
  // Wired into GSAP's ticker so ScrollTrigger scrub stays perfectly in sync.
  lenis = new Lenis({ duration: 1.25, smoothWheel: true });
  setLenis(lenis);
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // Route nav anchor clicks through Lenis so they glide instead of jump.
  anchorHandler = (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(
      'a[href^="#"]',
    );
    if (!anchor) return;
    const hash = anchor.getAttribute('href');
    if (!hash || hash === '#') {
      e.preventDefault();
      lenis?.scrollTo(0, { duration: 1.6 });
      return;
    }
    const target = document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    lenis?.scrollTo(target as HTMLElement, { offset: -72, duration: 1.6 });
  };
  document.addEventListener('click', anchorHandler);

  // Measure after everything (and the display font) has settled.
  requestAnimationFrame(() => ScrollTrigger.refresh());
  if (document.fonts) {
    document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
  }
});

onUnmounted(() => {
  if (anchorHandler) document.removeEventListener('click', anchorHandler);
  anchorHandler = null;
  lenis?.destroy();
  lenis = null;
  setLenis(null);
});
</script>

<template>
  <Nav />
  <IntroSequence v-if="showIntro" @unavailable="showIntro = false" />
  <div class="page">
    <main>
      <!-- When the intro runs, the hero lives inside its sticky stage and
           is revealed in place — so the page must NOT render a second one.
           This one is the static fallback (reduced-motion / no-WebGL /
           ?skip-intro / WebGL failure). -->
      <Hero v-if="!showIntro" />
      <About />
      <Services />
      <Work />
      <Process />
      <Contact />
    </main>
    <Footer />
  </div>
</template>
