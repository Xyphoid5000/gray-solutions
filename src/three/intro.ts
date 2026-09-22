import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * The Gray Solutions scroll-driven cinematic intro.
 *
 * The concept, per Chris: the logo is INFINITELY DEEP, but only the
 * middle bar exists in 3D. The scene holds exactly two things — an
 * endless chrome beam, and a giant chrome "G" whose crossbar the beam
 * IS. You start sitting ON the beam, deep inside the G's space; the
 * camera only ever dollies straight back and up (pure translation, one
 * fixed lookAt — no rotation, no arcs). Fog starts dense so the G is
 * fully hidden, then lifts: the G's top arch comes into view first,
 * then its side, as one monumental chrome sculpture.
 *
 * The hero lives INSIDE the intro's sticky stage behind the canvas for
 * the whole sequence (see IntroSequence.vue) — at the end the canvas
 * fades and the hero is revealed in place. You started inside it.
 *
 * Division of labor:
 *   - Three.js owns the WORLD: the beam, the G, camera, fog, stars.
 *   - GSAP owns the STORY — but as a PAUSED, scroll-scrubbed timeline.
 *     `setProgress(p)` maps scroll progress 0→1 onto the timeline, so
 *     the whole sequence is fully reversible: scrolling up rewinds the
 *     camera exactly. The DOM (hero, phrases, progress bar, vignette)
 *     is choreographed separately in IntroSequence.vue from the same
 *     scroll position.
 */

export interface IntroSceneCallbacks {
  /** Called with the current energy-flash level (0..1); drive a DOM overlay. */
  onFlashLevel?: (v: number) => void;
  /** Called with the vignette level (0..1); strong at p=0, gone by p≈0.35. */
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

/**
 * The G: a bold geometric arch with a clean gap on the right side.
 * Outer arc radius 115, inner counter radius 72 — the opening spans
 * ±0.7 rad (≈ ±40°) around +X, closed by straight chords so the ends
 * read as flat terminals. Extruded ~34 deep with a small bevel.
 *
 * NOTE: this letterform is an interpretation of the mark's anatomy —
 * the beam passing through its middle is the G's crossbar.
 */
function makeGShape(): THREE.Shape {
  const R = 115;
  const r = 72;
  const gap = 0.7;
  const shape = new THREE.Shape();
  // Clockwise from -gap the LONG way round to +gap: the arc wraps the
  // left, top, and bottom, leaving the opening on the right.
  shape.absarc(0, 0, R, -gap, gap, true);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, r, -gap, gap, true);
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

/** The one fixed lookAt for the entire journey. Never animated. */
const LOOK_AT = new THREE.Vector3(0, 10, 0);

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
  // Fog starts DENSE — the G is fully hidden at p=0 — and the timeline
  // lifts it to near-clear by p=1. Driven by the timeline so scrubbing
  // backwards re-fogs the G exactly.
  const fog = new THREE.FogExp2(0x05070b, 0.035);
  scene.fog = fog;

