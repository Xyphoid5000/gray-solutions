import { ref } from 'vue';

/**
 * Whether the manuscript has been bound into a book this session.
 * Module-level so it survives Cover unmounting; resets on refresh.
 */
export const manuscriptBound = ref(false);

export function markManuscriptBound() {
  manuscriptBound.value = true;
}
