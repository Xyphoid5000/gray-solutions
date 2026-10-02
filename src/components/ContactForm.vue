<script setup lang="ts">
import { ref } from 'vue';
import { activeDiscountCode } from '../lib/discount';

defineProps<{ bonusContent?: boolean }>();

const hasSite = ref('');
const formStatus = ref('');
const formError = ref(false);
const showPuzzleInfo = ref(false);
const discountError = ref('');

async function submitContactForm(event: SubmitEvent) {
  const form = event.currentTarget as HTMLFormElement;
  const formData = new FormData(form);
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const site = String(formData.get('site-url') ?? '').trim();
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
        siteUrl: site,
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
        <input name="site-url" type="url" inputmode="url" required placeholder="https://yoursite.com" />
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
    <label class="field" v-if="bonusContent">
      <span>Discount code <em>(if you found one)</em>
        <button type="button" class="puzzle-info-btn" @click="showPuzzleInfo = !showPuzzleInfo" aria-label="About the discount code">?</button>
      </span>
      <input name="discount-code" type="text" autocomplete="off" placeholder="CURIOUS-XXXXXX" aria-describedby="discount-error" />
      <small v-if="discountError" id="discount-error" class="discount-error" role="alert">{{ discountError }}</small>
      <small v-if="showPuzzleInfo" class="puzzle-info-text">Solve the hidden puzzle on this site for 20% off.</small>
    </label>
    <div class="contact-submit">
      <button class="btn btn-solid" type="submit">
        Send it over <span class="arrow" aria-hidden="true">&rarr;</span>
      </button>
      <small aria-live="polite" :class="{ 'form-error': formError }">{{ formStatus || 'I read every note myself and reply within a couple of days.' }}</small>
    </div>
  </form>
</template>
