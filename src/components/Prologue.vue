<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const router = useRouter();

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let ctx: gsap.Context | null = null;

onMounted(() => {
  const root = document.querySelector<HTMLElement>('.prologue');
  if (!root || reducedMotion()) return;
  ctx = gsap.context(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.15 });
    tl.from('.hero-title .h-line-inner', {
      y: '115%',
      duration: 1.25,
      stagger: 0.14,
    });
  }, root);
});

onUnmounted(() => ctx?.revert());
</script>

<template>
  <section class="prologue book-page" aria-label="Prologue">
    <div class="prologue-glow" aria-hidden="true"></div>
    <div class="wrap">
      <p v-reveal class="hero-kicker">Gray Solutions &middot; a portfolio</p>
      <h1 class="hero-title">
        <span class="h-line"
          ><span class="h-line-inner">Every website</span></span
        >
        <span class="h-line"
          ><span class="h-line-inner">is a <em>story.</em></span></span
        >
        <span class="h-line"
          ><span class="h-line-inner hero-title-dim"
            >Most are told <em>badly.</em></span
          ></span
        >
      </h1>
      <div v-reveal class="hero-ctas">
        <a
          href="#/premise"
          class="btn btn-solid"
          @click.prevent="router.push('/premise')"
        >
          Read the story <span class="arrow" aria-hidden="true">&rarr;</span>
        </a>
        <a
          href="#/proof"
          class="btn btn-ghost"
          @click.prevent="router.push('/proof')"
          >Skip to the proof</a
        >
      </div>
      <p v-reveal class="hero-meta">
        <span>Chris Gray</span
        ><span class="dot" aria-hidden="true">&middot;</span>
        <span>Design &amp; Engineering</span
        ><span class="dot" aria-hidden="true">&middot;</span>
        <span>Est. MMXXVI</span>
      </p>
    </div>
  </section>
</template>
