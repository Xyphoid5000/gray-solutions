import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * The Gray Solutions scroll-driven cinematic intro.
 *
 * Chris's confirmed vision (2026-09-23): a Three.js BRIDGE-based
 * sequence. The viewer starts sitting in 3D space above an INFINITE
 * BRIDGE, with distant shimmer/sparkle effects. A tunnel-like element
 * forms part of the grey "G"; the "S" is blue chrome. The bridge deck
 * threads straight through the G's tunnel bore as its endlessly deep
 * middle bar — you start on the bar, deep inside the logo's space.
 *
 * Scroll choreography: the camera ONLY dollies straight back and up
 * (pure translation, one fixed lookAt — no rotation, no arcs, no
 * lateral drift). Fog starts dense so the G is fully hidden, then
 * lifts: the G's top arch comes into view first, then its side, as one
 * monumental chrome sculpture beside its blue S.
 *
 * The hero lives INSIDE the intro's sticky stage behind the canvas for
 * the whole sequence (see IntroSequence.vue) — at the end the canvas
 * fades and the hero is revealed in place. You started inside it.
 *
 * Division of labor:
 *   - Three.js owns the WORLD: bridge, G, S, camera, fog, sparkles.
 *   - GSAP owns the STORY — but as a PAUSED, scroll-scrubbed timeline.
 *     `setProgress(p)` maps scroll progress 0→1 onto the timeline, so
 *     the whole sequence is fully reversible: scrolling up rewinds the
 *     camera exactly. The DOM (hero, phrases, progress bar, vignette)
 *     is choreographed separately in IntroSequence.vue from the same
 *     scroll position.
 *
 * NOTE: the G and S letterforms are hand-authored 3D interpretations
 * of the mark's anatomy — Chris's supplied logo is the source of
 * truth for the real brand assets.
 */

