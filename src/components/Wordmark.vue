<script setup lang="ts">
/**
 * "GRAY / SOLUTIONS" wordmark. GRAY is dominant; SOLUTIONS sits beneath,
 * small and letter-spaced, per the brand decision.
 */
defineProps<{
  /** 'md' for nav/footer, 'lg' for hero */
  size?: 'md' | 'lg';
}>();
</script>

<template>
  <span class="wordmark" :class="`wordmark-${size ?? 'md'}`">
    <span class="wordmark-gray">GRAY</span>
    <span class="wordmark-solutions">SOLUTIONS</span>
  </span>
</template>

<style scoped>
.wordmark {
  display: inline-flex;
  flex-direction: column;
  line-height: 1;
  font-family: var(--font-display);
  user-select: none;
}

.wordmark-gray {
  font-weight: 700;
  letter-spacing: 0.08em;
  background: linear-gradient(180deg, #f4f6f9 20%, #a9b0bc 80%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.wordmark-solutions {
  font-weight: 600;
  color: var(--blue);
  letter-spacing: 0.52em;
  margin-top: 0.35em;
  padding-left: 0.06em;
}

.wordmark-md .wordmark-gray {
  font-size: 1.12rem;
}

.wordmark-md .wordmark-solutions {
  font-size: 0.52rem;
}

.wordmark-lg .wordmark-gray {
  font-size: clamp(2.6rem, 7vw, 4.2rem);
}

.wordmark-lg .wordmark-solutions {
  font-size: clamp(0.8rem, 2vw, 1.05rem);
}
</style>