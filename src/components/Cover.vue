<script setup lang="ts">
// Below-the-fold home content. The contact and about sections are their
// own pages now (/contact, /about) — what remains here is the bound-only
// re-read card, which opens the book from home.
defineProps<{ isBound?: boolean }>();
defineEmits(['open-book-instant']);
</script>

<template>
  <div class="cover-page">
    <!-- Re-read card: lives on home so it survives everything. Bound-only —
         the book has to exist before anyone can open it again. -->
    <div v-if="isBound" class="reread-card">
      <p class="reread-text">Miss something or want to read again?</p>
      <button type="button" class="reread-link" @click="$emit('open-book-instant')">
        Open the book <span aria-hidden="true">&rarr;</span>
      </button>
    </div>
  </div>
</template>
