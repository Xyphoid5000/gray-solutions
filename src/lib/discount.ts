import { ref } from 'vue';

/**
 * The discount code currently on offer — set when a visitor calls
 * Gray Solutions from the desk phone, read by the contact form to
 * validate what the visitor types. Session-scoped: a fresh visit
 * means a fresh code, like everything else on the desk.
 */
export const activeDiscountCode = ref('');

/**
 * One-shot auto-fill request: the desk phone sets this when the visitor
 * taps "fill it in for me". The contact form consumes it into its discount
 * field, then clears it. The submit-time check against activeDiscountCode
 * still runs, so a shared/copied code won't validate on another visit.
 */
export const autoFillDiscountCode = ref('');
