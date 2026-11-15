import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/**
 * Referral-token state: a visitor who lands with ?ref=<token> came
 * through a demo client's share link. The token is looked up once
 * (the lookup marks it opened server-side); a valid token means 10%
 * off, applied when the contact form is sent. The token is kept in
 * session storage so internal navigation that drops the query param
 * doesn't lose it — a fresh tab starts clean.
 */
const STORAGE_KEY = 'gs-referral-token';

function storageGet(key: string): string {
  try {
    return window.sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function storageSet(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* storage blocked (private mode) — the URL param still works */
  }
}

function storageRemove(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const useReferralStore = defineStore('referral', () => {
  const token = ref('');
  const status = ref<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  /** Business name of the client who shared the link. */
  const referrerName = ref('');
  const discountPct = ref(0);

  const active = computed(() => status.value === 'valid' && token.value !== '');

  async function initFromUrl(): Promise<void> {
    const fromUrl = new URLSearchParams(window.location.search).get('ref') ?? '';
    const candidate = (fromUrl || storageGet(STORAGE_KEY)).trim().slice(0, 128);
    if (!candidate) return;
    token.value = candidate;
    status.value = 'checking';
    try {
      const res = await fetch(`/api/referral?token=${encodeURIComponent(candidate)}`);
      const data = (await res.json().catch(() => ({}))) as {
        valid?: boolean;
        referrer?: unknown;
        discountPct?: unknown;
      };
      if (res.ok && data.valid === true) {
        status.value = 'valid';
        referrerName.value = typeof data.referrer === 'string' ? data.referrer : '';
        discountPct.value = typeof data.discountPct === 'number' ? data.discountPct : 10;
        storageSet(STORAGE_KEY, candidate);
      } else {
        status.value = 'invalid';
        storageRemove(STORAGE_KEY);
      }
    } catch {
      status.value = 'invalid';
    }
  }

  return { token, status, referrerName, discountPct, active, initFromUrl };
});
