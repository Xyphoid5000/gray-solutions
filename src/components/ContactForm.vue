<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { activeDiscountCode } from '../lib/discount';
import {
  FALLBACK_TIERS,
  discountedPrice,
  fetchPricingTiers,
  formatPrice,
  type PricingTier,
} from '../lib/pricing';
import { contactSubmitted } from '../lib/contact';
import { markManuscriptBound } from '../lib/manuscript';
import { useBonusStore } from '../stores/bonus';
import { useReferralStore } from '../stores/referral';
import { useSettingsStore } from '../stores/settings';
import { storeToRefs } from 'pinia';

defineProps<{ isBound?: boolean }>();

const bonus = useBonusStore();
const referral = useReferralStore();
const { active: referralActive, referrerName } = storeToRefs(referral);
const { siteName } = storeToRefs(useSettingsStore());
const hasSite = ref('');
const formStatus = ref('');
const formError = ref(false);
/** Session-scoped: once a message sends, a success modal appears.
    The form stays visible — the section is never removed. */
const sent = ref(false);
const showPuzzleInfo = ref(false);
const showHint = ref(false);
/** Bonus state frozen at the moment the hint was revealed — it never updates after. */
const hintSeesBonus = ref(false);
const discountError = ref('');
const discountInput = ref<HTMLInputElement | null>(null);
const emailInput = ref<HTMLInputElement | null>(null);
/** Password validation message (too short, or the two fields
    don't match) — the Worker enforces the same rules. */
const passwordError = ref('');
/** The email from the signup that just succeeded — the success
    modal links to the dashboard with it prefilled. */
const submittedEmail = ref('');
/** True when the just-created login is still waiting on its
    email confirmation — the success modal says check your email
    instead of offering the dashboard sign-in. */
const pendingConfirmation = ref(false);
const dashboardSigninUrl = computed(
  () => `https://dashboard.graywebsolutions.com?email=${encodeURIComponent(submittedEmail.value)}`,
);
/** True when the typed email already has an account — the form
    blocks submission and points at the dashboard instead. */
const emailExists = ref(false);
let emailCheckTimer: ReturnType<typeof setTimeout> | undefined;
const phoneInput = ref<HTMLInputElement | null>(null);
const tiers = ref<PricingTier[]>(FALLBACK_TIERS);
const selectedTierId = ref('');
const discountText = ref('');
/** The percent of the last validated global code, and the code it
    was validated for (uppercase) — a stale validation never
    counts once the text changes. */
const globalPct = ref(0);
const globalCodeChecked = ref('');

onMounted(async () => {
  tiers.value = await fetchPricingTiers();
  // /contact?code=HOLIDAY25 pre-fills the field (URL param only,
  // no sessionStorage) and runs the same validation as typed
  // entry — same result either way.
  const urlCode = new URLSearchParams(window.location.search).get('code')?.trim() ?? '';
  if (urlCode) {
    discountText.value = urlCode;
    if (discountInput.value) discountInput.value.value = urlCode;
    await validateDiscountCode(urlCode);
  }
});

/** Live discount for the price line: the best of the referral
    discount, a desk code that matches the live code, and a
    validated global code. The submit handler re-validates the
    code itself — this is display only. */
const codeMatches = computed(() => {
  const live = activeDiscountCode.value.trim();
  const typed = discountText.value.trim();
  return !!live && !!typed && typed.toUpperCase() === live.toUpperCase();
});
/** The validated global percent, only while the field still holds
    the code it was validated for. */
const validatedGlobalPct = computed(() =>
  discountText.value.trim().toUpperCase() === globalCodeChecked.value ? globalPct.value : 0,
);
const discountPct = computed(() =>
  Math.max(referralActive.value ? 10 : 0, codeMatches.value ? 10 : 0, validatedGlobalPct.value),
);
const selectedTier = computed(
  () => tiers.value.find((t) => String(t.id) === selectedTierId.value) ?? null,
);
const finalPrice = computed(() =>
  selectedTier.value ? discountedPrice(selectedTier.value.priceCents, discountPct.value) : null,
);

/** Once the visitor has found this visit's code (via the desk phone),
    the discount field fills itself in — no button needed. Never
    clobbers what the visitor typed themselves. */
/** Fill the discount field when the code is available AND the input exists.
    Handles the code being set before the form mounts. */
function tryFillDiscount() {
  const code = activeDiscountCode.value;
  if (!code || !discountInput.value || discountInput.value.value) return;
  discountInput.value.value = code;
  discountText.value = code;
}
watch(activeDiscountCode, tryFillDiscount, { immediate: true });
watch(discountInput, tryFillDiscount);

/** Validates a typed code against the global-discount endpoint
    (on blur and at submit; never on keystroke). The desk code is
    checked by the caller first and never reaches this endpoint.
    Also records the validated percent and, for an expired code,
    the inline error — the submit handler is authoritative. */
