import { ref } from 'vue';

/**
 * The discount code currently on offer — set when a visitor calls
 * Gray Solutions from the desk phone, read by the contact form to
 * pre-fill its discount field and to validate what the visitor submits.
 * Session-scoped: a fresh visit means a fresh code, like everything else
 * on the desk. The submit-time check still runs, so a shared/copied code
 * won't validate on another visit.
 */
export const activeDiscountCode = ref('');
