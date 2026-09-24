<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollToElement, scrollToTop } from '../lib/scroll';

gsap.registerPlugin(ScrollTrigger);

const links = [
  { label: 'Story', target: 'premise' },
  { label: 'Craft', target: 'craft' },
  { label: 'Work', target: 'proof' },
  { label: 'Process', target: 'arc' },
  { label: 'About', target: 'author' },
];

const scrolled = ref(false);
const hidden = ref(false);
let lastY = 0;
let progressTween: gsap.core.Tween | null = null;
let onScroll: (() => void) | null = null;

function go(target: string) {
  const el = document.getElementById(target);
  if (el) scrollToElement(el);
}

onMounted(() => {
  const bar = document.querySelector<HTMLElement>('.nav-progress');
  if (bar) {
    progressTween = gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3,
      },
    });
  }

  onScroll = () => {
    const y = window.scrollY;
    scrolled.value = y > 40;
    // Hide on the way down, reveal on the way up — the nav never
    // shouts over the story.
    hidden.value = y > lastY && y > 320;
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});

onUnmounted(() => {
  if (onScroll) window.removeEventListener('scroll', onScroll);
  progressTween?.scrollTrigger?.kill();
  progressTween?.kill();
});
</script>

<template>
  <header
    class="site-nav"
    :class="{ scrolled: scrolled, hidden: hidden }"
  >
    <div class="nav-inner">
      <a
        class="brand"
        href="#prologue"
        @click.prevent="scrollToTop()"
        aria-label="Gray Solutions — back to the top"
      >
        <span class="brand-mark" aria-hidden="true">G.</span>
        <span>Gray Solutions<em>.</em></span>
      </a>
      <nav aria-label="Chapters">
        <ul class="nav-links">
          <li v-for="link in links" :key="link.target">
            <a :href="'#' + link.target" @click.prevent="go(link.target)">
              {{ link.label }}
            </a>
          </li>
        </ul>
      </nav>
      <a
        href="#epilogue"
        class="btn btn-solid nav-cta"
        @click.prevent="go('epilogue')"
      >
        Start a project
      </a>
    </div>
    <div class="nav-progress" aria-hidden="true"></div>
  </header>
</template>
