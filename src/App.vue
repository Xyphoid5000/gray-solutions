<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SiteNav from './components/SiteNav.vue';
import Prologue from './components/Prologue.vue';
import Premise from './components/Premise.vue';
import Craft from './components/Craft.vue';
import Proof from './components/Proof.vue';
import StoryArc from './components/StoryArc.vue';
import Author from './components/Author.vue';
import Epilogue from './components/Epilogue.vue';
import SiteFooter from './components/SiteFooter.vue';
import { setLenis } from './lib/scroll';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  // Route anchor clicks through Lenis so chapters glide instead of jump.
  anchorHandler = (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(
      'a[href^="#"]',
    );
    if (!anchor) return;
    const hash = anchor.getAttribute('href');
    if (!hash || hash.length < 2) return;
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
  <div class="grain" aria-hidden="true"></div>
  <SiteNav />
  <main>
    <Prologue />
    <Premise />
    <Craft />
    <Proof />
    <StoryArc />
    <Author />
    <Epilogue />
  </main>
  <SiteFooter />
</template>
