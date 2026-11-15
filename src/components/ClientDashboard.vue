<script setup lang="ts">
import { ref } from 'vue';
import RequestList from './RequestList.vue';
import { dashboardFetch, type DashboardMe } from '../lib/dashboard';
import { formatPrice } from '../lib/pricing';

const props = defineProps<{ data: DashboardMe }>();
const emit = defineEmits<{ refresh: [] }>();

const changeDetails = ref('');
const featureDetails = ref('');
const featureTierId = ref('');
const changeFile = ref<File | null>(null);
const featureFile = ref<File | null>(null);
const changeFileInput = ref<HTMLInputElement | null>(null);
const featureFileInput = ref<HTMLInputElement | null>(null);
const sending = ref('');
const notice = ref('');
const formError = ref('');

function onFile(kind: 'change' | 'feature', event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  if (kind === 'change') changeFile.value = file;
  else featureFile.value = file;
}

async function submitRequest(kind: 'change' | 'feature') {
  const details = (kind === 'change' ? changeDetails.value : featureDetails.value).trim();
  const file = kind === 'change' ? changeFile.value : featureFile.value;
  if (!details) {
    formError.value = 'Describe the request first.';
    return;
  }
  if (kind === 'feature' && !featureTierId.value) {
    formError.value = 'Pick a pricing tier for the feature.';
    return;
  }
  sending.value = kind;
  formError.value = '';
  notice.value = '';
  try {
    let result: { res: Response; data: Record<string, unknown> };
    if (file) {
      const form = new FormData();
      form.set('type', kind);
      form.set('details', details);
      if (kind === 'feature') form.set('tierId', featureTierId.value);
      form.set('image', file);
      result = await dashboardFetch('/api/requests', { method: 'POST', body: form });
    } else {
      const payload: Record<string, unknown> = { type: kind, details };
      if (kind === 'feature') payload.tierId = Number(featureTierId.value);
      result = await dashboardFetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (!result.res.ok || result.data.ok !== true) {
      formError.value =
        typeof result.data.error === 'string' ? result.data.error : 'Could not send the request.';
      return;
    }
    notice.value = kind === 'change' ? 'Change request sent.' : 'Feature request sent.';
    if (kind === 'change') {
      changeDetails.value = '';
      changeFile.value = null;
      if (changeFileInput.value) changeFileInput.value.value = '';
    } else {
      featureDetails.value = '';
      featureTierId.value = '';
      featureFile.value = null;
      if (featureFileInput.value) featureFileInput.value.value = '';
    }
    emit('refresh');
  } catch {
    formError.value = 'Could not reach the server. Try again.';
  } finally {
    sending.value = '';
  }
}
</script>

<template>
  <div v-if="!props.data.client">
    <p class="lede">
      No client record for this email yet. Start with the contact form
      and your dashboard will light up from there.
    </p>
    <p>
      <RouterLink class="link-more" to="/contact"
        >Contact Gray Solutions <span aria-hidden="true">&rarr;</span></RouterLink
      >
    </p>
  </div>
  <div v-else>
    <section aria-label="My info">
      <h2>{{ props.data.client.businessName }}</h2>
      <p class="client-meta">{{ props.data.client.contactName }} &mdash; {{ props.data.client.email }}</p>
      <p v-if="props.data.pricing" class="client-pricing">
        <span v-if="props.data.pricing.tierName">{{ props.data.pricing.tierName }}</span>
        <span v-if="props.data.pricing.discountPct">
          &middot; {{ props.data.pricing.discountPct }}% off</span
        >
        <span v-if="props.data.pricing.quotedPriceCents !== null">
          &middot; {{ formatPrice(props.data.pricing.quotedPriceCents) }}</span
        >
        <span v-if="props.data.pricing.billed"> &middot; Billed</span>
      </p>
      <p v-else class="client-pricing">No quote yet &mdash; Chris will follow up with one.</p>
    </section>
    <section aria-label="My requests">
      <h2>My requests</h2>
      <RequestList :requests="props.data.requests" />
    </section>
    <section v-if="props.data.client.isClient" aria-label="New request">
      <h2>New request</h2>
      <p v-if="notice" class="dash-notice" role="status">{{ notice }}</p>
      <p v-if="formError" class="dash-error" role="alert">{{ formError }}</p>
      <form class="dashboard-form" @submit.prevent="submitRequest('change')">
        <h3>Change request <em>&mdash; free</em></h3>
        <p class="form-help">
          A tweak to your existing site &mdash; new wording, a swapped image, a moved section.
        </p>
        <label class="field">
          <span>What should change?</span>
          <textarea
            v-model="changeDetails"
            rows="4"
            required
            placeholder="Describe the change — the page, the words, the picture."
          ></textarea>
        </label>
        <label v-if="props.data.uploadsEnabled" class="field">
          <span>Attach an image <em>(optional)</em></span>
          <input
            ref="changeFileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            @change="onFile('change', $event)"
          />
        </label>
        <button class="btn btn-solid" type="submit" :disabled="sending === 'change'">
          {{ sending === 'change' ? 'Sending…' : 'Send change request' }}
        </button>
      </form>
      <form class="dashboard-form" @submit.prevent="submitRequest('feature')">
        <h3>Feature request</h3>
        <p class="form-help">
          Something new on your site &mdash; priced from the tier it
          belongs to, at the returning-client rate.
        </p>
        <label class="field">
          <span>Pricing tier</span>
          <select v-model="featureTierId" required aria-label="Pricing tier for the feature">
            <option value="">Pick a tier</option>
            <option v-for="tier in props.data.tiers" :key="tier.id" :value="String(tier.id)">
              {{ tier.name }} — from {{ formatPrice(tier.priceCents) }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>What should it do?</span>
          <textarea
            v-model="featureDetails"
            rows="4"
            required
            placeholder="Describe the feature — what it does, who it serves."
          ></textarea>
        </label>
        <label v-if="props.data.uploadsEnabled" class="field">
          <span>Attach an image <em>(optional)</em></span>
          <input
            ref="featureFileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            @change="onFile('feature', $event)"
          />
        </label>
        <button class="btn btn-solid" type="submit" :disabled="sending === 'feature'">
          {{ sending === 'feature' ? 'Sending…' : 'Send feature request' }}
        </button>
      </form>
    </section>
    <p v-else class="lede">
      Your site isn&rsquo;t live yet &mdash; the request forms unlock once it is.
    </p>
  </div>
</template>

<style scoped>
section {
  margin-top: 2.5rem;
}
section:first-of-type {
  margin-top: 0;
}
h2 {
  font-size: 1.5rem;
  margin: 0 0 1rem;
}
h3 {
  font-size: 1.2rem;
  margin: 0 0 0.4rem;
}
h3 em {
  font-weight: 400;
  color: var(--muted);
}
.client-meta {
  margin: 0.4rem 0 0;
  color: var(--muted);
  font-size: 0.9rem;
}
.client-pricing {
  margin: 0.6rem 0 0;
}
.form-help {
  color: var(--muted);
  font-size: 0.92rem;
  margin: 0 0 1rem;
}
.dashboard-form {
  margin-top: 2rem;
  max-width: 38rem;
}
.dash-notice {
  color: var(--ember);
  font-weight: 600;
}
.dash-error {
  color: var(--ember);
  font-weight: 600;
}
</style>
