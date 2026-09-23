/**
 * Outro/handoff state machine for the intro sequence (pure function
 * of p).
 *
 * 2026-09-23 — the 3D ending (Chris: "You should see the end side of
 * the bridge and the camera should move down and the. The logo should
 * appear."): the 3D scene holds the bridge-into-crossbar line-up
 * through p=0.97, then hands off — the canvas fades out and the hero
 * reveals in place behind it.
 *
 * Robustness (lesson from the 2026-09-23 ghost-overlay bug, kept):
 *  - The fades COMPLETE at 0.985, and a completion threshold
 *    (OUTRO_DONE_P) forces the exact finished state at/above it —
 *    canvas opacity 0 + visibility hidden, hero fully revealed — so a
 *    scroll that stalls just shy of 1.0 can never leave ghosts.
 *  - The component also toggles an `.is-done` class whose !important
 *    CSS rules are a hard guarantee. The class is removed whenever p
 *    drops back under the threshold, so scrubbing up restores the
 *    scrubbed 3D state exactly — no stuck state.
 *
 * Everything here is deterministic and scrub-reversible.
 */

/** At/above this progress the handoff is exactly finished. */
export const OUTRO_DONE_P = 0.985;

export interface OutroState {
  /** Finished: canvas exactly gone + hidden, hero fully revealed. */
  done: boolean;
  /** WebGL canvas opacity (0..1). */
  canvasOpacity: number;
  /** WebGL canvas should be visibility:hidden (no frame bleed-through). */
  canvasHidden: boolean;
  /** Hero opacity (0..1). */
  heroOpacity: number;
  /** Hero links/buttons may enter the tab order. */
  heroInteractive: boolean;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * HANDOFF (0.965 -> 0.985): the 3D scene fades out; the hero — which
 * was behind the canvas the whole time — reveals in place. It never
 * slides up; we started inside it.
 */
export function outroState(p: number): OutroState {
  if (p >= OUTRO_DONE_P) {
    return {
      done: true,
      canvasOpacity: 0,
      canvasHidden: true,
      heroOpacity: 1,
      heroInteractive: true,
    };
  }
  const canvasOpacity = 1 - clamp01((p - 0.965) / 0.02);
  const heroOpacity = clamp01((p - 0.965) / 0.02);
  return {
    done: false,
    canvasOpacity,
    canvasHidden: canvasOpacity <= 0.002,
    heroOpacity,
    heroInteractive: p >= 0.98,
  };
}
