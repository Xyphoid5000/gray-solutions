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
  if (!root) return;

  ctx = gsap.context(() => {
    if (reducedMotion()) {
      gsap.set('.h-line-inner', { y: 0 });
      return;
    }

    // Opening titles: the story starts before the first scroll.
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.25 });
    tl.from('.hero-eyebrow', { y: 18, opacity: 0, duration: 0.9 })
      .to('.h-line-inner', { y: 0, duration: 1.25, stagger: 0.12 }, '-=0.55')
      .from('.hero-sub', { y: 26, opacity: 0, duration: 1 }, '-=0.8')
      .from('.hero-ctas .btn', { y: 22, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.75')
      .from('.hero-meta > *', { y: 14, opacity: 0, duration: 0.7, stagger: 0.08 }, '-=0.6')
      .from('.scroll-cue', { opacity: 0, duration: 0.9 }, '-=0.4');

    // The giant background word drifts away slower than the scroll —
    // depth without a single WebGL call.
    gsap.to('.prologue-word', {
      yPercent: 34,
      ease: 'none',
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
    gsap.to('.prologue .wrap', {
      yPercent: -8,
      opacity: 0.25,
      ease: 'none',
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }, root);
});

onUnmounted(() => ctx?.revert());
</script>

<template>
  <section id="prologue" class="prologue" aria-label="Prologue">
    <div class="prologue-glow" aria-hidden="true"></div>
    <div class="prologue-word" aria-hidden="true">STORY</div>
    <div class="wrap">
      <p class="hero-eyebrow">
        <span class="dot" aria-hidden="true"></span>
        Chris Gray &middot; Gray Solutions
      </p>
      <h1 class="hero-title">
        <span class="h-line"><span class="h-line-inner">Every website</span></span>
        <span class="h-line"><span class="h-line-inner">is a <em>story.</em></span></span>
        <span class="h-line"><span class="h-line-inner">Most are told badly.</span></span>
      </h1>
      <p class="hero-sub">
        Most business sites are digital brochures &mdash; a list of services,
        a stock photo, a contact form nobody fills out. I&rsquo;m
        <strong>Chris Gray</strong>, and I build the other kind: cinematic,
        story-driven websites that give visitors a reason to keep scrolling
        &mdash; and a reason to call.
      </p>
      <div class="hero-ctas">
        <a href="#/premise" class="btn btn-solid" @click.prevent="router.push('/premise')">
          Read the story <span class="arrow" aria-hidden="true">&rarr;</span>
        </a>
        <a href="#/proof" class="btn btn-ghost" @click.prevent="router.push('/proof')">
          See the proof
        </a>
      </div>
      <div class="hero-meta">
        <span>Vue 3 &middot; TypeScript &middot; GSAP</span>
        <span>Cleveland, Ohio</span>
        <span>Est. MMXXVI</span>
      </div>
      <div class="scroll-cue" aria-hidden="true">
        <span class="cue-line"></span>
        <span>Scroll</span>
      </div>
    </div>
  </section>
</template>
