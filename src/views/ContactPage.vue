<script setup lang="ts">
import ContactForm from '../components/ContactForm.vue';
import { manuscriptBound } from '../lib/manuscript';
</script>

<template>
  <div class="page">
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
          <ContactForm :is-bound="manuscriptBound" />
        </div>
      </div>
    </section>
  </div>
</template>
