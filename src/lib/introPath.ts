/**
 * The intro's 3D story as pure keyframe data — the single source of
 * truth for the timeline built in `three/intro.ts`. Everything is a
 * pure function of p (0..1), so scrolling up rewinds exactly.
 *
 * THE CONCEPT (Chris's words, 2026-09-23 + 2026-09-24):
 * "just remove the cross bar from that [logo asset] and replace it
 * with the bridge. Then it should come into view from behind the
 * camera and the end of the bridge should be at the same z increment
 * as the logo so that it gives the illusion that we started inside
 * of the logo."
 * "The camera starts on top of the bridge. It pulls back and zooms
 * out to reveal the logo"
 * "The reveal should end with the logo large and in charge. Right
 * before that though it should detail the bridge as the crossbar."
 * "The camera shouldn't raise up like it does." / "the camera should
 * move down and then the logo should appear" / "you should see the
 * end side of the bridge".
 *
 * The 3D bridge IS the logo's crossbar — a short solid bar, never a
 * road. The camera starts ON TOP of the bridge (on the deck — per his
 * drawing the camera dot sits on the deck, events 1-3 ride it through
 * infinite space). It pulls back and ZOOMS OUT (a real FOV widen, not
 * just a dolly) while the logo fades in around the bar — the bridge
 * detailing AS the crossbar, slashed end face visible, one continuous
 * object — then the zoom lands on the full mark LARGE in frame: the
 * logo, large and in charge. Then handoff.
 *
 * World layout:
 *   - Mark (logo-mark-no-crossbar.png, 464x423): vertical plane at
 *     z=-1, facing +Z. Crossbar center on the bridge axis (x=0, y=0).
 *   - Bridge: short solid trapezoid bar. Its logo end (rearmost corner
 *     of the slash) sits exactly at z=0 — the same z increment as the
 *     logo — extending +Z ~345. Width 130 = the crossbar's world
 *     width. The opaque mark occludes everything except through the
 *     transparent crossbar slot, so the bridge reads AS the crossbar.
 *
 * Beats:
 *   - 0 -> 0.18: ON TOP. Camera on the bridge deck, the grey surface
 *     filling the frame. Fog heavy, then resolving. A slow settle.
 *   - 0.18 -> 0.52: PULL BACK + ZOOM OUT. Dolly back and DOWN (never
 *     up) while the FOV widens 55 -> 70; the mark fades in 0.30 ->
 *     0.52. The slashed end face shows big — the bridge detailing as
 *     the crossbar — and the logo is revealed, medium-wide.
 *   - 0.52 -> 0.78: REVEAL. The camera holds its ground while the zoom
 *     lands: FOV narrows 70 -> 38, the full mark LARGE in frame (on
 *     narrow aspects the final FOV widens just enough to fit the mark
 *     width — see intro.ts). Hold 0.78 -> 0.86.
 *   - 0.86 -> 1.0: DOM handoff (canvas fades, hero reveals) — see
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

/* ---------------- camera ---------------- */
// ON TOP: p=0 has the camera on the bridge deck (top face ~y=32),
// looking along it into the dark — we started on the bridge, inside
// the logo. PULL BACK: dolly back and DOWN (y 46 -> 30 — the camera
// never rises) while the FOV zooms OUT 55 -> 70; the mark fades in
// around the bar. REVEAL: the camera holds while the FOV zooms back
// IN 70 -> 38 — the logo, large and in charge. x stays 0 throughout;
// the move is a straight, level retreat, and the path never
// intersects the bar (min clearance ~3.7 over the deck).
export const CAM_KEYS: Key3[] = [
  { p: 0.0, v: [0, 46, 70] },
  { p: 0.18, v: [0, 44, 110] },
  { p: 0.52, v: [0, 30, 430] },
  { p: 0.78, v: [0, 26, 430] },
  { p: 0.86, v: [0, 26, 430] },
];

// Look target: down the deck into the dark (on-top beat), then back
// at the bar leading into the faded-in mark (pull-back beat — the
// slashed near end faces the camera, detailing the bridge AS the
// crossbar), then the mark center for the large logo shot
// (reveal/hold).
export const TGT_KEYS: Key3[] = [
  { p: 0.0, v: [0, 24, 320] },
  { p: 0.18, v: [0, 26, 330] },
  { p: 0.52, v: [0, 0, 80] },
  { p: 0.78, v: [MARK_X, MARK_Y, MARK_Z] },
  { p: 0.86, v: [MARK_X, MARK_Y, MARK_Z] },
];

/* ---------------- zoom (FOV) ---------------- */
// A real zoom, not just a dolly. 55 on the deck (intimate) -> 70 as
// the camera pulls back (the zoom-OUT that reveals the logo) -> 38
// for the reveal (the zoom lands the logo large and in charge). The
// final value is widened at runtime on narrow aspects so the mark
// never crops — see intro.ts.
export const FOV_KEYS: Key[] = [
  { p: 0.0, v: 55 },
  { p: 0.18, v: 55 },
  { p: 0.52, v: 70 },
  { p: 0.78, v: 38 },
  { p: 0.86, v: 38 },
];

/* ---------------- fog (FogExp2 density) ---------------- */
// Opens heavy so the inside beat is a grey void that resolves; thins
// to 0.0003 so the detail and logo beats read crisp and solid.
export const FOG_KEYS: Key[] = [
  { p: 0.0, v: 0.0011 },
  { p: 0.18, v: 0.00045 },
  { p: 0.52, v: 0.0003 },
  { p: 0.78, v: 0.0003 },
];

/* ---------------- mark fade ---------------- */
// The logo comes into view as the camera moves down and back: it was
// there all along, unseen — the reveal that we started inside it.
export const MARK_OPACITY_KEYS: Key[] = [
  { p: 0.0, v: 0 },
  { p: 0.3, v: 0 },
  { p: 0.52, v: 1 },
];
