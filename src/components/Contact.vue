<script setup lang="ts">
import { siteConfig } from '../config';
</script>

<template>
  <section id="contact" class="section contact">
    <div class="contact-glow" aria-hidden="true"></div>
    <div class="container contact-inner">
      <p v-reveal class="eyebrow eyebrow-center">Contact</p>
      <h2 v-reveal>Have an idea? Let&rsquo;s turn it into something real.</h2>
      <p v-reveal class="contact-copy">
        Tell me about your business and what you&rsquo;re imagining. I read
        every message personally and reply within a couple of days.
      </p>
      <div v-reveal class="contact-actions">
        <a :href="`mailto:${siteConfig.email}`" class="btn btn-primary btn-lg">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 6L2 7" />
          </svg>
          {{ siteConfig.email }}
        </a>
      </div>
      <div v-reveal class="contact-socials">
        <a :href="siteConfig.linkedIn" target="_blank" rel="noopener" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45Z" />
          </svg>
          LinkedIn
        </a>
        <a :href="siteConfig.github" target="_blank" rel="noopener" aria-label="GitHub">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.35.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12v3.15c0 .3.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
          </svg>
          GitHub
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.contact {
  position: relative;
  text-align: center;
  overflow: hidden;
}

.contact-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse 55% 55% at 50% 55%, rgba(47, 155, 255, 0.1), transparent 70%);
}

.contact-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.eyebrow-center {
  justify-content: center;
}

.eyebrow-center::after {
  content: '';
  width: 2.2rem;
  height: 1px;
  background: var(--blue);
  display: inline-block;
}

.contact h2 {
  max-width: 34rem;
}

.contact-copy {
  max-width: 34rem;
  font-size: 1.05rem;
}

.contact-actions {
  margin-top: 1.6rem;
}

.btn-lg {
  font-size: 1.05rem;
  padding: 1rem 2.2rem;
}

.contact-socials {
  display: flex;
  gap: 1.8rem;
  margin-top: 2.2rem;
}

.contact-socials a {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: var(--silver-dim);
  font-family: var(--font-display);
  font-size: 0.92rem;
  font-weight: 600;
  transition: color 0.2s ease;
}

.contact-socials a:hover {
  color: var(--blue);
  text-decoration: none;
}
</style>
