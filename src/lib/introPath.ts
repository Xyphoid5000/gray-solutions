/**
 * The intro's 3D story as pure keyframe data — the single source of
 * truth for the timeline built in `three/intro.ts`. Everything is a
 * pure function of p (0..1), so scrolling up rewinds exactly.
 *
 * THE CONCEPT (2026-09-23, Chris's words): "I see you pulled the logo
 * out into its own asset with a transparent background or so it seems.
 * So just remove the cross bar from that and replace it with the
 * bridge. Then it should come into view from behind the camera and the
 * end of the bridge should be at the same z increment as the logo so
 * that it gives the illusion that we started inside of the logo."
 *
 * The 3D bridge IS the logo's crossbar. The camera starts INSIDE the
 * bridge span (inside the crossbar), traveling +Z away from the logo —
 * which sits behind the camera at z=-1, unseen. At the end the camera
 * yaws 180° and the logo comes into view FROM BEHIND THE CAMERA: the
 * mark (crossbar removed -> transparent slot) with the bridge you've
 * been riding plugging into that slot. The reveal: you were inside the
 * logo the whole time.
 *
 * World layout:
 *   - Mark (logo-mark-no-crossbar.png, 464x423): vertical plane at
 *     z=-1, facing +Z. Crossbar center on the bridge axis (x=0, y=0).
 *   - Bridge: its -Z end face at z=0 ("the same z as the logo"), the
 *     rearmost corner of the slashed end exactly at z=0, extending
 *     +Z ~4690. Width 130 = the crossbar's world width, so the bridge
 *     reads AS the crossbar; the opaque mark occludes the deck
 *     everywhere except through the transparent crossbar slot.
 *
 * Beats:
 *   - 0 -> 0.1:  grey-void resolve (fog 0.0011 -> 0.0005).
 *   - 0.1 -> 0.70: THE TRAVEL — dolly +Z inside the bridge span
 *     (0,95,500)->(0,140,1400), x=0, looking +Z down the deck. Stars,
 *     scroll streaks, shimmer ON; the far end lost in fog = infinite.
 *     The logo sits behind the camera, unseen.
 *   - 0.70 -> 0.85: THE TURN — the camera yaws 180° (one parametric
 *     cubic-Bezier sweep of the look target, sine.inOut — a deliberate
 *     turn-around, no whip, no hitch) to face -Z. THE LOGO COMES INTO
 *     VIEW FROM BEHIND THE CAMERA, fading in 0.70->0.82 as the turn
 *     completes. Level yaw: camera y stays 140, no rise, no dive.
 *   - 0.85 -> 0.92: HOLD the full logo — bridge running into its mark.
 *   - 0.92 -> 1.0: DOM handoff (canvas fades, hero reveals) — see
 *     `introOutro.ts`.
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
// Inside the bridge span, traveling +Z away from the logo (which sits
// behind the camera at z=-1). The turn is a LEVEL yaw: y stays 140,
// z drifts 1400->1450. No rise, no dive, no swoop.
export const CAM_KEYS: Key3[] = [
  { p: 0.0, v: [0, 95, 500] },
  { p: 0.1, v: [0, 100, 620] },
  { p: 0.7, v: [0, 140, 1400] },
  { p: 0.85, v: [0, 140, 1450] },
  { p: 0.92, v: [0, 140, 1450] },
];

// The look target during the travel (0 -> 0.70): down the deck, +Z.
// The turn itself (0.70 -> 0.85) is parametric — see TURN_BEZIER below.
export const TGT_KEYS: Key3[] = [
  { p: 0.0, v: [0, 25, 1300] },
  { p: 0.1, v: [0, 28, 1500] },
  { p: 0.7, v: [0, 30, 2225] },
];

/* ---------------- THE TURN (0.70 -> 0.85) ---------------- */
// One cubic-Bezier sweep of the look target from "down the deck" to
// "on the mark" — C-infinity smooth, so the 180° yaw has no keyframe
// hitches; the tween's sine.inOut makes it a deliberate turn-around.
// The arc swings through +X, staying ~700+ units from the camera the
// whole way (no lookAt singularity), and lands exactly on the mark.
export const TURN_P0 = 0.7;
export const TURN_P1 = 0.85;
export const TURN_BEZIER: [number, number, number][] = [
  [0, 30, 2225], // == TGT_KEYS end: continuous with the travel
  [950, 70, 1900], // swinging out to +X...
  [950, 50, 900], // ...abeam the camera...
  [0, 5, 0], // ...settling onto the mark.
];

/** Evaluate the turn Bezier at t (0..1). Pure — used by the timeline and by tests. */
export function turnTarget(t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t));
  const u = 1 - x;
  const [p0, p1, p2, p3] = TURN_BEZIER;
  return [
    u * u * u * p0[0] + 3 * u * u * x * p1[0] + 3 * u * x * x * p2[0] + x * x * x * p3[0],
    u * u * u * p0[1] + 3 * u * u * x * p1[1] + 3 * u * x * x * p2[1] + x * x * x * p3[1],
    u * u * u * p0[2] + 3 * u * u * x * p1[2] + 3 * u * x * x * p2[2] + x * x * x * p3[2],
  ];
}

/* ---------------- fog (FogExp2 density) ---------------- */
// 0.0005 keeps the +Z far end swallowed (infinite) during the travel;
// 0.00035 for the turn/hold so the bridge-to-logo read is clear.
export const FOG_KEYS: Key[] = [
  { p: 0.0, v: 0.0011 },
  { p: 0.1, v: 0.0005 },
  { p: 0.7, v: 0.0005 },
  { p: 0.85, v: 0.00035 },
];

/* ---------------- the world mark (no crossbar) ---------------- */
// logo-mark-no-crossbar.png is 464x423: logo-mark.png with the crossbar
// keyed to transparent (feathered). Crossbar fractions (measured, image
// space, y down from top): x 0.2586..0.8772, y 0.3073..0.4374.
const CB_FCX = (0.2586 + 0.8772) / 2; // 0.5679
const CB_FCY = (0.3073 + 0.4374) / 2; // 0.37235
const CB_FW = 0.8772 - 0.2586; // 0.6186

// The bridge IS the crossbar: crossbar world width == bridge width 130.
export const MARK_W = 130 / CB_FW;
export const MARK_H = (MARK_W * 423) / 464;
// Crossbar center lands exactly on the bridge axis (x=0, y=0): the
// bridge's slashed end plugs into the transparent crossbar slot.
export const MARK_X = (0.5 - CB_FCX) * MARK_W;
export const MARK_Y = (CB_FCY - 0.5) * MARK_H;
// 1 unit in front of the bridge's rearmost end corner (z=0): flush
// with the logo, no coplanar risk.
export const MARK_Z = -1;

// The logo was behind the camera the whole time; it fades in as the
// turn completes — "comes into view from behind the camera".
export const MARK_OPACITY_KEYS: Key[] = [
  { p: 0.0, v: 0 },
  { p: 0.7, v: 0 },
  { p: 0.82, v: 1 },
];
