<script setup lang="ts">
import { ref, watch } from 'vue';
import { activeDiscountCode } from '../lib/discount';
import { contactSubmitted } from '../lib/contact';
import { useBonusStore } from '../stores/bonus';
import { useSettingsStore } from '../stores/settings';
import { storeToRefs } from 'pinia';

defineProps<{ isBound?: boolean }>();

const bonus = useBonusStore();
const { siteName } = storeToRefs(useSettingsStore());
const hasSite = ref('');
const formStatus = ref('');
const formError = ref(false);
/** Session-scoped: once a message sends, the form hides and a success
    note takes its place. Never persisted — a fresh visit gets a fresh form. */
const sent = ref(false);
const showPuzzleInfo = ref(false);
const showHint = ref(false);
/** Bonus state frozen at the moment the hint was revealed — it never updates after. */
const hintSeesBonus = ref(false);
const discountError = ref('');
const discountInput = ref<HTMLInputElement | null>(null);
const phoneInput = ref<HTMLInputElement | null>(null);

/** Once the visitor has found this visit's code (via the desk phone),
    the discount field fills itself in — no button needed. Never
    clobbers what the visitor typed themselves. */
watch(
  activeDiscountCode,
  (code) => {
    if (!code || !discountInput.value || discountInput.value.value) return;
    discountInput.value.value = code;
  },
  { immediate: true },
);

/** Reveal the hint, freezing whatever the bonus state is right now —
    it never updates after this. Bonus already on: point at the first
    draft. Otherwise: point at turning the document around. */
function revealHint() {
  hintSeesBonus.value = bonus.enabled;
  showHint.value = true;
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
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const site = String(formData.get('site-url') ?? '').trim();
  // Accept what people actually type (www.example.com) and normalize the scheme.
  const siteUrl = site && !/^[a-z][a-z0-9+.-]*:\/\//i.test(site) ? `https://${site}` : site;
  const comments = String(formData.get('comments') ?? '').trim();
  const discount = String(formData.get('discount-code') ?? '').trim();
  const company = String(formData.get('company') ?? '').trim();

  // A code only counts if it matches the one currently on the phone.
  discountError.value = '';
  let discountLine = `Discount code: ${discount || '—'}`;
  if (discount) {
    const live = activeDiscountCode.value.trim();
    if (live && discount.toUpperCase() === live.toUpperCase()) {
      discountLine = `Discount code: ${live} — verified (20% off)`;
    } else {
      discountError.value = "That doesn't match the code on the site.";
      return;
    }
  }

  formError.value = false;
  formStatus.value = 'Sending…';
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        phone,
        hasSite: hasSite.value,
        siteUrl,
        comments,
        discountLine,
        company,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Something went wrong sending your message.');
    }
    formStatus.value = 'Got it — I read every note myself and reply within a couple of days.';
    sent.value = true;
    contactSubmitted.value = true;
    form.reset();
    hasSite.value = '';
  } catch (err) {
    formError.value = true;
    formStatus.value = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
  }
}
</script>

<template>
  <div v-if="sent" class="contact-success" role="status">
    <p class="contact-success-title">Message sent.</p>
    <p class="contact-success-sub">Got it — I read every note myself and reply within a couple of days.</p>
  </div>
  <form v-else class="contact-form" @submit.prevent="submitContactForm">
    <input name="company" type="text" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true" />
    <div class="contact-row">
      <label class="field">
        <span>Name</span>
        <input name="name" type="text" autocomplete="name" required placeholder="Your name" />
      </label>
    </div>
    <div class="contact-row contact-row-2">
      <label class="field">
        <span>Email</span>
        <input name="email" type="email" autocomplete="email" required placeholder="you@example.com" />
      </label>
      <label class="field">
        <span>Phone <em>(optional)</em></span>
        <input ref="phoneInput" name="phone" type="tel" autocomplete="tel" placeholder="(555) 123-4567" @input="onPhoneInput" />
      </label>
    </div>
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
      <span>Discount code <em>(if you found one)</em>
        <button type="button" class="puzzle-info-btn" @click="showPuzzleInfo = !showPuzzleInfo" aria-label="About the discount code">?</button>
      </span>
      <input ref="discountInput" name="discount-code" type="text" autocomplete="off" placeholder="CURIOUS-XXXXXX" aria-describedby="discount-error" />
      <small v-if="discountError" id="discount-error" class="discount-error" role="alert">{{ discountError }}</small>
      <span v-if="showPuzzleInfo" class="puzzle-info-text">
        <small>Somewhere on this site is a one time code for 20% off your website.</small>
        <button v-if="!showHint" type="button" class="hint-btn" @click="revealHint">Show hint</button>
        <small v-else class="puzzle-hint">{{ hintSeesBonus ? 'review the first draft.' : `Turn the ${isBound ? siteName + ' book' : 'manuscript'} around.` }}</small>
      </span>
    </label>
    <div class="contact-submit">
      <button class="btn btn-solid" type="submit">
        Send it over <span class="arrow" aria-hidden="true">&rarr;</span>
      </button>
      <small aria-live="polite" :class="{ 'form-error': formError }">{{ formStatus || 'I read every note myself and reply within a couple of days.' }}</small>
    </div>
  </form>
</template>
