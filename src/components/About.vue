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
    // A single-screen title page: everything arrives on a fixed
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
      )
      .from(
        '.hero-ctas',
        { opacity: 0, y: 24, duration: 0.9, ease: 'power3.out' },
        0.62,
      )
      .from(
        '.hero-meta',
        { opacity: 0, y: 24, duration: 0.9, ease: 'power3.out' },
        0.74,
      );
  }, root);
});

onUnmounted(() => ctx?.revert());
</script>

<template>
  <section class="prologue book-page" aria-label="About the author">
    <div class="prologue-glow" aria-hidden="true"></div>
    <div class="wrap">
      <p class="hero-kicker">About the author</p>
      <h1 class="hero-title">
        <span class="h-line"
          ><span class="h-line-inner">Hi, I&rsquo;m <em>Chris.</em></span></span
        >
        <span class="h-line"
          ><span class="h-line-inner hero-title-dim"
            >I build websites</span
          ></span
        >
        <span class="h-line"
          ><span class="h-line-inner hero-title-dim"
            >that tell <em>stories.</em></span
          ></span
        >
      </h1>
      <p class="hero-sub">
        Senior software engineer by day &mdash; C# backends, Vue frontends,
        databases that behave. Through Gray Solutions I build story-driven
        websites for businesses that deserve better than a template.
      </p>
      <div class="hero-ctas">
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
      <p class="hero-meta">
        <span>Chris Gray</span
        ><span class="dot" aria-hidden="true">&middot;</span>
        <span>Design &amp; Engineering</span
        ><span class="dot" aria-hidden="true">&middot;</span>
        <span>Est. MMXXVI</span>
      </p>
    </div>
  </section>
</template>
