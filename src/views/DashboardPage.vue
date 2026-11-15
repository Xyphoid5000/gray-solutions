<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ChapterHeading from '../components/ChapterHeading.vue';
import AdminDashboard from '../components/AdminDashboard.vue';
import ClientDashboard from '../components/ClientDashboard.vue';
import {
  clearDashboardToken,
  dashboardFetch,
  getDashboardToken,
  setDashboardToken,
  type DashboardMe,
} from '../lib/dashboard';

const route = useRoute();
const router = useRouter();
const state = ref<'loading' | 'login' | 'sent' | 'ready'>('loading');
const error = ref('');
const email = ref('');
const sending = ref(false);
const me = ref<DashboardMe | null>(null);

async function loadMe(): Promise<boolean> {
  const { res, data } = await dashboardFetch('/api/dashboard/me');
  if (!res.ok || data.ok !== true) {
    if (res.status === 401) clearDashboardToken();
    return false;
  }
  me.value = data as unknown as DashboardMe;
  return true;
}

async function verify(token: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`);
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      token?: unknown;
      error?: string;
    };
    if (!res.ok || data.ok !== true || typeof data.token !== 'string') {
      error.value = data.error || 'This sign-in link did not work.';
      return false;
    }
    setDashboardToken(data.token);
    return true;
  } catch {
    error.value = 'Could not reach the sign-in service. Try again.';
    return false;
  }
}

onMounted(async () => {
  const token =
    (route.query.token as string | undefined) ||
    new URLSearchParams(window.location.search).get('token') ||
    '';
  if (token) {
    // Clear the token from the URL before anything else renders.
    router.replace({ path: '/dashboard' });
    if ((await verify(token)) && (await loadMe())) {
      state.value = 'ready';
      return;
    }
    state.value = 'login';
    return;
  }
  if (getDashboardToken() && (await loadMe())) {
    state.value = 'ready';
    return;
  }
  state.value = 'login';
});

async function requestLink() {
  sending.value = true;
  error.value = '';
  try {
    const res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim() }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || data.ok !== true) {
      error.value = data.error || 'Could not send the sign-in email.';
      return;
    }
    state.value = 'sent';
  } catch {
    error.value = 'Could not reach the sign-in service. Try again.';
  } finally {
    sending.value = false;
  }
}

async function refresh() {
  await loadMe();
}

function signOut() {
  clearDashboardToken();
  me.value = null;
  state.value = 'login';
}
</script>

<template>
  <div class="page">
    <section class="dashboard" aria-label="Client dashboard">
      <div class="wrap">
        <ChapterHeading
          index="D"
          kicker="Client dashboard"
          title="Your projects, <em>in one place.</em>"
        />
        <div v-if="state === 'loading'">
          <p class="lede">Checking your sign-in&hellip;</p>
        </div>
        <div v-else-if="state === 'login'">
          <p class="lede">
            Enter your email and I&rsquo;ll send you a sign-in link
            &mdash; no password needed.
          </p>
          <form class="dashboard-form" @submit.prevent="requestLink">
            <label class="field">
              <span>Email</span>
              <input v-model="email" name="email" type="email" required placeholder="you@example.com" />
            </label>
            <p v-if="error" class="dash-error" role="alert">{{ error }}</p>
            <button class="btn btn-solid" type="submit" :disabled="sending">
              {{ sending ? 'Sending…' : 'Send my sign-in link' }}
            </button>
          </form>
        </div>
        <div v-else-if="state === 'sent'">
          <p class="lede">
            Check your inbox &mdash; your sign-in link is on its way.
            It expires in 15 minutes and works once.
          </p>
          <button class="btn btn-ghost" type="button" @click="state = 'login'">
            Send another link
          </button>
        </div>
        <div v-else-if="state === 'ready' && me">
          <div class="dash-top">
            <p class="dash-signed-in">Signed in as {{ me.email }}</p>
            <button class="btn btn-ghost" type="button" @click="signOut">Sign out</button>
          </div>
          <AdminDashboard v-if="me.role === 'admin'" :data="me" @refresh="refresh" />
          <ClientDashboard v-else :data="me" @refresh="refresh" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  padding: clamp(6rem, 12vw, 10rem) 0;
}
.dashboard-form {
  max-width: 32rem;
}
.dash-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}
.dash-signed-in {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}
.dash-error {
  color: var(--ember);
  font-weight: 600;
}
</style>
