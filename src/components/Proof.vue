<script setup lang="ts">
import { useRouter } from 'vue-router';
import ChapterHeading from './ChapterHeading.vue';
import { siteConfig } from '../config';

const router = useRouter();
</script>

<template>
  <section id="proof" class="chapter book-page" aria-label="Chapter 3 — The proof">
    <div class="wrap">
      <ChapterHeading
        index="03"
        kicker="Chapter Three &mdash; The Proof"
        title="Don&rsquo;t take my <em>word for it.</em>"
      />
      <p v-reveal class="lede" style="margin-bottom: 2.6rem">
        A portfolio is a story&rsquo;s evidence locker. Here&rsquo;s what
        happens when a business gets a website with a plot.
      </p>
      <div v-reveal class="proof-strip">
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
              You&rsquo;re turning the pages of the portfolio itself &mdash;
              cover, chapters, page turns and all. No templates, no themes:
              the medium is the pitch.
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
          <button class="btn btn-solid" @click="router.push('/about')">
            Claim the page <span class="arrow" aria-hidden="true">&rarr;</span>
          </button>
        </article>
      </div>
      <p class="proof-hint" aria-hidden="true">
        <span>Swipe</span><span>&rarr;</span>
      </p>
    </div>
  </section>
</template>
