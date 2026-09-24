import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CAM_KEYS,
  TGT_KEYS,
  FOV_KEYS,
  FOG_KEYS,
  MARK_OPACITY_KEYS,
  MARK_W,
  MARK_H,
  MARK_X,
  MARK_Y,
  MARK_Z,
  sampleKeys,
  type Key,
  type Key3,
} from '../lib/introPath';

/**
 * Stars, motion streaks, and the environmental shimmer are ON (per Chris,
 * 2026-09-23): "you can add the starts and environmental shimmers back in".
 * Set to false to park them again. Nothing was deleted.
 */
const SHOW_STARS = true;

/**
 * The Gray Solutions scroll-driven cinematic intro.
 *
 * THE CONCEPT (Chris's words, 2026-09-23 + 2026-09-24): "just remove
 * the cross bar from that [logo asset] and replace it with the bridge.
 * Then it should come into view from behind the camera and the end of
 * the bridge should be at the same z increment as the logo so that it
 * gives the illusion that we started inside of the logo." / "The reveal
 * should end with the logo large and in charge. Right before that
 * though it should detail the bridge as the crossbar." / "The camera
 * starts on top of the bridge. It pulls back and zooms out to reveal
 * the logo" / "The camera shouldn't raise up" — "the camera should
 * move down and then the logo should appear" — "you should see the
 * end side of the bridge".
 *
 * The 3D bridge IS the logo's crossbar — a short solid bar, never a
 * road. The camera starts ON TOP of it (on the deck — per his drawing
 * the camera dot sits on the deck), pulls back and ZOOMS OUT (a real
 * FOV widen) while the logo fades in around the bar — the bridge
 * detailing AS the crossbar, slashed end face visible, one continuous
 * object — then the zoom lands on the full mark LARGE in frame. Then
 * handoff.
 *
 * THE BRIDGE (approved object, recreated natively): an elongated
 * parallelogram in plan view — constant width ~130, parallel slanted
 * ends (like the G crossbar's slashed end; like his sketch: ___ over
 * /___/), extruded ~52 thick with a small bevel for edge highlights.
 * Silver-grey chrome in the G's metal language. It spans z 0 (the logo
 * end — rearmost corner of the slash exactly at z=0, flush with the
 * mark at z=-1) to z ~345 (+Z). Short on purpose — a crossbar, not a
 * road. No furniture — the bare approved object.
 *
 * Beats (all scroll-scrubbed, fully reversible — keyframes live in
 * `lib/introPath.ts`; the timeline below is built from them):
 *   - 0 -> 0.18: ON TOP. Camera on the deck, grey fills the frame;
 *     the fog resolves.
 *   - 0.18 -> 0.52: PULL BACK + ZOOM OUT. Dolly back and DOWN (never
 *     up) while the FOV widens 55 -> 70; the mark fades in. The
 *     slashed end face shows big — the bridge detailing as the
 *     crossbar.
 *   - 0.52 -> 0.78: REVEAL. The camera holds while the FOV narrows
 *     70 -> 38: the full mark, LARGE in frame. Hold through 0.86.
 *   - 0.86 -> 1.0: the DOM handoff (canvas fades, hero reveals)
 *     — see IntroSequence.vue.
 *
 * Division of labor:
 *   - Three.js owns the WORLD: the bridge, the world mark, stars,
 *     streaks, shimmer, camera, fog, lights. Just the world.
 *   - GSAP owns the STORY — a PAUSED, scroll-scrubbed timeline.
 *     `setProgress(p)` maps scroll progress 0->1 onto the timeline, so
 *     the whole sequence is fully reversible: scrolling up rewinds
 *     everything exactly. The DOM (hero, progress bar, vignette,
 *     handoff) is choreographed separately in IntroSequence.vue from
 *     the same scroll position.
 *
 * Restrained by design: one object, fog, light, stars. Nothing else.
 */

