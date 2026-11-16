<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ChapterHeading from '../components/ChapterHeading.vue';
import AdminDashboard from '../components/AdminDashboard.vue';
import ClientDashboard from '../components/ClientDashboard.vue';
import {
  ADMIN_EMAIL,
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
const password = ref('');
const sending = ref(false);
const me = ref<DashboardMe | null>(null);
// The admin email gets password sign-in; everyone else gets a magic link.
const isAdminEmail = computed(() => email.value.trim().toLowerCase() === ADMIN_EMAIL);
// Admin preview: the id of the client whose dashboard is being viewed
// as the client sees it. The id (not the object) is stored so the
// preview always renders the freshest data after a refresh.
const previewClientId = ref<number | null>(null);

const previewMe = computed<DashboardMe | null>(() => {
  if (previewClientId.value === null || !me.value) return null;
  const client = (me.value.clients ?? []).find((c) => c.id === previewClientId.value);
  if (!client) return null;
  return {
    role: 'client',
    email: client.email,
    client,
    pricings: client.pricings,
    requests: me.value.requests.filter((r) => r.clientId === client.id),
    tiers: me.value.tiers,
    uploadsEnabled: me.value.uploadsEnabled,
  };
});

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

async function signInWithPassword() {
  sending.value = true;
  error.value = '';
  try {
    const res = await fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), password: password.value }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      token?: unknown;
      error?: string;
    };
    if (!res.ok || data.ok !== true || typeof data.token !== 'string') {
      error.value = data.error || 'Could not sign in.';
      return;
    }
    password.value = '';
    setDashboardToken(data.token);
    if (await loadMe()) {
      state.value = 'ready';
    } else {
      state.value = 'login';
    }
  } catch {
    error.value = 'Could not reach the sign-in service. Try again.';
  } finally {
    sending.value = false;
  }
}

async function onSubmit() {
  if (isAdminEmail.value) {
    await signInWithPassword();
  } else {
    await requestLink();
  }
}

async function refresh() {
  await loadMe();
}

function signOut() {
  clearDashboardToken();
  me.value = null;
  previewClientId.value = null;
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
          <p v-if="isAdminEmail" class="lede">Enter your password to sign in.</p>
          <p v-else class="lede">
            Enter your email and I&rsquo;ll send you a sign-in link
            &mdash; no password needed.
          </p>
          <form class="dashboard-form" @submit.prevent="onSubmit">
            <label class="field">
              <span>Email</span>
              <input v-model="email" name="email" type="email" required placeholder="you@example.com" />
            </label>
            <label v-if="isAdminEmail" class="field">
              <span>Password</span>
              <input
                v-model="password"
                name="password"
                type="password"
                required
                autocomplete="current-password"
                placeholder="Your admin password"
              />
            </label>
            <p v-if="error" class="dash-error" role="alert">{{ error }}</p>
            <button class="btn btn-solid" type="submit" :disabled="sending">
              <template v-if="isAdminEmail">{{ sending ? 'Signing in…' : 'Sign in' }}</template>
              <template v-else>{{ sending ? 'Sending…' : 'Send my sign-in link' }}</template>
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
          <div v-if="previewMe">
            <div class="preview-bar" role="status">
              <p>
                Viewing {{ previewMe.client?.businessName }}&rsquo;s dashboard as the client sees
                it &mdash; actions are disabled in preview.
              </p>
              <button class="btn btn-ghost" type="button" @click="previewClientId = null">
                Back to admin
              </button>
            </div>
            <ClientDashboard :data="previewMe" :preview="true" @refresh="refresh" />
          </div>
          <AdminDashboard
            v-else-if="me.role === 'admin'"
            :data="me"
            @refresh="refresh"
            @preview="previewClientId = $event.id"
          />
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
.dashboard-form .btn-solid {
  margin-top: 1rem;
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
.preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  border: 1px solid var(--ember);
  border-radius: 12px;
  padding: 0.9rem 1.1rem;
  margin-bottom: 2rem;
}
.preview-bar p {
  margin: 0;
}
.dash-error {
  color: var(--ember);
  font-weight: 600;
}
</style>
