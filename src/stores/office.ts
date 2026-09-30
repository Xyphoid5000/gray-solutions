import { defineStore } from 'pinia';
import { ref } from 'vue';
import { manuscriptBound, markManuscriptBound } from '../lib/manuscript';

/**
 * The office: shelf view vs desk view. Only one is active at a time —
 * it's a carousel, not two mounted views.
 */
export const useOfficeStore = defineStore('office', () => {
  /** Which side of the office is showing: the bookshelf or the desk. */
  const view = ref<'shelf' | 'desk'>('shelf');
  /** True while the camera is sliding between shelf and desk. */
  const transitioning = ref(false);
  /** True while the falling-pages overlay is running. */
  const pagesFalling = ref(false);

  function showDesk() {
    view.value = 'desk';
  }

  function showShelf() {
    view.value = 'shelf';
  }

  function setTransitioning(v: boolean) {
    transitioning.value = v;
  }

  function setPagesFalling(v: boolean) {
    pagesFalling.value = v;
  }

  return {
    view,
    transitioning,
    pagesFalling,
    manuscriptBound,
    markManuscriptBound,
    showDesk,
    showShelf,
    setTransitioning,
    setPagesFalling,
  };
});
