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
      )
      .from(
        '.hero-meta',
        { opacity: 0, y: 24, duration: 0.9, ease: 'power3.out' },
        0.62,
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
      <ul v-reveal="0.1" class="author-facts">
        <li>
          <span class="fact-k">Day job</span>
          <span class="fact-v"
            ><strong>Senior software engineer</strong> &mdash; C#, Vue 3,
            TypeScript</span
          >
        </li>
        <li>
          <span class="fact-k">Side quest</span>
          <span class="fact-v"
            ><strong>Gray Solutions</strong> &mdash; story-driven client
            websites</span
          >
        </li>
        <li>
          <span class="fact-k">After hours</span>
          <span class="fact-v">Drums, keys, and worship-team Sundays</span>
        </li>
        <li>
          <span class="fact-k">Based in</span>
          <span class="fact-v">{{ siteConfig.location }}</span>
        </li>
        <li>
          <span class="fact-k">Currently</span>
          <span class="fact-v"
            >Booking select projects &mdash;
            <strong>one story at a time</strong></span
          >
        </li>
      </ul>
      <p class="hero-meta">
        <span>Chris Gray</span
        ><span class="dot" aria-hidden="true">&middot;</span>
        <span>Design &amp; Engineering</span
        ><span class="dot" aria-hidden="true">&middot;</span>
        <span>Est. MMXXVI</span>
      </p>

      <div v-reveal class="fin" aria-label="Epilogue">
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
