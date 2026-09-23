/**
 * The intro's 3D story as pure keyframe data — the single source of
 * truth for the timeline built in `three/intro.ts`. Everything is a
 * pure function of p (0..1), so scrolling up rewinds exactly.
 *
 * THE ENDING (2026-09-23, Chris's words): "You should see the end side
 * of the bridge and the camera should move down and the. The logo
 * should appear."
 *
 * Beats:
 *   - 0 -> 0.1:  grey-void resolve (fog 0.0011 -> 0.0005).
 *   - 0 -> 0.60: THE BRIDGE — backward dolly (0,95,520)->(0,140,1150),
 *     x=0, looking down the deck. Stars/streaks/shimmer on; far end
 *     lost in fog = infinite.
 *   - 0.60 -> 0.75: THE END REVEALED — travel continues; fog lifts to
 *     0.00018 so the far end face is clearly visible (>=50% unfogged).
 *   - 0.75 -> 0.88: DESCEND — the camera moves DOWN (140->70) and eases
 *     toward the bridge end; the view flattens onto the end face. No
 *     rise, no swoop, no plunge. Z stays monotonic (no kinks).
 *   - 0.80 -> 0.92: THE LOGO APPEARS — his mark fades in standing IN
 *     THE WORLD at the far end, its crossbar continuing the bridge.
 *   - 0.92 -> 0.97: HOLD the line-up. 0.97 -> 1.0: DOM handoff
 *     (canvas fades, hero reveals) — see `introOutro.ts`.
 */

export interface Key {
  p: number;
  v: number;
}
export interface Key3 {
  p: number;
  v: [number, number, number];
}

/** GSAP sine.inOut — the easing the timeline uses between keyframes. */
export function sineInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

function seg(keys: Key[], p: number): [Key, Key] {
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i].p) return [keys[i - 1], keys[i]];
  }
  return [keys[keys.length - 2], keys[keys.length - 1]];
}

/** Sample a scalar keyframe channel at p (sine.inOut between keys). */
export function sampleKeys(keys: Key[], p: number): number {
  const [a, b] = seg(keys, p);
  const t = (p - a.p) / Math.max(1e-9, b.p - a.p);
  return a.v + (b.v - a.v) * sineInOut(t);
}

/** Sample a vec3 keyframe channel at p. */
export function sampleKeys3(keys: Key3[], p: number): [number, number, number] {
  const ka: Key[] = keys.map((k) => ({ p: k.p, v: k.v[0] }));
  const kb: Key[] = keys.map((k) => ({ p: k.p, v: k.v[1] }));
  const kc: Key[] = keys.map((k) => ({ p: k.p, v: k.v[2] }));
  return [sampleKeys(ka, p), sampleKeys(kb, p), sampleKeys(kc, p)];
}

/* ---------------- camera ---------------- */
// Y: 95 -> 140 (the approved travel) then FLAT, then DOWN to 70.
// Never rises again. Z monotonic increasing — no kinks, no reversals.
export const CAM_KEYS: Key3[] = [
  { p: 0.0, v: [0, 95, 520] },
  { p: 0.6, v: [0, 140, 1150] },
  { p: 0.75, v: [0, 140, 1300] },
  { p: 0.88, v: [0, 70, 1500] },
];

// The look target eases from down-the-deck onto the far end face.
export const TGT_KEYS: Key3[] = [
  { p: 0.0, v: [0, 25, -700] },
  { p: 0.6, v: [0, 30, -700] },
  { p: 0.75, v: [0, 15, -1800] },
  { p: 0.88, v: [0, 0, -2600] },
];

/* ---------------- fog (FogExp2 density) ---------------- */
// 0.0005 hides the far end (infinite); 0.00018 reveals it clearly:
// at the 0.75 camera the end face is ~60% unfogged (verified numerically).
export const FOG_KEYS: Key[] = [
  { p: 0.0, v: 0.0011 },
  { p: 0.1, v: 0.0005 },
  { p: 0.6, v: 0.0005 },
  { p: 0.75, v: 0.00018 },
];

/* ---------------- the world mark ---------------- */
export const MARK_OPACITY_KEYS: Key[] = [
  { p: 0.0, v: 0 },
  { p: 0.8, v: 0 },
  { p: 0.92, v: 1 },
];

// logo-mark.png is 464x423. Crossbar fractions (measured, image space,
// y down from top): x 0.2586..0.8772, y 0.3073..0.4374.
const CB_FCX = (0.2586 + 0.8772) / 2;
const CB_FCY = (0.3073 + 0.4374) / 2;

// Monumental but composed: crossbar ~7° wide at the hold camera.
export const MARK_W = 840;
export const MARK_H = (MARK_W * 423) / 464;
// Crossbar center lands exactly on the bridge axis (x=0, y=0), so the
// slashed far end plugs into the middle of the crossbar.
export const MARK_X = (0.5 - CB_FCX) * MARK_W;
export const MARK_Y = (CB_FCY - 0.5) * MARK_H;
// Just behind the rearmost corner of the slashed end face (z=-2690),
// so the whole end face stays in front of the mark.
export const MARK_Z = -2740;
