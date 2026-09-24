<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ChapterHeading from './ChapterHeading.vue';
import { siteConfig } from '../config';
import { scrollToElement } from '../lib/scroll';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let st: ScrollTrigger | undefined;

function go(target: string) {
  const el = document.getElementById(target);
  if (el) scrollToElement(el);
}

onMounted(() => {
  if (reducedMotion()) return;
  const track = document.querySelector<HTMLElement>('.proof-track');
  const pin = document.querySelector<HTMLElement>('.proof-pin');
  if (!track || !pin) return;

  const distance = () => track.scrollWidth - window.innerWidth;

  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });
  st = tween.scrollTrigger ?? undefined;
});

onUnmounted(() => {
  st?.kill();
  st = undefined;
});
</script>

<template>
  <section id="proof" class="chapter" aria-label="Chapter 3 — The proof" style="padding-bottom: 0">
    <div class="wrap">
      <ChapterHeading
        index="03"
        kicker="Chapter Three &mdash; The Proof"
        title="Don&rsquo;t take my <em>word for it.</em>"
      />
      <p v-reveal class="lede" style="margin-bottom: 3rem">
        A portfolio is a story&rsquo;s evidence locker. Here&rsquo;s what
        happens when a business gets a website with a plot.
      </p>
    </div>
    <div class="proof-pin">
      <div class="proof-track">
        <article class="proof-panel">
          <div>
            <span class="proof-index">Exhibit A</span>
            <h3>Burning River Auto Glass</h3>
            <p>
              A local auto glass company on a generic Squarespace template.
              I rebuilt it as a cinematic custom site &mdash; the same
              business, an entirely different first impression. Scroll-driven
              storytelling, built to make a cracked windshield feel like the
              start of an adventure.
            </p>
            <ul class="proof-tags">
              <li>Design</li>
              <li>Vue 3</li>
              <li>GSAP</li>
            </ul>
          </div>
          <a
            class="proof-link"
            href="https://github.com/Xyphoid5000/Brag"
            target="_blank"
            rel="noopener"
          >
            View the build <span class="arrow" aria-hidden="true">&rarr;</span>
          </a>
        </article>
        <article class="proof-panel">
          <div>
            <span class="proof-index">Exhibit B</span>
            <h3>This very website</h3>
            <p>
              You&rsquo;re reading the portfolio as a story &mdash; prologue,
              premise, proof, and all. No templates, no themes: a single
              scroll that demonstrates the whole thesis. The medium is the
              pitch.
            </p>
            <ul class="proof-tags">
              <li>Concept</li>
              <li>Vue 3</li>
              <li>TypeScript</li>
              <li>GSAP</li>
            </ul>
          </div>
          <a
            class="proof-link"
            :href="siteConfig.github"
            target="_blank"
            rel="noopener"
          >
            Browse the code <span class="arrow" aria-hidden="true">&rarr;</span>
          </a>
        </article>
        <article class="proof-panel cta-panel">
          <div>
            <span class="proof-index">Exhibit C</span>
            <h3>Your business here.</h3>
            <p>
              Every portfolio needs a blank page. This one&rsquo;s yours
              &mdash; the before-and-after your competitors will wish
              they&rsquo;d done first.
            </p>
          </div>
          <a href="#epilogue" class="btn btn-solid" @click.prevent="go('epilogue')">
            Claim the page <span class="arrow" aria-hidden="true">&rarr;</span>
          </a>
        </article>
      </div>
      <div class="wrap">
        <p class="proof-hint" aria-hidden="true">
          <span>Keep scrolling</span><span>&rarr;</span>
        </p>
      </div>
    </div>
  </section>
</template>
