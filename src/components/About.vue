<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { gsap } from 'gsap';
import AboutMe from './AboutMe.vue';

const router = useRouter();

let ctx: gsap.Context | null = null;

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('.about-standalone .about-me > *').forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 90%' },
        },
      );
    });
  });
});

onUnmounted(() => {
  ctx?.revert();
  ctx = null;
});
</script>

<template>
  <div class="about-standalone">
    <div class="wrap">
      <button class="back-link" @click="router.push('/finale')">
        <span class="arrow" aria-hidden="true">&larr;</span> Back to the story
      </button>
      <AboutMe />
    </div>
  </div>
</template>
