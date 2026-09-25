<script setup lang="ts">
import ContactForm from './ContactForm.vue';
import AboutMe from './AboutMe.vue';
import Bookshelf from './Bookshelf.vue';

const emit = defineEmits(['open-book']);
</script>

<template>
  <div class="cover-page">
    <!-- The home page opens on the bookshelf. The manuscript waits in
         front of the books; opening it tilts the camera down to the desk. -->
    <Bookshelf
      :interactive="true"
      :show-manuscript="true"
      @open-book="emit('open-book')"
    />
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
          <ContactForm />
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