export interface IntroSceneCallbacks {
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
 * Outer radius 150, inner counter radius 95 — the opening spans ±0.7
 * rad (≈ ±40°) around +X. Extruded 100 deep: the counter becomes a
 * genuine tunnel bore, and the bridge deck threads straight through
 * it. A luminous ring liner sits inside the bore so the opening reads
 * as a tunnel mouth, not a flat hole.
 */
function makeGShape(): THREE.Shape {
  const R = 150;
  const r = 95;
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

/** The blue S: a smooth tube swept along an S centerline. */
function makeSGeometry(): THREE.TubeGeometry {
  const pts = [
    new THREE.Vector3(38, 72, 0),
    new THREE.Vector3(8, 80, 0),
    new THREE.Vector3(-30, 68, 0),
    new THREE.Vector3(-42, 40, 0),
    new THREE.Vector3(-30, 12, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(30, -12, 0),
    new THREE.Vector3(42, -40, 0),
    new THREE.Vector3(30, -68, 0),
    new THREE.Vector3(8, -80, 0),
    new THREE.Vector3(-38, -72, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, 72, 15, 20, false);
}

/** The one fixed lookAt for the entire journey. Never animated. */
const LOOK_AT = new THREE.Vector3(0, 60, -180);

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
  const fog = new THREE.FogExp2(0x05070b, 0.03);
  scene.fog = fog;

  // Image-based lighting so the chrome has something to reflect.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(
    58,
    window.innerWidth / window.innerHeight,
    0.5,
    9000,
  );
  // p=0: sitting in 3D space just above the infinite bridge deck
  // (top surface y=0), deep inside the logo's space with the G's
  // tunnel looming ahead, fully fogged. From here the camera ONLY
  // dollies straight back and up.
  camera.position.set(0, 9, 60);

  // ---------- lights ----------
  scene.add(new THREE.AmbientLight(0x223044, 0.9));

  const key = new THREE.DirectionalLight(0xe8f0ff, 1.2);
  key.position.set(-160, 260, 320);
  scene.add(key);

  const rim = new THREE.PointLight(0x2f9bff, 2200, 900, 1.8);
  rim.position.set(260, 130, 120);
  scene.add(rim);

  // Cool glow inside the G's tunnel bore.
  const tunnelGlow = new THREE.PointLight(0x2f9bff, 1800, 520, 1.8);
  tunnelGlow.position.set(0, 70, -180);
  scene.add(tunnelGlow);

  // ---------- atmospheric haze, far behind the G ----------
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 1200),
    new THREE.MeshBasicMaterial({
      map: makeHazeTexture(),
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  haze.position.set(0, 120, -1100);
  scene.add(haze);

  // ---------- stars ----------
  const starGeo = new THREE.BufferGeometry();
  const starPos: number[] = [];
  for (let i = 0; i < 1500; i++) {
    starPos.push(randomIn(-1200, 1200), randomIn(-300, 700), randomIn(-2000, 800));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0x93a7c4,
    size: 1.6,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    fog: false,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  // ---------- distant shimmer: twinkling sparkles toward the horizon ----------
  // ShaderMaterial ignores scene.fog, so the shimmer stays visible deep
  // in the fog — the "distant sparkle" of the vision. Twinkle is ambient
  // (time-driven); the story itself stays scroll-driven.
  const SHIMMER_N = 900;
  const shimmerGeo = new THREE.BufferGeometry();
  const shimmerPos = new Float32Array(SHIMMER_N * 3);
  const shimmerPhase = new Float32Array(SHIMMER_N);
  for (let i = 0; i < SHIMMER_N; i++) {
    shimmerPos[i * 3] = randomIn(-550, 550);
    shimmerPos[i * 3 + 1] = randomIn(-80, 280);
    shimmerPos[i * 3 + 2] = randomIn(-1700, 320);
    shimmerPhase[i] = Math.random() * Math.PI * 2;
  }
  shimmerGeo.setAttribute('position', new THREE.BufferAttribute(shimmerPos, 3));
  shimmerGeo.setAttribute('aPhase', new THREE.BufferAttribute(shimmerPhase, 1));
  const shimmerMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
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
      varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d) * (0.12 + 0.88 * vTw);
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  scene.add(new THREE.Points(shimmerGeo, shimmerMat));

  // ---------- the infinite bridge ----------
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x39424c,
    metalness: 0.85,
    roughness: 0.45,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x1c2127,
    metalness: 0.8,
    roughness: 0.55,
  });

  // Deck: top surface at y=0, running to ±Z infinity.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(30, 4, 6000), deckMat);
  deck.position.set(0, -2, -1000);
  scene.add(deck);

  // Under-girder.
  const girder = new THREE.Mesh(new THREE.BoxGeometry(22, 12, 6000), darkMetal);
  girder.position.set(0, -10, -1000);
  scene.add(girder);

  // Edge light strips — the infinite leading lines, in logo blue.
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x2f9bff });
  for (const sx of [-13.6, 13.6]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 6000), edgeMat);
    strip.position.set(sx, 0.2, -1000);
    scene.add(strip);
  }

  // Railings: posts (instanced) + continuous top rails.
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x9aa4b2,
    metalness: 1.0,
    roughness: 0.35,
  });
  const postGeo = new THREE.BoxGeometry(0.8, 7, 0.8);
  const postCount = 150;
  const posts = new THREE.InstancedMesh(postGeo, railMat, postCount * 2);
  const dummy = new THREE.Object3D();
  let pi = 0;
  for (const sx of [-14.5, 14.5]) {
    for (let i = 0; i < postCount; i++) {
      dummy.position.set(sx, 3.5, -3980 + i * 40);
      dummy.updateMatrix();
      posts.setMatrixAt(pi++, dummy.matrix);
    }
  }
  posts.instanceMatrix.needsUpdate = true;
  scene.add(posts);

  for (const sx of [-14.5, 14.5]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 6000), railMat);
    rail.position.set(sx, 7.2, -1000);
    scene.add(rail);
  }

  // ---------- the chrome G: grey, with a real tunnel bore ----------
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f9,
    metalness: 1.0,
    roughness: 0.22,
    envMapIntensity: 1.0,
  });

  const gGeo = new THREE.ExtrudeGeometry(makeGShape(), {
    depth: 100,
    bevelEnabled: true,
    bevelThickness: 3,
    bevelSize: 3,
    bevelSegments: 2,
    curveSegments: 96,
  });
  gGeo.center();
  const gMesh = new THREE.Mesh(gGeo, chromeMat);
  // The bridge deck (top y=0) threads the G's tunnel bore as its
  // endlessly deep middle bar.
  gMesh.position.set(0, 70, -180);
  scene.add(gMesh);

  // Luminous ring liner inside the bore — the tunnel mouth.
  const linerGeo = new THREE.TorusGeometry(95, 9, 20, 140, Math.PI * 2 - 1.4);
  const linerMat = new THREE.MeshStandardMaterial({
    color: 0x11161c,
    emissive: 0x2f9bff,
    emissiveIntensity: 0.85,
    metalness: 0.6,
    roughness: 0.4,
  });
  const liner = new THREE.Mesh(linerGeo, linerMat);
  liner.rotation.z = 0.7; // align the ring's gap with the G's gap (+X)
  liner.position.set(0, 70, -180);
  scene.add(liner);

  // ---------- the blue S ----------
  const blueChromeMat = new THREE.MeshStandardMaterial({
    color: 0x3a7bff,
    metalness: 1.0,
    roughness: 0.25,
    envMapIntensity: 1.0,
  });
  const sMesh = new THREE.Mesh(makeSGeometry(), blueChromeMat);
  sMesh.position.set(215, 70, -215);
  scene.add(sMesh);
  // Cap the S's open tube ends.
  const capGeo = new THREE.SphereGeometry(15, 20, 16);
  for (const end of [
    new THREE.Vector3(38, 72, 0),
    new THREE.Vector3(-38, -72, 0),
  ]) {
    const cap = new THREE.Mesh(capGeo, blueChromeMat);
    cap.position.copy(end).add(sMesh.position);
    scene.add(cap);
  }

  // ---------- THE STORY: one paused timeline, scrubbed by scroll ----------
  // Normalized duration 1. The camera moves by PURE TRANSLATION only —
  // x stays 0 the whole way: no lateral drift, no arcs, no roll, and
  // the lookAt never moves. Distances from the fixed lookAt grow
  // strictly: ~245 → ~511 → ~741 → ~984.
  //
  // Phase 1 (0→0.35): slow drift back and up, still low over the deck;
  // the G stays fully fogged — only bridge, rails, shimmer.
  // Phase 2 (0.35→0.7): the fog lifts — the G's top arch comes into
  // view first, then its side, then the blue S.
  // Phase 3 (0.7→1): FAST accelerating pullback — power3.in so the
  // motion rushes outward into the wide shot of the sculpture.
  const tl = gsap.timeline({ paused: true });
  const camPos = camera.position;

  tl.to(camPos, { y: 34, z: 330, duration: 0.35, ease: 'sine.inOut' }, 0);
  tl.to(fog, { density: 0.014, duration: 0.35, ease: 'sine.inOut' }, 0);

  tl.to(camPos, { y: 95, z: 560, duration: 0.35, ease: 'power2.inOut' }, 0.35);
  tl.to(fog, { density: 0.006, duration: 0.2, ease: 'sine.inOut' }, 0.35);
  tl.to(fog, { density: 0.0016, duration: 0.15, ease: 'sine.inOut' }, 0.55);

  tl.to(camPos, { y: 150, z: 800, duration: 0.3, ease: 'power3.in' }, 0.7);
  tl.to(fog, { density: 0.0007, duration: 0.3, ease: 'power1.in' }, 0.7);

  // ---------- render loop ----------
  const clock = new THREE.Clock();
  let elapsed = 0;
  let raf = 0;
  let visible = true;
  let disposed = false;
  let lastVignette = -1;

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

  const tick = () => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    // Ambient shimmer twinkle.
    (shimmerMat.uniforms.uTime as { value: number }).value = elapsed;

    // Vignette: a pure function of timeline progress — strong at p=0 so
    // the frame edges dissolve to black (only bridge + shimmer visible),
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
      const inst = obj as THREE.InstancedMesh;
      if (inst.isInstancedMesh) inst.dispose();
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
