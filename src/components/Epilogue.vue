<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { siteConfig } from '../config';

gsap.registerPlugin(ScrollTrigger);

let ctx: gsap.Context | null = null;

onMounted(() => {
  const root = document.querySelector<HTMLElement>('.epilogue');
  if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return;

  ctx = gsap.context(() => {
    // The closing line lands like a final chord.
    gsap.from('.epilogue-title .h-line-inner', {
      y: '115%',
      duration: 1.2,
      ease: 'power4.out',
      stagger: 0.12,
      scrollTrigger: { trigger: root, start: 'top 68%', once: true },
    });
  }, root);
});

onUnmounted(() => ctx?.revert());
</script>

<template>
  <section id="epilogue" class="chapter epilogue" aria-label="Epilogue">
    <div class="wrap">
      <p v-reveal class="ch-kicker">Epilogue</p>
      <h2 class="epilogue-title">
        <span class="h-line"><span class="h-line-inner">Every story needs</span></span>
        <span class="h-line"><span class="h-line-inner">an <em>ending.</em></span></span>
        <span class="h-line"><span class="h-line-inner">Let&rsquo;s write <em>yours.</em></span></span>
      </h2>
      <p v-reveal class="epilogue-sub">
        Tell me what your business does and who it&rsquo;s for. I&rsquo;ll
        tell you the story your website should be telling &mdash; and then
        I&rsquo;ll build it.
      </p>
      <div v-reveal class="epilogue-ctas">
        <a :href="`mailto:${siteConfig.email}`" class="btn btn-solid">
          Start your story <span class="arrow" aria-hidden="true">&rarr;</span>
        </a>
        <a
          :href="siteConfig.github"
          target="_blank"
          rel="noopener"
          class="btn btn-ghost"
        >
          GitHub
        </a>
      </div>
      <nav v-reveal class="epilogue-links" aria-label="Elsewhere">
        <a :href="`mailto:${siteConfig.email}`">{{ siteConfig.email }}</a>
        <a :href="siteConfig.github" target="_blank" rel="noopener">GitHub</a>
        <a :href="siteConfig.linkedIn" target="_blank" rel="noopener">LinkedIn</a>
      </nav>
    </div>
  </section>
</template>