  // Image-based lighting so the chrome has something to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(
    58,
    window.innerWidth / window.innerHeight,
    0.5,
    5000,
  );
  // p=0: sitting ON the beam (top surface y=15), ~7 units above it,
  // deep inside the G's ring — the beam fills the frame and runs to
  // vanishing points. From here the camera ONLY dollies back and up.
  camera.position.set(26, 22, 14);

  // ---------- lights ----------
  scene.add(new THREE.AmbientLight(0x223044, 0.9));

  const key = new THREE.DirectionalLight(0xe8f0ff, 1.2);
  key.position.set(-120, 200, 260);
  scene.add(key);

  const rim = new THREE.PointLight(0x2f9bff, 1500, 700, 1.8);
  rim.position.set(80, 60, 140);
  scene.add(rim);

  // ---------- atmospheric haze, behind the G ----------
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 900),
    new THREE.MeshBasicMaterial({
      map: makeHazeTexture(),
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  haze.position.set(0, 60, -620);
  scene.add(haze);

  // ---------- stars + glints ----------
  const starGeo = new THREE.BufferGeometry();
  const starPos: number[] = [];
  for (let i = 0; i < 1500; i++) {
    starPos.push(randomIn(-900, 900), randomIn(-250, 600), randomIn(-900, 700));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0x93a7c4,
    size: 1.15,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    fog: false,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  const glintGeo = new THREE.BufferGeometry();
  const glintPos: number[] = [];
  for (let i = 0; i < 80; i++) {
    glintPos.push(randomIn(-700, 700), randomIn(-200, 500), randomIn(-800, 500));
  }
  glintGeo.setAttribute('position', new THREE.Float32BufferAttribute(glintPos, 3));
  const glintMat = new THREE.PointsMaterial({
    color: 0xcfe6ff,
    size: 3.4,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  scene.add(new THREE.Points(glintGeo, glintMat));

  // ---------- the chrome: one material, one sculpture ----------
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f9,
    metalness: 1.0,
    roughness: 0.22,
    envMapIntensity: 1.0,
  });

  // The infinite beam: the middle bar, running to ±X infinity. The beam
  // IS the G's crossbar. Top surface at y=15.
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3000, 30, 24), chromeMat);
  beam.position.set(0, 0, 0);
  scene.add(beam);

  // The G: the beam passes through its middle as the crossbar. Same
  // chrome, so beam + G read as one monumental sculpture.
  const gGeo = new THREE.ExtrudeGeometry(makeGShape(), {
    depth: 34,
    bevelEnabled: true,
    bevelThickness: 4,
    bevelSize: 4,
    bevelSegments: 3,
    curveSegments: 96,
  });
  gGeo.center();
  const gMesh = new THREE.Mesh(gGeo, chromeMat);
  gMesh.position.set(0, 0, 0);
  scene.add(gMesh);

  // ---------- energy burst (deterministic: fully reversible under scrub) ----------
  const BURST_N = 220;
  const burstGeo = new THREE.BufferGeometry();
  const burstBase = new Float32Array(BURST_N * 3);
  const burstVel: number[] = [];
  for (let i = 0; i < BURST_N; i++) {
    burstBase[i * 3] = 0;
    burstBase[i * 3 + 1] = 20;
    burstBase[i * 3 + 2] = 0;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(randomIn(-1, 1));
    const speed = randomIn(6, 26);
    burstVel.push(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      Math.cos(phi) * speed,
    );
  }
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstBase.slice(), 3));
  const burstMat = new THREE.PointsMaterial({
    color: 0x9fd4ff,
    size: 1.7,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(burstGeo, burstMat));
  const burstState = { t: 0 };

  // ---------- THE STORY: one paused timeline, scrubbed by scroll ----------
  // Normalized duration 1. The camera moves by PURE TRANSLATION only —
  // no lookAt changes, no arcs, no roll. Distances from the fixed
  // lookAt (0,10,0): ~32 → ~116 → ~274 → ~461 — strictly increasing.
  //
  // Phase 1 (0→0.35): slow drift back and up, still tight on the beam;
  // the G stays fully fogged.
  // Phase 2 (0.35→0.7): the fog lifts — the G's top arch comes into
  // view first, then its side.
  // Phase 3 (0.7→1): FAST accelerating pullback — power3.in so the
  // motion rushes outward into the wide shot of the chrome G.
  const tl = gsap.timeline({ paused: true });
  const camPos = camera.position;
  const fx = { flash: 0 };

  tl.to(camPos, { x: 10, y: 45, z: 110, duration: 0.35, ease: 'sine.inOut' }, 0);
  tl.to(fog, { density: 0.016, duration: 0.35, ease: 'sine.inOut' }, 0);

  tl.to(camPos, { x: -30, y: 90, z: 260, duration: 0.35, ease: 'power2.inOut' }, 0.35);
  tl.to(fog, { density: 0.007, duration: 0.2, ease: 'sine.inOut' }, 0.35);
  tl.to(fog, { density: 0.0022, duration: 0.15, ease: 'sine.inOut' }, 0.55);

  tl.to(camPos, { x: -70, y: 160, z: 430, duration: 0.3, ease: 'power3.in' }, 0.7);
  tl.to(fog, { density: 0.0006, duration: 0.3, ease: 'power1.in' }, 0.7);

  // Restrained energy release as the G resolves through the fog.
  tl.to(burstMat, { opacity: 0.9, duration: 0.012 }, 0.8);
  tl.to(burstState, { t: 1, duration: 0.06, ease: 'power2.out' }, 0.8);
  tl.to(burstMat, { opacity: 0, duration: 0.06, ease: 'sine.in' }, 0.8);
  tl.to(fx, { flash: 0.9, duration: 0.018, ease: 'power1.in' }, 0.81);
  tl.to(fx, { flash: 0, duration: 0.03, ease: 'power1.out' }, 0.828);

  // ---------- render loop ----------
  const clock = new THREE.Clock();
  let elapsed = 0;
  let raf = 0;
  let visible = true;
  let disposed = false;
  let lastFlash = -1;
  let lastVignette = -1;

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

  const tick = () => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    // Occasional glints shimmer.
    glintMat.opacity = Math.max(0, 0.25 + Math.sin(elapsed * 1.7) * 0.12);

    // Deterministic burst: position is a pure function of timeline state,
    // so scrubbing backwards rewinds the particles exactly.
    if (burstState.t > 0) {
      const pos = burstGeo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const spread = easeOutCubic(burstState.t) * 40;
      for (let i = 0; i < BURST_N; i++) {
        arr[i * 3] = burstBase[i * 3] + burstVel[i * 3] * spread * 0.12;
        arr[i * 3 + 1] = burstBase[i * 3 + 1] + burstVel[i * 3 + 1] * spread * 0.12;
        arr[i * 3 + 2] = burstBase[i * 3 + 2] + burstVel[i * 3 + 2] * spread * 0.12;
      }
      pos.needsUpdate = true;
    }

    // Flash level → DOM overlay (write only when it changes).
    if (cb.onFlashLevel && Math.abs(fx.flash - lastFlash) > 0.002) {
      lastFlash = fx.flash;
      cb.onFlashLevel(fx.flash);
    }

    // Vignette: a pure function of timeline progress — strong at p=0 so
    // the frame edges dissolve to black (only the beam + stars visible),
    // fully gone by p≈0.35. Deterministic and reversible under scrub.
    if (cb.onVignetteLevel) {
      const v = clamp01((0.35 - tl.progress()) / 0.35);
      if (Math.abs(v - lastVignette) > 0.002) {
        lastVignette = v;
        cb.onVignetteLevel(v);
      }
    }

    // The one fixed lookAt — the camera never rotates on its own.
    camera.lookAt(LOOK_AT);

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
