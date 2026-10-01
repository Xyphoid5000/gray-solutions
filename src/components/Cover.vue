<script setup lang="ts">
import ContactForm from './ContactForm.vue';
import AboutMe from './AboutMe.vue';

defineProps<{ bonusContent?: boolean }>();
</script>

<template>
  <div class="cover-page">
    <section id="contact" class="cover-contact" aria-label="Contact">
      <div class="wrap">
        <p v-reveal class="contact-kicker">Contact</p>
        <h2 v-reveal class="contact-title">
          Let&rsquo;s write <em>your story.</em>
        </h2>
        <p v-reveal class="contact-sub">
          Tell me about your business, your goals, and where your website
          stands today. Everything below is wrapped into one email —
          straight to my inbox.
        </p>
        <div v-reveal>
          <ContactForm :bonus-content="bonusContent" />
        </div>
      </div>
    </section>
    <section v-reveal id="about" class="about-section" aria-label="About me">
      <div class="wrap">
        <AboutMe />
      </div>
    </section>
  </div>
</template>
