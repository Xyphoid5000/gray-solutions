import { ref } from 'vue';

/**
 * Whether the manuscript has been bound into a book this session.
 * Module-level so it survives Cover unmounting; resets on refresh.
 */
export const manuscriptBound = ref(false)

export function markManuscriptBound() {
  manuscriptBound.value = true;
}

/**
 * Whether the book-intro modal has been shown this session.
 * Module-level so it survives unmounts; resets on refresh.
 */
export const bookIntroSeen = ref(false);

export function markBookIntroSeen() {
  bookIntroSeen.value = true;
}
