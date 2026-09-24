<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { gsap } from 'gsap';

const router = useRouter();
let ctx: gsap.Context | null = null;

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function open() {
  router.push('/prologue');
}

onMounted(() => {
  const root = document.querySelector<HTMLElement>('.cover');
  if (!root || reducedMotion()) return;
  ctx = gsap.context(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.2 });
    tl.from('.cover-kicker', { y: 16, opacity: 0, duration: 0.8 })
      .from('.cover-title .h-line-inner', { y: '115%', duration: 1.2, stagger: 0.12 }, '-=0.5')
      .from('.cover-sub', { y: 20, opacity: 0, duration: 0.9 }, '-=0.7')
      .from('.cover-cta', { y: 18, opacity: 0, duration: 0.8 }, '-=0.6')
      .from('.cover-hint', { opacity: 0, duration: 0.9 }, '-=0.4');
  }, root);
});

onUnmounted(() => ctx?.revert());
</script>

<template>
  <section class="cover book-page" aria-label="Cover">
    <div class="cover-glow" aria-hidden="true"></div>
    <div class="wrap cover-inner">
      <p class="cover-kicker">A portfolio &middot; by Chris Gray</p>
      <h1 class="cover-title">
        <span class="h-line"><span class="h-line-inner">Gray</span></span>
        <span class="h-line"><span class="h-line-inner">Solutions<em>.</em></span></span>
      </h1>
      <p class="cover-sub">
        <em>Websites that tell stories.</em>
      </p>
      <div class="cover-cta">
        <button class="btn btn-solid" @click="open()">
          Open the book <span class="arrow" aria-hidden="true">&rarr;</span>
        </button>
      </div>
      <p class="cover-hint">Eight pages &middot; best read front to back</p>
    </div>
  </section>
</template>
