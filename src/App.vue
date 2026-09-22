<script setup lang="ts">
import { ref } from 'vue';
import IntroSequence from './components/IntroSequence.vue';
import Nav from './components/Nav.vue';
import Hero from './components/Hero.vue';
import About from './components/About.vue';
import Services from './components/Services.vue';
import Work from './components/Work.vue';
import Process from './components/Process.vue';
import Contact from './components/Contact.vue';
import Footer from './components/Footer.vue';

const showIntro = ref(true);
const introKey = ref(0);

function onIntroDone() {
  showIntro.value = false;
}

function replayIntro() {
  introKey.value += 1;
  showIntro.value = true;
  window.scrollTo({ top: 0, behavior: 'auto' });
}
</script>

<template>
  <IntroSequence v-if="showIntro" :key="introKey" @done="onIntroDone" />
  <Nav />
  <main>
    <Hero @replay="replayIntro" />
    <About />
    <Services />
    <Work />
    <Process />
    <Contact />
  </main>
  <Footer />
</template>
