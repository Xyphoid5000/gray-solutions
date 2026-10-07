import type Lenis from 'lenis';

/**
 * Shared handle to the Lenis smooth-scroll instance owned by App.vue.
 * Components that need programmatic scrolling (e.g. Hero's "replay intro"
 * button, which scrolls back to the top so the scrubbed intro replays)
 * go through here instead of holding their own Lenis reference.
 */
let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null): void {
  lenis = instance;
}

/** Smooth-scroll back to the very top (replays the scroll-driven intro). */
export function scrollToTop(): void {
  if (lenis) {
    lenis.scrollTo(0, { duration: 2.4 });
  } else {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

/** Slow, cinematic scroll to an element — the contact-form reveal. */
export function scrollSlowTo(el: HTMLElement, onComplete?: () => void): void {
  if (lenis) {
    lenis.scrollTo(el, { duration: 3.4, onComplete });
  } else {
    el.scrollIntoView({ behavior: 'smooth' });
    if (onComplete) window.setTimeout(onComplete, 700);
  }
}
