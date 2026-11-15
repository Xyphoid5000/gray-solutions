<script setup lang="ts">
import { imageUrl, requestTypeLabel, statusLabel, type DashboardRequest } from '../lib/dashboard';

defineProps<{ requests: DashboardRequest[]; admin?: boolean; updatingId?: number }>();

const emit = defineEmits<{
  setStatus: [id: number, status: string];
}>();
</script>

<template>
  <div v-if="requests.length === 0" class="dash-empty">No requests yet.</div>
  <ul v-else class="request-list">
    <li v-for="r in requests" :key="r.id" class="request-item">
      <div class="request-head">
        <span class="dash-badge">{{ requestTypeLabel(r.type) }}</span>
        <span v-if="admin" class="request-client">{{ r.clientName }}</span>
        <span v-if="!admin" class="request-status">{{ statusLabel(r.status) }}</span>
        <select
          v-if="admin"
          class="request-status-select"
          :value="r.status"
          :disabled="updatingId === r.id"
          :aria-label="`Status for request ${r.id}`"
          @change="emit('setStatus', r.id, ($event.target as HTMLSelectElement).value)"
        >
          <option value="new">New</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
          <option value="declined">Declined</option>
        </select>
      </div>
      <p class="request-details">{{ r.details }}</p>
      <p class="request-meta">
        <span v-if="r.tierName">Tier: {{ r.tierName }}</span>
        <a
          v-if="r.hasImage && r.imageKey"
          :href="imageUrl(r.imageKey)"
          target="_blank"
          rel="noopener"
          >View attached image</a
        >
      </p>
    </li>
  </ul>
</template>

<style scoped>
.dash-empty {
  color: var(--muted);
}
.request-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}
.request-item {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
}
.request-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
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
.request-client {
  font-weight: 600;
}
.request-status {
  font-weight: 600;
  color: var(--ember);
}
.request-status-select {
  margin-left: auto;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.45rem 0.6rem;
  color: var(--ink);
  font: inherit;
  font-size: 0.9rem;
}
.request-details {
  margin: 0.75rem 0 0;
  white-space: pre-wrap;
}
.request-meta {
  margin: 0.6rem 0 0;
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 0.9rem;
}
</style>
