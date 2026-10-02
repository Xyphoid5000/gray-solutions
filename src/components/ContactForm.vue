<script setup lang="ts">
import { ref, watch } from 'vue';
import { activeDiscountCode, autoFillDiscountCode } from '../lib/discount';
import { useBonusStore } from '../stores/bonus';

defineProps<{ isBound?: boolean }>();

const bonus = useBonusStore();
const hasSite = ref('');
const formStatus = ref('');
const formError = ref(false);
const showPuzzleInfo = ref(false);
const showHint = ref(false);
/** Bonus state frozen at the moment the hint was revealed — it never updates after. */
const hintSeesBonus = ref(false);
const discountError = ref('');
const discountInput = ref<HTMLInputElement | null>(null);

/** The desk phone can drop this visit's code straight into the field. */
watch(autoFillDiscountCode, (code) => {
  if (!code) return;
  if (discountInput.value) discountInput.value.value = code;
  autoFillDiscountCode.value = '';
});

/** Reveal the hint, freezing whatever the bonus state is right now —
    it never updates after this. Bonus already on: point at the first
    draft. Otherwise: point at turning the document around. */
function revealHint() {
  hintSeesBonus.value = bonus.enabled;
  showHint.value = true;
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
    form.reset();
    hasSite.value = '';
  } catch (err) {
    formError.value = true;
    formStatus.value = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
  }
}
</script>

<template>
  <form class="contact-form" @submit.prevent="submitContactForm">
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
        <input name="phone" type="tel" autocomplete="tel" placeholder="(555) 123-4567" />
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
        <small v-else class="puzzle-hint">{{ hintSeesBonus ? 'review the first draft.' : `Turn the ${isBound ? 'Gray Solutions book' : 'manuscript'} around.` }}</small>
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
