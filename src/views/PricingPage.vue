<script setup lang="ts">
import ChapterHeading from '../components/ChapterHeading.vue';
</script>

<template>
  <div class="page">
    <section v-reveal class="pricing-soon" aria-label="Pricing">
      <div class="wrap">
        <ChapterHeading
          index="$"
          kicker="Pricing"
          title="This page is <em>under construction.</em>"
        />
        <p class="lede">
          Real numbers are coming. Every project gets a straight quote
          around <em>its</em> story &mdash; no template tiers, no fine-print
          upsells.
        </p>
        <p class="pricing-soon-cta">
          <RouterLink class="link-more" to="/contact"
            >Tell me about your project
            <span aria-hidden="true">&rarr;</span></RouterLink
          >
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pricing-soon {
  padding: clamp(6rem, 12vw, 10rem) 0;
}
.pricing-soon-cta {
  margin-top: 2.5rem;
}
</style>
