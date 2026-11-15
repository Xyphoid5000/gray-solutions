<script setup lang="ts">
import { onMounted, ref } from 'vue';
import ChapterHeading from '../components/ChapterHeading.vue';
import {
  FALLBACK_TIERS,
  fetchPricingTiers,
  formatPrice,
  type PricingTier,
} from '../lib/pricing';

const tiers = ref<PricingTier[]>(FALLBACK_TIERS);

onMounted(async () => {
  tiers.value = await fetchPricingTiers();
});
</script>

<template>
  <div class="page">
    <section class="pricing" aria-label="Pricing">
      <div class="wrap">
        <ChapterHeading
          index="$"
          kicker="Pricing"
          title="Straight numbers, <em>no fine print.</em>"
        />
        <p v-reveal class="lede">
          Every project starts from one of three tiers &mdash; a straight
          quote around <em>its</em> story. One-time prices, no monthly
          fees, no template upsells.
        </p>
        <ul v-reveal class="tier-list">
          <li v-for="tier in tiers" :key="tier.id" class="tier-row">
            <div class="tier-head">
              <h3>{{ tier.name }}</h3>
              <p class="tier-price">from {{ formatPrice(tier.priceCents) }}</p>
            </div>
            <p class="tier-desc">{{ tier.description }}</p>
          </li>
        </ul>
        <p v-reveal class="lede pricing-note">
          Already have a Gray Solutions site? New features price from
          the same tiers at a returning-client rate.
        </p>
        <p v-reveal class="pricing-cta">
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
.pricing {
  padding: clamp(6rem, 12vw, 10rem) 0;
}
.tier-list {
  list-style: none;
  margin: 3rem 0 0;
  padding: 0;
}
.tier-row {
  padding: 1.75rem 0;
  border-top: 1px solid var(--line);
}
.tier-row:last-child {
  border-bottom: 1px solid var(--line);
}
.tier-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}
.tier-head h3 {
  margin: 0;
  font-size: 1.4rem;
}
.tier-price {
  margin: 0;
  font-weight: 600;
  white-space: nowrap;
}
.tier-desc {
  margin: 0.5rem 0 0;
  color: var(--muted);
}
.pricing-note {
  margin-top: 2.5rem;
}
.pricing-cta {
  margin-top: 2.5rem;
}
</style>
