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
      of the reader. Gray Solutions is where I do that for other people&rsquo;s
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
const LINKS = [
  {
    label: 'GitHub',
    href: 'https://github.com/Xyphoid5000',
    external: true,
  },
  {
    label: 'Email',
    href: 'mailto:c90gray@gmail.com?subject=Let%27s%20write%20my%20story',
    external: false,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/chris-gray-b0b50b1b4',
    external: true,
  },
];
</script>
