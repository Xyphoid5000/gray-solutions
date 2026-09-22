<script setup lang="ts">
import Wordmark from './Wordmark.vue';
import { siteConfig } from '../config';

const year = new Date().getFullYear();

const links = [
  { label: 'Work', href: '#work' },
  { label: 'Services', href: '#services' },
  { label: 'Process', href: '#process' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];
</script>

<template>
  <footer class="footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <a href="#top" class="footer-logo" aria-label="Gray Solutions home">
          <img src="/logo-badge.jpg" alt="Gray Solutions" class="footer-mark" />
          <Wordmark size="md" />
        </a>
        <p class="footer-tagline">{{ siteConfig.tagline }}</p>
      </div>

      <nav class="footer-links" aria-label="Footer">
        <a v-for="l in links" :key="l.href" :href="l.href">{{ l.label }}</a>
      </nav>

      <div class="footer-socials">
        <a :href="siteConfig.linkedIn" target="_blank" rel="noopener" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45Z" />
          </svg>
        </a>
        <a :href="siteConfig.github" target="_blank" rel="noopener" aria-label="GitHub">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.35.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12v3.15c0 .3.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
          </svg>
        </a>
        <a :href="`mailto:${siteConfig.email}`" aria-label="Email">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 6L2 7" />
          </svg>
        </a>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>&copy; {{ year }} {{ siteConfig.name }}. All rights reserved.</p>
      <p class="footer-built">Designed &amp; built by hand &mdash; Vue, GSAP &amp; Three.js</p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--line);
  background: #070a0f;
  padding: 3.5rem 0 2rem;
}

.footer-inner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2.5rem;
  flex-wrap: wrap;
}

.footer-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
}

.footer-logo:hover {
  text-decoration: none;
}

.footer-mark {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 0.6rem;
}

.footer-tagline {
  margin: 0.9rem 0 0;
  font-size: 0.92rem;
  max-width: 22rem;
}

.footer-links {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding-top: 0.4rem;
}

.footer-links a {
  color: var(--silver-dim);
  font-size: 0.9rem;
  font-weight: 500;
}

.footer-links a:hover {
  color: #fff;
  text-decoration: none;
}

.footer-socials {
  display: flex;
  gap: 1.1rem;
  padding-top: 0.4rem;
}

.footer-socials a {
  color: var(--silver-dim);
  transition: color 0.2s ease, transform 0.2s ease;
  display: inline-flex;
}

.footer-socials a:hover {
  color: var(--blue);
  transform: translateY(-2px);
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 2.8rem;
  padding-top: 1.6rem;
  border-top: 1px solid var(--line);
}

.footer-bottom p {
  margin: 0;
  font-size: 0.82rem;
}

.footer-built {
  font-family: var(--font-display);
  letter-spacing: 0.06em;
}
</style>
