<script setup lang="ts">
import { scrollToTop } from '../lib/scroll';
import { useSettingsStore } from '../stores/settings';
import { storeToRefs } from 'pinia';

const { siteName } = storeToRefs(useSettingsStore());
</script>

<template>
  <footer class="site-footer">
    <div class="wrap footer-inner">
      <span>&copy; MMXXVI {{ siteName }} &middot; Chris Gray</span>
      <span>Built with Vue, TypeScript &amp; GSAP &mdash; no templates were harmed.</span>
      <button class="to-top" @click="scrollToTop()">
        Back to the top <span aria-hidden="true">&uarr;</span>
      </button>
    </div>
  </footer>
</template>
