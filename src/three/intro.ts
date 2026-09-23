import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CAM_KEYS,
  TGT_KEYS,
  FOG_KEYS,
  MARK_OPACITY_KEYS,
  MARK_W,
  MARK_H,
  MARK_X,
  MARK_Y,
  MARK_Z,
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
 * THE CONCEPT (2026-09-23, Chris's words): "You should see the end side
 * of the bridge and the camera should move down and the. The logo
 * should appear."
 *
 * The intro OPENS directly on the 3D bridge — no logo opening, no
 * zoom-in. The logo appears only at the END, standing IN THE WORLD:
 * his mark fades in at the bridge's far end with its crossbar
 * continuing the bridge — the slashed far end plugs into the crossbar.
 * Then the handoff to the hero.
 *
 * THE BRIDGE (approved object, recreated natively): an elongated
 * parallelogram in plan view — constant width ~130, parallel slanted
 * ends (like the G crossbar's slashed end; like his sketch: ___ over
 * /___/), extruded ~52 thick with a small bevel for edge highlights.
 * Silver-grey chrome in the G's metal language. It spans z +1800
 * (near, always behind the camera) to z −2600 (far); exponential fog
 * swallows the far end = infinite depth. No furniture — the bare
 * approved object.
 *
 * Beats (all scroll-scrubbed, fully reversible — keyframes live in
 * `lib/introPath.ts`; the timeline below is built from them):
 *   - 0 -> 0.1: the grey-void resolve. The scene opens in heavy fog;
 *     the bridge materializes out of it.
 *   - 0 -> 0.60: THE BRIDGE. Backward dolly (0,95,520)->(0,140,1150),
 *     x=0, looking down the deck. Star streaks fire with scroll speed;
 *     the far end stays swallowed by fog — infinite.
 *   - 0.60 -> 0.75: THE END REVEALED. Travel continues; fog lifts so
 *     the far end face is clearly visible.
 *   - 0.75 -> 0.88: DESCEND. The camera moves DOWN (140->70) and eases
 *     toward the bridge end; the view flattens onto the end face. No
 *     rise, no swoop, no plunge.
 *   - 0.80 -> 0.92: THE LOGO APPEARS. His mark fades in standing at
 *     the far end — the bridge runs into its crossbar.
 *   - 0.92 -> 0.97: HOLD the line-up. 0.97 -> 1.0: the DOM handoff
 *     (canvas fades, hero reveals) — see IntroSequence.vue.
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
/* THE BRIDGE: a solid trapezoid slab in plan view — an elongated       */
/* parallelogram with parallel slanted ends (the G crossbar's slashed  */
/* end; Chris's ___ over /___/ sketch). Constant width ~130, thickness  */
/* ~52, beveled edges so the solid reads. Silver-grey chrome in the     */
/* G's metal language. z +1800 (near, always behind the camera) →      */
/* −2600 (far, swallowed by fog = infinite depth). No furniture —       */
/* the bare approved object.                                           */
/* ------------------------------------------------------------------ */

const BRIDGE_W = 130;
const BRIDGE_T = 52;
const BRIDGE_Z_NEAR = 1800; // camera's furthest z is 1650: the near end stays behind it
const BRIDGE_Z_FAR = -2600; // the far end melts into fog
const BRIDGE_SLANT = 90; // end-cut offset across the width: the two slashes stay parallel
const BRIDGE_BEVEL = 6;

function makeBridgeGeometry(): THREE.ExtrudeGeometry {
  // Shape space: x = width, y = −z (rotateX(−90°) maps shape +Y to
  // world −Z, and the extrusion +Z to world +Y = thickness).
  const hw = BRIDGE_W / 2;
  const s = new THREE.Shape();
  s.moveTo(-hw, -(BRIDGE_Z_NEAR + BRIDGE_SLANT));
  s.lineTo(hw, -(BRIDGE_Z_NEAR - BRIDGE_SLANT));
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
  // Exponential fog is the "infinite depth" mechanism: the far end of
  // the deck (z ≈ −2600, ~3000–4300 units out) melts into the void while
  // the near/mid deck stays clear and solid. It opens heavy (a grey
  // void) and resolves over the first beat of scroll.
  const fog = new THREE.FogExp2(0x05070b, 0.0011);
  scene.fog = fog;

  // Image-based lighting so the chrome has something to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(
    58,
    window.innerWidth / window.innerHeight,
    0.5,
    12000,
  );
  // p=0: slightly above the deck, looking down its length into the dark.
  // The deck runs under/behind the camera (near end z≈1710–1890) and
  // fills the lower frame as a perspective wedge to a centered
  // vanishing point.
  camera.position.set(0, 95, 520);

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
  // Far behind the world mark (z=-2740) so it never washes over the logo.
  haze.position.set(0, 150, -2950);
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

  // ---------- THE WORLD MARK ----------
  // His actual mark, standing IN THE WORLD at the bridge's far end —
  // vertical, facing the camera (+Z). Its crossbar is centered exactly
  // on the bridge axis (x=0, y=0; see lib/introPath.ts), so the slashed
  // far end plugs into the middle of the crossbar: the bridge RUNS INTO
  // the logo. Monumental (840 wide vs the 130-wide deck) so the
  // crossbar reads clearly at the hold (~7° wide). fog:false +
  // toneMapped:false keep his asset pixel-true. It fades in on the
  // timeline (0.80 -> 0.92); scrubbing back fades it out again.
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
    '/logo-mark.png',
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
    starPos.push(randomIn(-1100, 1100), randomIn(-150, 750), randomIn(-2700, 1600));
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
    shimmerPos[i * 3 + 2] = randomIn(-2400, 400);
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
      z: randomIn(-2700, 1600),
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
  const lookTarget = new THREE.Vector3(0, 25, -700);

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
  // Pad the timeline to a duration of exactly 1: setProgress(p) maps
  // scroll progress onto tl.progress(p), i.e. time = p * duration — so
  // the keyframe p values above only mean scroll-p when duration is 1.
  // The end pose simply holds through the handoff beat.
  tl.to({}, { duration: 0.08 }, 0.92);

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

    if (visible && !document.hidden) {
      renderer.render(scene, camera);
    }
  };
  tick();

  // ---------- resize ----------
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
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