async function validateDiscountCode(code: string): Promise<{ valid: boolean; pct: number; reason?: string }> {
  const upper = code.trim().toUpperCase();
  try {
    const res = await fetch(`/api/global-discount?code=${encodeURIComponent(code.trim())}`);
    const data = (await res.json().catch(() => ({}))) as { valid?: unknown; discountPct?: unknown; reason?: unknown };
    if (res.ok && data.valid === true && typeof data.discountPct === 'number') {
      globalPct.value = data.discountPct;
      globalCodeChecked.value = upper;
      discountError.value = '';
      return { valid: true, pct: data.discountPct };
    }
    globalPct.value = 0;
    globalCodeChecked.value = upper;
    const reason = typeof data.reason === 'string' ? data.reason : 'invalid';
    if (reason === 'expired') {
      discountError.value = 'This code is no longer valid.';
    }
    return { valid: false, pct: 0, reason };
  } catch {
    globalPct.value = 0;
    globalCodeChecked.value = upper;
    return { valid: false, pct: 0, reason: 'invalid' };
  }
}

/** On blur, validate a typed code that isn't the desk code, so the
    price line shows the real percent before submit. */
async function onDiscountBlur() {
  const code = discountText.value.trim();
  if (!code) {
    globalPct.value = 0;
    globalCodeChecked.value = '';
    discountError.value = '';
    return;
  }
  const live = activeDiscountCode.value.trim();
  if (live && code.toUpperCase() === live.toUpperCase()) {
    discountError.value = '';
    return;
  }
  await validateDiscountCode(code);
}

/** Typing clears the inline error — the code on screen is not the
    code that was checked. */
function onDiscountInput(event: Event) {
  discountText.value = (event.target as HTMLInputElement).value;
  discountError.value = '';
}

/** Reveal the hint, freezing whatever the bonus state is right now —
    it never updates after this. Bonus already on: point at the first
    draft. Otherwise: point at turning the document around. */
function revealHint() {
  hintSeesBonus.value = bonus.enabled;
  showHint.value = true;
}

const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Asks the Worker whether the email already has an account.
    Returns null on any failure — the caller fails open and lets
    the submit go through; the Worker's 409 is authoritative.
    A still-pending account reads as no account here: the visitor
    can re-submit to get a fresh confirmation link. */
async function checkEmailAccount(email: string): Promise<boolean | null> {
  try {
    const res = await fetch(`/api/contact/check-email?email=${encodeURIComponent(email)}`);
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { exists?: unknown; pending?: unknown };
    return data.exists === true && data.pending !== true;
  } catch {
    return null;
  }
}

/** On blur (debounced), check whether the typed email already has
    an account. The result only applies if the field still holds
    the checked email — a stale answer never flags a new address. */
function onEmailBlur() {
  const email = (emailInput.value?.value ?? '').trim();
  if (emailCheckTimer) clearTimeout(emailCheckTimer);
  if (!EMAIL_FORMAT_RE.test(email)) return;
  emailCheckTimer = setTimeout(async () => {
    const exists = await checkEmailAccount(email);
    if (exists === true && (emailInput.value?.value ?? '').trim() === email) {
      emailExists.value = true;
    }
  }, 300);
}

/** Progressive US phone formatting: (xxx) xxx-xxxx. Digits only, max 10. */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Reformat the phone field as the visitor types, pastes, or deletes.
    The caret is restored next to the digit it was beside, so editing
    mid-number doesn't jump to the end. */
function onPhoneInput() {
  const el = phoneInput.value;
  if (!el) return;
  const raw = el.value;
  const formatted = formatPhone(raw);
  if (formatted === raw) return;
  // Digits before the caret in the unformatted value — the anchor we
  // restore against in the formatted one.
  const caret = el.selectionStart ?? raw.length;
  const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
  el.value = formatted;
  let pos = 0;
  if (digitsBefore > 0) {
    let seen = 0;
    pos = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) seen++;
      if (seen >= digitsBefore) {
        pos = i + 1;
        break;
      }
    }
  }
  el.setSelectionRange(pos, pos);
}

