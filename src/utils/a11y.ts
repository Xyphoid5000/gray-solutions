/** Accessibility mode: a user toggle that forces off animations and motion.
    Combines with the OS-level prefers-reduced-motion setting. */

/** True when the user has enabled accessibility mode via the header toggle. */
export function a11yModeOn(): boolean {
  return document.documentElement.classList.contains('a11y-mode');
}

/** True when motion should be minimized — either OS setting or the toggle. */
export function motionReduced(): boolean {
  return (
    a11yModeOn() ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Enable or disable accessibility mode. Persists the preference. */
export function setA11yMode(on: boolean): void {
  document.documentElement.classList.toggle('a11y-mode', on);
  try {
    localStorage.setItem('gs-a11y-mode', on ? '1' : '0');
  } catch {
    /* storage unavailable — mode still applies for this session */
  }
}

/** Restore a persisted accessibility preference on startup. */
export function initA11yMode(): void {
  try {
    if (localStorage.getItem('gs-a11y-mode') === '1') {
      document.documentElement.classList.add('a11y-mode');
    }
  } catch {
    /* ignore */
  }
}
