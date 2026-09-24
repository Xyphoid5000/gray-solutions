import { ref } from 'vue';

/** Set once the user turns a page with a swipe — drives the swipe hint. */
export const hasSwiped = ref(false);

/**
 * Set when the user asks for the contact form from elsewhere in the
 * book. The Cover sees it on mount and plays the return sequence:
 * the book closes, the camera zooms back out, then a slow scroll
 * down to the form.
 */
export const returnToContact = ref(false);
