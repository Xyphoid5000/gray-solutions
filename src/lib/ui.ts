import { ref } from 'vue';

/**
 * Set when the user asks for the contact form from elsewhere in the
 * book. The Cover sees it on mount and plays the return sequence:
 * the book closes, the camera zooms back out, then a slow scroll
 * down to the form.
 */
export const returnToContact = ref(false);
