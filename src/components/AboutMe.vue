<!--
  The about-me content, shared by the home page section and the
  standalone /about page. Portrait: swap the monogram for Chris's
  photo — <img class="about-photo" src="../assets/chris.jpg" alt="Chris Gray" />
  dropped inside .about-portrait, and it fills the frame.
-->
<template>
  <div class="about-me">
    <div class="about-portrait" role="img" aria-label="Portrait of Chris Gray">
      <span class="about-monogram" aria-hidden="true">CG</span>
    </div>
    <p class="kicker"><span class="k-num">&sect;</span> About me</p>
    <h2 class="h-display">The guy behind the book.</h2>
    <p class="hero-sub">
      I&rsquo;m a senior software engineer who treats every website like a
      story — with a hook, a rising arc, and an ending that asks something
      of the reader. {{ settings.siteName }} is where I do that for other people&rsquo;s
      businesses.
    </p>
    <p class="about-signoff">
      <em>Every business has a story. Mine is helping you tell yours.</em>
    </p>
    <nav class="about-links" aria-label="Elsewhere">
      <a
        v-for="l in LINKS"
        :key="l.label"
        :href="l.href"
        :target="l.external ? '_blank' : undefined"
        :rel="l.external ? 'noopener' : undefined"
        >{{ l.label }}</a
      >
    </nav>
  </div>
</template>

<script setup lang="ts">
import { siteConfig } from '../config';
import { useSettingsStore } from '../stores/settings';

const settings = useSettingsStore();

const LINKS = [
  {
    label: 'GitHub',
    href: siteConfig.github,
    external: true,
  },
  {
    label: 'Email',
    href: `mailto:${siteConfig.email}?subject=Let%27s%20write%20my%20story`,
    external: false,
  },
  {
    label: 'LinkedIn',
    href: siteConfig.linkedIn,
    external: true,
  },
];
</script>