export interface IntroSceneCallbacks {
  /** Called with the vignette level (0..1); strong at p=0, gone by p≈0.4. */
  onVignetteLevel?: (v: number) => void;
}

export interface IntroSceneHandle {
  /** Drive the story. p is raw scroll progress, clamped to 0..1. */
  setProgress: (p: number) => void;
  /** Pause/resume rendering (e.g. when the canvas has faded out). */
  setVisible: (v: boolean) => void;
  dispose: () => void;
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}

/** Faint blue-gray atmospheric gradient far behind the world. */
function makeHazeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  const g = ctx.createRadialGradient(256, 200, 10, 256, 200, 260);
  g.addColorStop(0, 'rgba(70, 100, 150, 0.30)');
  g.addColorStop(0.5, 'rgba(50, 75, 115, 0.12)');
  g.addColorStop(1, 'rgba(40, 60, 95, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function randomIn(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/* ------------------------------------------------------------------ */
/* THE BRIDGE: a solid trapezoid bar in plan view — a parallelogram     */
/* with parallel slanted ends (the G crossbar's slashed end; Chris's    */
/* ___ over /___/ sketch). Constant width ~130, thickness ~52, beveled  */
/* edges so the solid reads. Silver-grey chrome in the G's metal        */
/* language. It IS the logo's crossbar: z 0 (the LOGO end — rearmost    */
/* corner of the slash exactly at z=0, flush with the mark at z=-1) →   */
/* z ~345. Short on purpose — a crossbar, not a road. No furniture —   */
/* the bare approved object.                                            */
/* ------------------------------------------------------------------ */

const BRIDGE_W = 130;
const BRIDGE_T = 52;
const BRIDGE_Z_LOGO = 45; // rearmost corner of the logo-end slash lands at z=0
const BRIDGE_Z_FAR = 300; // the near end: the bar is a crossbar, not a road
const BRIDGE_SLANT = 45; // end-cut offset across the width: the two slashes stay parallel
const BRIDGE_BEVEL = 6;

function makeBridgeGeometry(): THREE.ExtrudeGeometry {
  // Shape space: x = width, y = −z (rotateX(−90°) maps shape +Y to
  // world −Z, and the extrusion +Z to world +Y = thickness).
  const hw = BRIDGE_W / 2;
  const s = new THREE.Shape();
  s.moveTo(-hw, -(BRIDGE_Z_LOGO + BRIDGE_SLANT));
  s.lineTo(hw, -(BRIDGE_Z_LOGO - BRIDGE_SLANT));
  s.lineTo(hw, -(BRIDGE_Z_FAR - BRIDGE_SLANT));
  s.lineTo(-hw, -(BRIDGE_Z_FAR + BRIDGE_SLANT));
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: BRIDGE_T,
    bevelEnabled: true,
    bevelThickness: BRIDGE_BEVEL,
    bevelSize: BRIDGE_BEVEL,
    bevelSegments: 3,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -BRIDGE_T / 2, 0); // center the thickness on y=0
  return geo;
}