async function submitContactForm(event: SubmitEvent) {
  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);
  const name = String(formData.get('name') ?? '').trim();
  const businessName = String(formData.get('business-name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const site = String(formData.get('site-url') ?? '').trim();
  // Accept what people actually type (www.example.com) and normalize the scheme.
  const siteUrl = site && !/^[a-z][a-z0-9+.-]*:\/\//i.test(site) ? `https://${site}` : site;
  const comments = String(formData.get('comments') ?? '').trim();
  const discount = String(formData.get('discount-code') ?? '').trim();
  const company = String(formData.get('company') ?? '').trim();
  // Passwords are never trimmed: spaces are part of the password.
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirm-password') ?? '');

  // The login: at least 8 characters, and the two fields must
  // match. The Worker enforces the same rules server-side.
  passwordError.value = '';
  if (password.length < 8) {
    passwordError.value = 'Your password must be at least 8 characters.';
    return;
  }
  if (password !== confirmPassword) {
    passwordError.value = "Your passwords don't match.";
    return;
  }

  // A code only counts if it matches the one currently on the phone,
  // or a live global code. The submit-time check is authoritative.
  discountError.value = '';
  let discountLine = `Discount code: ${discount || '—'}`;
  let discountVerified = false;
  let codePct = 0;
  if (discount) {
    const live = activeDiscountCode.value.trim();
    if (live && discount.toUpperCase() === live.toUpperCase()) {
      discountLine = `Discount code: ${live} — verified (10% off)`;
      discountVerified = true;
      codePct = 10;
    } else {
      const verdict = await validateDiscountCode(discount);
      if (verdict.valid) {
        discountLine = `Discount code: ${discount.toUpperCase()} — verified (${verdict.pct}% off)`;
        discountVerified = true;
        codePct = verdict.pct;
      } else if (verdict.reason === 'expired') {
        discountError.value = 'This code is no longer valid.';
        return;
      } else {
        discountError.value = "That doesn't match the code on the site.";
        return;
      }
    }
  }
  // The effective percent is the best of the sources — the server
  // recomputes it from the raw code, this is what the form saw.
  const effectivePct = Math.max(referralActive.value ? 10 : 0, codePct);

  // An email that already has an account belongs in the dashboard,
  // not this form. The pre-submit check fails open — the Worker
  // enforces the same rule and answers 409.
  if (EMAIL_FORMAT_RE.test(email)) {
    const exists = await checkEmailAccount(email);
    if (exists === true) {
      emailExists.value = true;
      return;
    }
  }

  formError.value = false;
  formStatus.value = 'Creating your login…';
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        businessName,
        email,
        phone,
        hasSite: hasSite.value,
        siteUrl,
        comments,
        password,
        confirmPassword,
        discountLine,
        discountVerified,
        discountCode: discount,
        discountPct: effectivePct,
        referralToken: referralActive.value ? referral.token : '',
        tierId: selectedTierId.value ? Number(selectedTierId.value) : null,
        company,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; pending?: boolean };
    if (res.status === 409) {
      // Authoritative answer: the email already has an account.
      // The inline note carries the message; clear the status line.
      emailExists.value = true;
      formStatus.value = '';
      return;
    }
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Something went wrong sending your message.');
    }
    if (data.pending) {
      // The login exists but the email isn't confirmed yet: the
      // confirmation link is on its way, good for 12 hours.
      formStatus.value = 'Check your email to confirm your account — the link is good for 12 hours.';
      pendingConfirmation.value = true;
    } else {
      formStatus.value = 'Your login is created — sign in to your dashboard to follow the conversation.';
      pendingConfirmation.value = false;
    }
    submittedEmail.value = email;
    sent.value = true;
    contactSubmitted.value = true;
    // They reached us without watching the binding — the manuscript
    // counts as bound from here, so browsing on stays post-binding.
    markManuscriptBound();
    form.reset();
    hasSite.value = '';
    selectedTierId.value = '';
    discountText.value = '';
    passwordError.value = '';
    emailExists.value = false;
  } catch (err) {
    formError.value = true;
    formStatus.value = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="sent" class="contact-modal-backdrop" @click.self="sent = false">
      <div class="contact-modal" role="dialog" aria-modal="true" aria-label="Message sent">
        <span class="contact-success-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28">
            <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <p class="contact-success-title">{{ pendingConfirmation ? 'Check your email.' : 'Your login is ready.' }}</p>
        <p class="contact-success-sub" v-if="pendingConfirmation">We sent a confirmation link to {{ submittedEmail }} — it's good for 12 hours. Once you confirm, you'll land straight in your dashboard and we'll pick up the conversation about your project.</p>
        <p class="contact-success-sub" v-else>Your message has been sent. Chris will follow up with you within 3 days to discuss your project — sign in to your dashboard to follow the conversation.</p>
        <a v-if="!pendingConfirmation" class="contact-modal-close" :href="dashboardSigninUrl">
          Sign in to your dashboard
        </a>
        <button type="button" class="contact-modal-close" @click="sent = false">
          Done
        </button>
      </div>
    </div>
  </Teleport>
  <form class="contact-form" @submit.prevent="submitContactForm">
    <input name="company" type="text" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true" />
    <div class="contact-row contact-row-2">
      <label class="field">
        <span>Name</span>
        <input name="name" type="text" autocomplete="name" required placeholder="Your name" />
      </label>
      <label class="field">
        <span>Company name</span>
        <input name="business-name" type="text" autocomplete="organization" required placeholder="Your business name" />
      </label>
    </div>
    <div class="contact-row contact-row-2">
      <label class="field">
        <span>Phone <em>(optional)</em></span>
        <input ref="phoneInput" name="phone" type="tel" autocomplete="tel" placeholder="(555) 123-4567" @input="onPhoneInput" />
      </label>
      <label class="field">
        <span>Email</span>
        <input ref="emailInput" name="email" type="email" autocomplete="email" required placeholder="you@example.com" @blur="onEmailBlur" @input="emailExists = false" />
        <small v-if="emailExists" class="email-exists-note" role="alert">Looks like there's already an account with this email — <a href="https://dashboard.graywebsolutions.com" target="_blank" rel="noopener">sign in to your dashboard</a> to pick up where you left off.</small>
      </label>
    </div>
    <div class="contact-row contact-row-2">
      <label class="field">
        <span>Password</span>
        <input name="password" type="password" autocomplete="new-password" required minlength="8" placeholder="At least 8 characters" aria-describedby="password-error" @input="passwordError = ''" />
      </label>
      <label class="field">
        <span>Confirm password</span>
        <input name="confirm-password" type="password" autocomplete="new-password" required minlength="8" placeholder="Same password again" aria-describedby="password-error" @input="passwordError = ''" />
      </label>
    </div>
    <small v-if="passwordError" id="password-error" class="field-error" role="alert">{{ passwordError }}</small>
    <small v-else class="field-hint">You'll use this email and password to sign in to your dashboard.</small>
    <fieldset class="field">
      <legend>Do you have an existing website?</legend>
      <div class="radio-row">
        <label class="radio-pill">
          <input type="radio" name="has-site" value="yes" v-model="hasSite" required />
          <span>Yes</span>
        </label>
        <label class="radio-pill">
          <input type="radio" name="has-site" value="no" v-model="hasSite" />
          <span>No</span>
        </label>
      </div>
    </fieldset>
    <Transition name="fade">
      <label v-if="hasSite === 'yes'" class="field">
        <span>What&rsquo;s the address of your current site?</span>
        <input name="site-url" type="text" inputmode="url" required placeholder="https://yoursite.com" />
      </label>
    </Transition>
    <label class="field">
      <span>Tell me about your project</span>
      <textarea
        name="comments"
        rows="5"
        required
        placeholder="What does your business do, who is it for, and what should your website accomplish?"
      ></textarea>
    </label>
    <label class="field">
      <span>What kind of project is it? <em>(optional)</em></span>
      <select name="pricing-tier" v-model="selectedTierId" aria-label="Pricing tier">
        <option value="">Not sure yet</option>
        <option v-for="tier in tiers" :key="tier.id" :value="String(tier.id)">
          {{ tier.name }} — from {{ formatPrice(tier.priceCents) }}
        </option>
      </select>
    </label>
    <p v-if="selectedTier" class="quote-line">
      Starting at {{ formatPrice(selectedTier.priceCents) }}<template v-if="discountPct"> — {{ formatPrice(finalPrice ?? 0) }} with your {{ discountPct }}% off</template>.
    </p>
    <p v-if="referralActive" class="referral-note">
      {{ referrerName ? `Referred by ${referrerName} — ` : 'You came through a share link — ' }}{{ discountPct }}% off your website, applied when you create your login.
    </p>
    <label class="field">
      <span>Discount code <em>(if you found one)</em>
        <button type="button" class="puzzle-info-btn" @click="showPuzzleInfo = !showPuzzleInfo" aria-label="About the discount code">?</button>
      </span>
      <input ref="discountInput" name="discount-code" type="text" autocomplete="off" placeholder="CURIOUS-XXXXXX" aria-describedby="discount-error" @input="onDiscountInput" @blur="onDiscountBlur" />
      <small v-if="discountError" id="discount-error" class="discount-error" role="alert">{{ discountError }}</small>
      <span v-if="showPuzzleInfo" class="puzzle-info-text">
        <small>Somewhere on this site is a one time code for 10% off your website.</small>
        <button v-if="!showHint" type="button" class="hint-btn" @click="revealHint">Show hint</button>
        <small v-else class="puzzle-hint">{{ hintSeesBonus ? 'review the first draft.' : `Turn the ${isBound ? siteName + ' book' : 'manuscript'} around.` }}</small>
      </span>
    </label>
    <div class="contact-submit">
      <button class="btn btn-solid" type="submit">
        Create my login <span class="arrow" aria-hidden="true">&rarr;</span>
      </button>
      <small aria-live="polite" :class="{ 'form-error': formError }">{{ formStatus || 'I read every note myself and reply within a couple of days.' }}</small>
    </div>
  </form>
</template>
