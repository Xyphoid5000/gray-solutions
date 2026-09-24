import { ref } from 'vue';

/**
 * Set when the user asks for a home-page section from inside the book.
 * The Cover sees it on mount and plays the return sequence: the book
 * closes, the camera zooms back out, then a slow scroll to the section.
 */
export const returnToSection = ref<'contact' | 'about' | null>(null);