export function startIntroScene(
  canvas: HTMLCanvasElement,
  cb: IntroSceneCallbacks = {},
): IntroSceneHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });

  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x05070b, 1);

  const scene = new THREE.Scene();
  // Exponential fog is the depth cue: it opens heavy (a grey void for
  // the inside beat) and resolves as the camera pulls back, so the
  // detail and logo beats read crisp while the void stays black.
  const fog = new THREE.FogExp2(0x05070b, 0.0011);
  scene.fog = fog;

  // Image-based lighting so the chrome has something to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.5,
    12000,
  );
  // p=0: ON TOP of the bridge — on the deck (top face ~y=32), looking
  // along it into the dark. We started on the bridge, inside the logo:
  // the deck fills the frame as a grey wedge.
  camera.position.set(0, 46, 70);

  // ---------- lights ----------
  // Dark-space studio: a strong key rakes across the deck so the top
  // face sheens and the side/thickness faces fall darker — the solid
  // reads. A cool rim + fill keeps the silver from going flat black.
  scene.add(new THREE.AmbientLight(0x2a3648, 1.1));

  const key = new THREE.DirectionalLight(0xf2f6ff, 3.0);
  key.position.set(-500, 700, 900);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x9fc0ff, 1.2);
  fill.position.set(600, 200, 700);
  scene.add(fill);

  const rim = new THREE.PointLight(0x2f9bff, 3000, 1600, 1.8);
  rim.position.set(400, 200, 600);
  scene.add(rim);

  // ---------- atmospheric haze, far behind the world ----------
  const hazeMat = new THREE.MeshBasicMaterial({
    map: makeHazeTexture(),
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(3200, 1600), hazeMat);
  // Behind the world mark (z=-1) so it backlights the logo during the
  // detail and reveal beats without ever washing over it.
  haze.position.set(0, 150, -500);
  scene.add(haze);

  // ---------- material ----------
  // Silver-grey chrome in the G's metal language: bright base, full
  // metalness, moderate roughness, hot env. One material — the bridge
  // is one solid cast piece, visible from frame one.
  const bridgeMat = new THREE.MeshStandardMaterial({
    color: 0xbcc2cc,
    metalness: 1.0,
    roughness: 0.3,
    envMapIntensity: 1.6,
  });

  // ---------- THE BRIDGE ----------
  const bridge = new THREE.Mesh(makeBridgeGeometry(), bridgeMat);
  scene.add(bridge);

  // ---------- THE WORLD MARK (no crossbar) ----------
  // His actual mark with the crossbar keyed to transparent, standing IN
  // THE WORLD at z=-1 — vertical, facing the camera (+Z). The 3D bridge
  // IS the crossbar: the bridge's slashed end (rearmost corner z=0)
  // plugs into the transparent crossbar slot, whose center sits exactly
  // on the bridge axis (x=0, y=0; see lib/introPath.ts). The opaque mark
  // occludes the deck everywhere except through the slot — the bridge
  // reads AS the crossbar. fog:false + toneMapped:false keep his asset
  // pixel-true. It fades in during the detail beat (0.30 -> 0.52) — the
  // logo comes into view as the camera moves down and back; scrubbing
  // back fades it out again.
  const markMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    fog: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const markMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(MARK_W, MARK_H),
    markMat,
  );
  markMesh.position.set(MARK_X, MARK_Y, MARK_Z);
  markMesh.visible = false; // shown once the texture arrives
  markMesh.renderOrder = 2;
  scene.add(markMesh);
  new THREE.TextureLoader().load(
    '/logo-mark-no-crossbar.png',
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      markMat.map = tex;
      markMat.needsUpdate = true;
      markMesh.visible = true;
    },
    undefined,
    () => {
      // Texture failed: leave the mark hidden; the intro still works.
    },
  );

  // ---------- stars: twinkle always, STREAK on scroll (beat 2) ----------
  const starGeo = new THREE.BufferGeometry();
  const starPos: number[] = [];
  for (let i = 0; i < 1200; i++) {
    starPos.push(randomIn(-1100, 1100), randomIn(-150, 750), randomIn(-300, 5000));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0x93a7c4,
    size: 1.8,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  stars.visible = SHOW_STARS; // parked (see SHOW_STARS)
  scene.add(stars);

  // Distant shimmer toward the horizon (twinkle only, ambient).
  const SHIMMER_N = 700;
  const shimmerGeo = new THREE.BufferGeometry();
  const shimmerPos = new Float32Array(SHIMMER_N * 3);
  const shimmerPhase = new Float32Array(SHIMMER_N);
  for (let i = 0; i < SHIMMER_N; i++) {
    shimmerPos[i * 3] = randomIn(-800, 800);
    shimmerPos[i * 3 + 1] = randomIn(-80, 420);
    shimmerPos[i * 3 + 2] = randomIn(-200, 4800);
    shimmerPhase[i] = Math.random() * Math.PI * 2;
  }
  shimmerGeo.setAttribute('position', new THREE.BufferAttribute(shimmerPos, 3));
  shimmerGeo.setAttribute('aPhase', new THREE.BufferAttribute(shimmerPhase, 1));
  const shimmerMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFade: { value: 1 },
      uColor: { value: new THREE.Color(0xbfe0ff) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aPhase;
      uniform float uTime;
      varying float vTw;
      void main() {
        vTw = 0.5 + 0.5 * sin(uTime * 2.2 + aPhase);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float px = (2.0 + 3.0 * vTw) * (340.0 / -mv.z);
        gl_PointSize = min(px, 20.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uFade;
      varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * (0.12 + 0.88 * vTw) * uFade;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  const shimmer = new THREE.Points(shimmerGeo, shimmerMat);
  shimmer.frustumCulled = false;
  shimmer.visible = SHOW_STARS; // parked (see SHOW_STARS)
  scene.add(shimmer);

  // Motion streaks: line segments stretched along the camera's velocity
  // vector, length + opacity scaled by scroll speed. At rest they vanish
  // and only the twinkle remains — exactly the storyboard's beat 2.
  const STREAK_N = 300;
  const streakPos = new Float32Array(STREAK_N * 6);
  const streakBase: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < STREAK_N; i++) {
    streakBase.push({
      x: randomIn(-1100, 1100),
      y: randomIn(-150, 750),
      z: randomIn(-300, 5000),
    });
  }
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3));
  const streakMat = new THREE.LineBasicMaterial({
    color: 0xaac8ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const streaks = new THREE.LineSegments(streakGeo, streakMat);
  streaks.frustumCulled = false;
  streaks.visible = SHOW_STARS; // parked (see SHOW_STARS)
  scene.add(streaks);

  // ---------- THE STORY: one paused timeline, scrubbed by scroll ----------
  // Built from the keyframe tables in lib/introPath.ts — every channel
  // is a pure function of p, so scrolling up rewinds the camera, the
  // fog, and the mark exactly.
  const lookTarget = new THREE.Vector3(0, 26, 280);

  const tl = gsap.timeline({ paused: true });
  const cp = camera.position;

  /** One tween per keyframe segment, laid at its absolute position. */
  function channel3(
    target: { x: number; y: number; z: number },
    keys: Key3[],
  ): void {
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1];
      const b = keys[i];
      tl.to(
        target,
        {
          x: b.v[0],
          y: b.v[1],
          z: b.v[2],
          duration: b.p - a.p,
          ease: 'sine.inOut',
        },
        a.p,
      );
    }
  }
  function channel1(target: object, prop: string, keys: Key[]): void {
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1];
      const b = keys[i];
      tl.to(
        target,
        { [prop]: b.v, duration: b.p - a.p, ease: 'sine.inOut' },
        a.p,
      );
    }
  }

  channel3(cp, CAM_KEYS);
  channel3(lookTarget, TGT_KEYS);
  channel1(fog, 'density', FOG_KEYS);
  channel1(markMat, 'opacity', MARK_OPACITY_KEYS);
  // The zoom is a real FOV move, not just a dolly — sampled per-frame
  // from the keyframe table so it stays a pure function of scroll
  // progress (fully reversible) and tracks resizes. 55 on the deck ->
  // 70 as the camera pulls back (the zoom-OUT that reveals the logo)
  // -> ~38 for the reveal (the zoom lands the logo large and in
  // charge). Portrait safety: on narrow aspects the final FOV widens
  // just enough that the full mark width fits instead of cropping —
  // the 2026-09-23 portrait lesson.
  const buildFovKeys = (aspect: number): Key[] => {
    const revealDist = 430 - MARK_Z;
    const fitFov =
      (2 * Math.atan(MARK_W / 0.85 / (2 * revealDist * aspect)) * 180) /
      Math.PI;
    const finalFov = Math.max(38, fitFov);
    return FOV_KEYS.map((k) => (k.p >= 0.78 ? { ...k, v: finalFov } : k));
  };
  let fovKeys = buildFovKeys(camera.aspect);
  // Pad the timeline to a duration of exactly 1: setProgress(p) maps
  // scroll progress onto tl.progress(p), i.e. time = p * duration — so
  // the keyframe p values above only mean scroll-p when duration is 1.
  // The end pose simply holds through the handoff beat.
  tl.to({}, { duration: 0.14 }, 0.86);

  // ---------- render loop ----------
  const clock = new THREE.Clock();
  let elapsed = 0;
  let raf = 0;
  let visible = true;
  let disposed = false;
  let lastVignette = -1;

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const prevCamPos = camera.position.clone();
  const camVel = new THREE.Vector3();
  let smoothSpeed = 0;

  const tick = () => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    // Ambient shimmer twinkle (time-driven; the story stays scroll-driven).
    if (SHOW_STARS) {
      (shimmerMat.uniforms.uTime as { value: number }).value = elapsed;
    }

    // Star streaks: stretch along the camera's velocity vector, scaled by
    // scroll speed. Still camera -> no streaks, twinkle only.
    if (SHOW_STARS) {
      camVel.copy(camera.position).sub(prevCamPos).divideScalar(Math.max(dt, 1e-4));
      prevCamPos.copy(camera.position);
      const speed = camVel.length();
      smoothSpeed += (speed - smoothSpeed) * Math.min(1, dt * 5);
      const streakLen = Math.min(120, smoothSpeed * 0.5);
      const sOp = Math.min(0.85, smoothSpeed / 450);
      streakMat.opacity = sOp;
      if (streakLen > 0.05 && smoothSpeed > 1e-3) {
        const dx = (camVel.x / speed) * streakLen;
        const dy = (camVel.y / speed) * streakLen;
        const dz = (camVel.z / speed) * streakLen;
        for (let i = 0; i < STREAK_N; i++) {
          const b = streakBase[i];
          const o = i * 6;
          streakPos[o] = b.x;
          streakPos[o + 1] = b.y;
          streakPos[o + 2] = b.z;
          streakPos[o + 3] = b.x - dx;
          streakPos[o + 4] = b.y - dy;
          streakPos[o + 5] = b.z - dz;
        }
        (streakGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }
    }

    // Vignette: strong at p=0 so the frame edges dissolve to black,
    // gone by p≈0.4. Deterministic and reversible under scrub.
    if (cb.onVignetteLevel) {
      const v = clamp01((0.4 - tl.progress()) / 0.4);
      if (Math.abs(v - lastVignette) > 0.002) {
        lastVignette = v;
        cb.onVignetteLevel(v);
      }
    }

    camera.lookAt(lookTarget);

    // The zoom: push the sampled FOV into the camera whenever the
    // story changes it.
    const fovNow = sampleKeys(fovKeys, tl.progress());
    if (camera.fov !== fovNow) {
      camera.fov = fovNow;
      camera.updateProjectionMatrix();
    }

    if (visible && !document.hidden) {
      renderer.render(scene, camera);
    }
  };
  tick();

  // ---------- resize ----------
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    fovKeys = buildFovKeys(camera.aspect);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  window.addEventListener('resize', onResize);

  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    tl.kill();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else if (material) {
        material.dispose();
      }
    });
    envTex.dispose();
    pmrem.dispose();
    renderer.dispose();
  };

  return {
    setProgress: (p: number) => {
      tl.progress(Math.min(1, Math.max(0, p)));
    },
    setVisible: (v: boolean) => {
      visible = v;
    },
    dispose,
  };
}
