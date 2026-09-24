<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ChapterIndex from './ChapterIndex.vue';
import { scrollToElement, scrollToTop } from '../lib/scroll';

gsap.registerPlugin(ScrollTrigger);

const scrolled = ref(false);
const hidden = ref(false);
const index = ref<{ show: () => void; isOpen: () => boolean } | null>(null);
let lastY = 0;
let progressTween: gsap.core.Tween | null = null;
let onScroll: (() => void) | null = null;

function go(target: string) {
  const el = document.getElementById(target);
  if (el) scrollToElement(el);
}

function openIndex() {
  hidden.value = false;
  index.value?.show();
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
    // shouts over the story. Never hide while the index is open.
    if (!index.value?.isOpen()) {
      hidden.value = y > lastY && y > 320;
    }
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
      <div class="nav-right">
        <button class="chapters-btn" @click="openIndex()" aria-haspopup="dialog">
          <span class="chapters-icon" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>
          Chapters
        </button>
        <a
          href="#epilogue"
          class="btn btn-solid nav-cta"
          @click.prevent="go('epilogue')"
        >
          Start a project
        </a>
      </div>
    </div>
    <div class="nav-progress" aria-hidden="true"></div>
  </header>
  <ChapterIndex ref="index" />
</template>
