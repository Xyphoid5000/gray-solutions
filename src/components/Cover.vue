<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import ContactForm from './ContactForm.vue';
import AboutMe from './AboutMe.vue';
import { contactSubmitted } from '../lib/contact';

defineProps<{ isBound?: boolean }>();
defineEmits(['open-book-instant']);

/** After a successful send the visitor gets 3 seconds with the green
    confirmation, then the whole contact section animates out (fade, rise
    and collapse) and retires for the visit. Session-scoped — a refresh
    brings it back. */
const contactGone = ref(false);
// The contact section stays after submit — the success modal confirms,
// the section is never removed.
watch(contactSubmitted, () => {
  // Intentionally empty: the section stays.
});
onUnmounted(() => {});
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
    <!-- Re-read card: lives under the contact section so it survives the
         section's retirement after a send. Bound-only — the book has to
         exist before anyone can open it again. -->
    <div v-if="isBound" class="reread-card">
      <p class="reread-text">Miss something or want to read again?</p>
      <button type="button" class="reread-link" @click="$emit('open-book-instant')">
        Open the book <span aria-hidden="true">&rarr;</span>
      </button>
    </div>
    <section v-reveal id="about" class="about-section" aria-label="About me">
      <div class="wrap">
        <AboutMe />
      </div>
    </section>
  </div>
</template>
