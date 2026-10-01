import { ref } from 'vue';

/**
 * The discount code currently on offer — set when a visitor calls
 * Gray Solutions from the desk phone, read by the contact form to
 * validate what the visitor types. Session-scoped: a fresh visit
 * means a fresh code, like everything else on the desk.
 */
export const activeDiscountCode = ref('');
