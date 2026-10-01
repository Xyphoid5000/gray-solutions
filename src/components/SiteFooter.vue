<script setup lang="ts">
import { scrollToTop } from '../lib/scroll';
</script>

<template>
  <footer class="site-footer">
    <div class="wrap footer-inner">
      <span>&copy; MMXXVI Gray Solutions &middot; Chris Gray</span>
      <span>Built with Vue, TypeScript &amp; GSAP &mdash; no templates were harmed.</span>
      <button class="to-top" @click="scrollToTop()">
        Back to the top <span aria-hidden="true">&uarr;</span>
      </button>
    </div>
  </footer>
</template>
