<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { siteConfig } from '../config';
import { returnToContact } from '../lib/ui';

gsap.registerPlugin(ScrollTrigger);

const router = useRouter();

function startProject() {
  // Close the book, zoom back out, drift down to the contact form.
  returnToContact.value = true;
  router.push('/');
}

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let ctx: gsap.Context | null = null;

onMounted(() => {
  const root = document.querySelector<HTMLElement>('.prologue');
  if (!root || reducedMotion()) return;
  ctx = gsap.context(() => {
    // A single-screen title page: the headline arrives on a fixed
    // timeline — no scroll triggers to miss.
    const tl = gsap.timeline({ delay: 0.15 });
    tl.from(
      '.hero-kicker',
      { opacity: 0, y: 24, duration: 0.9, ease: 'power3.out' },
      0,
    )
      .to(
        '.hero-title .h-line-inner',
        { y: 0, duration: 1.25, ease: 'power4.out', stagger: 0.14 },
        0.1,
      )
      .from(
        '.hero-sub',
        { opacity: 0, y: 24, duration: 0.9, ease: 'power3.out' },
        0.5,
      );
  }, root);
});

onUnmounted(() => ctx?.revert());
</script>

<template>
  <section class="prologue book-page" aria-label="The end">
    <div class="prologue-glow" aria-hidden="true"></div>
    <div class="wrap">
      <p class="hero-kicker">About the author</p>
      <h1 class="hero-title">
        <span class="h-line"
          ><span class="h-line-inner">Hi, I&rsquo;m <em>Chris.</em></span></span
        >
      </h1>
      <p class="hero-sub">
        I build websites that tell stories.
        <button class="link-more" @click="router.push('/about')">
          More about me <span class="arrow" aria-hidden="true">&rarr;</span>
        </button>
      </p>

      <div v-reveal class="fin" aria-label="The end">
        <p class="fin-ornament" aria-hidden="true">&#10087;</p>
        <p class="ch-kicker">The end</p>
        <h2 class="epilogue-title">Let&rsquo;s write <em>yours.</em></h2>
        <p class="epilogue-sub">
          Tell me what your business does and who it&rsquo;s for. I&rsquo;ll
          tell you the story your website should be telling &mdash; and then
          I&rsquo;ll build it.
        </p>
        <div class="epilogue-ctas">
          <button class="btn btn-solid" @click="startProject()">
            Start your story
            <span class="arrow" aria-hidden="true">&rarr;</span>
          </button>
          <a
            :href="siteConfig.github"
            target="_blank"
            rel="noopener"
            class="btn btn-ghost"
          >
            GitHub
          </a>
        </div>
        <nav class="epilogue-links" aria-label="Elsewhere">
          <a :href="`mailto:${siteConfig.email}`">{{ siteConfig.email }}</a>
          <a :href="siteConfig.github" target="_blank" rel="noopener">GitHub</a>
          <a :href="siteConfig.linkedIn" target="_blank" rel="noopener"
            >LinkedIn</a
          >
        </nav>
      </div>
    </div>
  </section>
</template>
