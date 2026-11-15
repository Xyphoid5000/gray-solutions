<script setup lang="ts">
import { computed, ref } from 'vue';
import RequestList from './RequestList.vue';
import { dashboardFetch, type DashboardClient, type DashboardMe } from '../lib/dashboard';
import { formatPrice } from '../lib/pricing';

const props = defineProps<{ data: DashboardMe }>();
const emit = defineEmits<{ refresh: []; preview: [client: DashboardClient] }>();

const clientFilter = ref<'all' | 'current' | 'prospective'>('all');
const requestFilter = ref('all');
const updatingRequest = ref(0);
const updatingBilled = ref(0);

const clients = computed(() =>
  (props.data.clients ?? []).filter(
    (c) => clientFilter.value === 'all' || (clientFilter.value === 'current') === c.isClient,
  ),
);
const requests = computed(() =>
  props.data.requests.filter((r) => requestFilter.value === 'all' || r.status === requestFilter.value),
);

async function setStatus(id: number, status: string) {
  updatingRequest.value = id;
  await dashboardFetch(`/api/requests/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  updatingRequest.value = 0;
  emit('refresh');
}

async function setBilled(clientId: number, billed: boolean) {
  updatingBilled.value = clientId;
  await dashboardFetch(`/api/clients/${clientId}/billed`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ billed }),
  });
  updatingBilled.value = 0;
  emit('refresh');
}
</script>

<template>
  <section aria-label="Clients">
    <h2>Clients</h2>
    <div class="dash-chips" role="group" aria-label="Filter clients">
      <button type="button" :class="{ active: clientFilter === 'all' }" @click="clientFilter = 'all'">
        All
      </button>
      <button
        type="button"
        :class="{ active: clientFilter === 'current' }"
        @click="clientFilter = 'current'"
      >
        Current
      </button>
      <button
        type="button"
        :class="{ active: clientFilter === 'prospective' }"
        @click="clientFilter = 'prospective'"
      >
        Prospective
      </button>
    </div>
    <ul class="client-list">
      <li v-for="c in clients" :key="c.id" class="client-card">
        <div class="client-head">
          <h3>{{ c.businessName }}</h3>
          <span class="dash-badge">{{ c.isClient ? 'Current' : 'Prospective' }}</span>
        </div>
        <p class="client-meta">{{ c.contactName }} &mdash; {{ c.email }}</p>
        <p v-if="c.pricing" class="client-pricing">
          <span v-if="c.pricing.tierName">{{ c.pricing.tierName }}</span>
          <span v-if="c.pricing.discountPct"> &middot; {{ c.pricing.discountPct }}% off</span>
          <span v-if="c.pricing.quotedPriceCents !== null">
            &middot; {{ formatPrice(c.pricing.quotedPriceCents) }}</span
          >
          <span> &middot; {{ c.pricing.projectType === 'feature' ? 'Feature' : 'Install' }}</span>
        </p>
        <p v-else class="client-pricing">No quote yet.</p>
        <div class="client-actions">
          <button
            class="btn btn-ghost"
            type="button"
            title="Toggle billed state"
            :disabled="updatingBilled === c.id"
            @click="setBilled(c.id, !(c.pricing?.billed ?? false))"
          >
            {{ c.pricing?.billed ? 'Billed ✓' : 'Mark billed' }}
          </button>
          <button class="btn btn-ghost" type="button" @click="emit('preview', c)">
            View dashboard
          </button>
        </div>
      </li>
    </ul>
    <p v-if="clients.length === 0" class="dash-empty">No clients match this filter.</p>
  </section>
  <section aria-label="Requests">
    <h2>Requests</h2>
    <label class="field dash-filter">
      <span>Show</span>
      <select v-model="requestFilter" aria-label="Filter requests by status">
        <option value="all">All statuses</option>
        <option value="new">New</option>
        <option value="in_progress">In progress</option>
        <option value="done">Done</option>
        <option value="declined">Declined</option>
      </select>
    </label>
    <RequestList
      :requests="requests"
      :admin="true"
      :updating-id="updatingRequest"
      @set-status="setStatus"
    />
  </section>
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
.dash-chips {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.dash-chips button {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.45rem 1rem;
  cursor: pointer;
}
.dash-chips button.active {
  color: var(--ink);
  border-color: var(--ember);
}
.client-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}
.client-card {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
}
.client-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.client-head h3 {
  margin: 0;
  font-size: 1.15rem;
}
.dash-badge {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  color: var(--muted);
}
.client-meta {
  margin: 0.4rem 0 0;
  color: var(--muted);
  font-size: 0.9rem;
}
.client-pricing {
  margin: 0.6rem 0 0.9rem;
}
.client-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.dash-empty {
  color: var(--muted);
}
.dash-filter {
  max-width: 16rem;
}
.dash-filter select {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
  color: var(--ink);
  font: inherit;
  font-size: 0.95rem;
  width: 100%;
}
</style>
