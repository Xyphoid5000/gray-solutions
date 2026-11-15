<script setup lang="ts">
import { ref } from 'vue';
import RequestList from './RequestList.vue';
import { dashboardFetch, type DashboardMe } from '../lib/dashboard';
import { formatPrice } from '../lib/pricing';

const props = defineProps<{ data: DashboardMe; preview?: boolean }>();
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
const shareUrl = ref('');
const shareBusy = ref(false);
const shareError = ref('');
const copied = ref(false);
const shareLinkInput = ref<HTMLInputElement | null>(null);
let copiedTimer = 0;

function onFile(kind: 'change' | 'feature', event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  if (kind === 'change') changeFile.value = file;
  else featureFile.value = file;
}

async function submitRequest(kind: 'change' | 'feature') {
  if (props.preview) return;
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

async function getShareLink() {
  if (props.preview || shareBusy.value) return;
  shareError.value = '';
  shareBusy.value = true;
  try {
    const result = await dashboardFetch('/api/referral-token', { method: 'POST' });
    if (!result.res.ok || result.data.ok !== true) {
      shareError.value =
        typeof result.data.error === 'string' ? result.data.error : 'Could not create your link.';
      return;
    }
    shareUrl.value = String(result.data.url ?? '');
  } catch {
    shareError.value = 'Could not reach the server. Try again.';
  } finally {
    shareBusy.value = false;
  }
}

async function copyShareLink() {
  if (!shareUrl.value) return;
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    copied.value = true;
    window.clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Clipboard blocked: select the link so it can be copied manually.
    shareLinkInput.value?.focus();
    shareLinkInput.value?.select();
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
      <p v-for="p in props.data.pricings" :key="p.projectType" class="client-pricing">
        <span>{{ p.projectType === 'feature' ? 'Feature' : 'Install' }}</span>
        <span v-if="p.tierName"> &middot; {{ p.tierName }}</span>
        <span v-if="p.discountPct"> &middot; {{ p.discountPct }}% off</span>
        <span v-if="p.billed && p.quotedPriceCents !== null">
          &middot; Charged {{ formatPrice(p.quotedPriceCents) }}</span
        >
        <span v-else-if="p.quotedPriceCents !== null">
          &middot; {{ formatPrice(p.quotedPriceCents) }}</span
        >
        <span v-else-if="p.billed"> &middot; Billed</span>
      </p>
      <p v-if="props.data.pricings.length === 0" class="client-pricing">No quote yet &mdash; Chris will follow up with one.</p>
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
        <button class="btn btn-solid" type="submit" :disabled="sending === 'change' || props.preview">
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
        <button class="btn btn-solid" type="submit" :disabled="sending === 'feature' || props.preview">
          {{ sending === 'feature' ? 'Sending…' : 'Send feature request' }}
        </button>
      </form>
    </section>
    <p v-else class="lede">
      Your site isn&rsquo;t live yet &mdash; the request forms unlock once it is.
    </p>
    <section aria-label="Share Gray Solutions">
      <h2>Share Gray Solutions</h2>
      <p v-if="props.data.client.isClient" class="form-help">
        Know a business that needs a site? Send them your link &mdash; they get 10% off, and you
        get 10% off future enhancements when they reach out.
      </p>
      <p v-else class="form-help">
        Know a business that needs a site? Send them your link &mdash; they get 10% off, and you
        get 20% off your site when they reach out.
      </p>
      <p v-if="shareError" class="dash-error" role="alert">{{ shareError }}</p>
      <div v-if="shareUrl" class="share-row">
        <input
          ref="shareLinkInput"
          class="share-input"
          type="text"
          readonly
          :value="shareUrl"
          aria-label="Your share link"
        />
        <button class="btn btn-solid" type="button" @click="copyShareLink">
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
      <button v-else class="btn btn-solid" type="button" :disabled="shareBusy || props.preview" @click="getShareLink">
        {{ shareBusy ? 'Creating…' : 'Get my share link' }}
      </button>
    </section>
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
.dashboard-form .btn-solid {
  margin-top: 1rem;
}
.dash-notice {
  color: var(--ember);
  font-weight: 600;
}
.dash-error {
  color: var(--ember);
  font-weight: 600;
}
.share-row {
  display: flex;
  gap: 0.6rem;
  max-width: 38rem;
}
.share-input {
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.95rem 1.1rem;
  color: var(--ink);
  font: inherit;
  font-size: 0.92rem;
}
.share-input:focus {
  outline: none;
  border-color: var(--ember);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 0 3px rgba(208, 138, 78, 0.15);
}
</style>
