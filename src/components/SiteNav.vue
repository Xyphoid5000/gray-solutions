<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
const emit = defineEmits<{
  contact: [];
}>();
</script>

<template>
  <header class="site-nav site-nav-min">
    <div class="nav-inner">
      <a
        class="brand"
        href="#/"
        @click.prevent="router.push('/')"
        aria-label="Gray Solutions — back to the cover"
      >
        <span class="brand-mark" aria-hidden="true">G.</span>
        <span>Gray Solutions<em>.</em></span>
      </a>
      <button class="nav-contact" @click="emit('contact')">
        Contact me
      </button>
    </div>
  </header>
</template>
