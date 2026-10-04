<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import ContactForm from './ContactForm.vue';
import AboutMe from './AboutMe.vue';
import { contactSubmitted } from '../lib/contact';

defineProps<{ isBound?: boolean }>();

/** After a successful send the visitor gets 3 seconds with the
    confirmation, then the whole contact section retires for the visit.
    Session-scoped — a refresh brings it back. */
const contactGone = ref(false);
let hideTimer: number | null = null;
watch(contactSubmitted, (submitted) => {
  if (!submitted || contactGone.value) return;
  hideTimer = window.setTimeout(() => {
    contactGone.value = true;
  }, 3000);
});
onUnmounted(() => {
  if (hideTimer) window.clearTimeout(hideTimer);
});
</script>

<template>
  <div class="cover-page">
    <section v-if="!contactGone" id="contact" class="cover-contact" aria-label="Contact">
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
          <ContactForm :is-bound="isBound" />
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
