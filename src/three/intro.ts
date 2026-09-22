import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * The Gray Solutions scroll-driven cinematic intro.
 *
 * The concept: there is NO separate bridge or road. The bar you start on
 * IS the logo's own silver crossbar — the horizontal bar of the GS
 * monogram. The camera begins in extreme close-up on it (a vast metallic
 * platform in infinite space), and the zoom-out reveals the bar was part
 * of Chris's actual logo all along: crossbar → G curve and blue S →
 * badge → GRAY SOLUTIONS → full lockup → crossfade into the hero.
 *
 * Division of labor:
 *   - Three.js owns the WORLD: the logo plane (the entire world), the
 *     camera path, starfield + glints, atmospheric haze, fog.
 *   - GSAP owns the STORY — but as a PAUSED, scroll-scrubbed timeline.
 *     `setProgress(p)` maps scroll progress 0→1 onto the timeline, so the
 *     whole sequence is fully reversible: scrolling up rewinds the camera
 *     exactly. The DOM (phrase blocks, progress bar, vignette) is
 *     choreographed separately in IntroSequence.vue from the same scroll
 *     position.
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

// The logo IS the world: one 200×200 plane. The image is 1254×1254 and the
// silver crossbar sits essentially at image center, so plane center ≈
// crossbar. The camera starts ~5 units in front of it and only ever moves
// away.
const LOGO_SIZE = 200;
const LOGO_Y = 8;
const LOGO_Z = -260;
const LOGO_CENTER = new THREE.Vector3(0, LOGO_Y, LOGO_Z);

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
  scene.fog = new THREE.FogExp2(0x05070b, 0.006);

  const camera = new THREE.PerspectiveCamera(
    58,
    window.innerWidth / window.innerHeight,
    0.1,
    1600,
  );
  // Start in EXTREME CLOSE-UP on the crossbar: 5 units from the plane,
  // ~1.5 above the bar line, tilted slightly down along the bar so it
  // reads as a vast metallic platform under/ahead of you in dark space.
  // From here the camera ONLY pulls back and rises — never forward.
  camera.position.set(0, LOGO_Y + 1.5, LOGO_Z + 5);

  const camTarget = new THREE.Object3D();
  camTarget.position.set(0, LOGO_Y - 2, LOGO_Z);
  scene.add(camTarget);

  // ---------- atmospheric haze ----------
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 700),
    new THREE.MeshBasicMaterial({
      map: makeHazeTexture(),
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  haze.position.set(0, 90, -900);
  scene.add(haze);

  // ---------- stars + glints ----------
  const starGeo = new THREE.BufferGeometry();
  const starPos: number[] = [];
  for (let i = 0; i < 1400; i++) {
    starPos.push(randomIn(-260, 260), randomIn(-60, 160), randomIn(-880, 40));
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
  for (let i = 0; i < 70; i++) {
    glintPos.push(randomIn(-200, 200), randomIn(-40, 140), randomIn(-820, -40));
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

  // ---------- the logo: Chris's actual mark, one plane — the whole world —
  // MeshBasicMaterial (unlit) so the brand mark reads exactly as designed.
  // fog:false — the reveal is driven by the zoom, not distance haze.
  // FrontSide + default plane orientation: the camera always stays on the
  // +z side of the plane, so the texture reads upright, never mirrored
  // (THREE flips Y on load by default, matching the plane's UVs).
  const logoTex = new THREE.TextureLoader().load('/logo-lockup.jpg');
  logoTex.colorSpace = THREE.SRGBColorSpace;
  logoTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const logoMat = new THREE.MeshBasicMaterial({
    map: logoTex,
    transparent: true,
    opacity: 1,
    fog: false,
    side: THREE.FrontSide,
  });
  const logoPlane = new THREE.Mesh(new THREE.PlaneGeometry(LOGO_SIZE, LOGO_SIZE), logoMat);
  logoPlane.position.copy(LOGO_CENTER);
  scene.add(logoPlane);

  // ---------- energy burst (deterministic: fully reversible under scrub) ----------
  const BURST_N = 220;
  const burstGeo = new THREE.BufferGeometry();
  const burstBase = new Float32Array(BURST_N * 3);
  const burstVel: number[] = [];
  for (let i = 0; i < BURST_N; i++) {
    burstBase[i * 3] = LOGO_CENTER.x;
    burstBase[i * 3 + 1] = LOGO_CENTER.y;
    burstBase[i * 3 + 2] = LOGO_CENTER.z;
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
  // Normalized duration 1. The camera ONLY ever increases its distance
  // from the logo plane — scrubbing 0→1 is one continuous zoom-out.
  // Phase 1 (0→0.35): slow pullback, still tight on the bar. Phase 2
  // (0.35→0.7): the G curve and blue S resolve around you, then the
  // badge. Phase 3 (0.7→1): FAST accelerating pullback — power3.in so
  // the motion rushes outward into the full lockup, fully reversible
  // under scrub.
  //
  // Camera distances from plane center: 5 → ~41 → ~114 → ~212.
  const tl = gsap.timeline({ paused: true });
  const camPos = camera.position;
  const lookPos = camTarget.position;
  const fx = { flash: 0 };

  // Phase 1 — the zoom-out begins: back and up, slow and weighty.
  tl.to(camPos, { x: 0, y: 16, z: -220, duration: 0.35, ease: 'sine.inOut' }, 0);
  tl.to(lookPos, { x: 0, y: LOGO_Y, z: LOGO_Z, duration: 0.35, ease: 'sine.inOut' }, 0);

  // Phase 2 — keep pulling back and rising; the monogram resolves around
  // you, then the badge.
  tl.to(camPos, { x: 0, y: 38, z: -150, duration: 0.35, ease: 'power2.inOut' }, 0.35);
  tl.to(lookPos, { x: 0, y: LOGO_Y, z: LOGO_Z, duration: 0.35, ease: 'power2.inOut' }, 0.35);

  // Phase 3 — FAST accelerating pullback into the wide shot of the full
  // lockup. The crossfade to the hero then happens in IntroSequence.vue.
  tl.to(camPos, { x: 0, y: 60, z: -55, duration: 0.3, ease: 'power3.in' }, 0.7);
  tl.to(lookPos, { x: 0, y: LOGO_Y, z: LOGO_Z, duration: 0.3, ease: 'power3.in' }, 0.7);

  // Restrained energy release right at the reveal.
  tl.to(burstMat, { opacity: 0.9, duration: 0.012 }, 0.955);
  tl.to(burstState, { t: 1, duration: 0.045, ease: 'power2.out' }, 0.955);
  tl.to(burstMat, { opacity: 0, duration: 0.045, ease: 'sine.in' }, 0.955);
  tl.to(fx, { flash: 0.9, duration: 0.018, ease: 'power1.in' }, 0.96);
  tl.to(fx, { flash: 0, duration: 0.022, ease: 'power1.out' }, 0.978);

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
      const spread = easeOutCubic(burstState.t) * 34;
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
    // the frame edges dissolve to black (only the bar + stars visible),
    // fully gone by p≈0.35. Deterministic and reversible under scrub.
    if (cb.onVignetteLevel) {
      const v = clamp01((0.35 - tl.progress()) / 0.35);
      if (Math.abs(v - lastVignette) > 0.002) {
        lastVignette = v;
        cb.onVignetteLevel(v);
      }
    }

    camera.lookAt(camTarget.position);

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
        material.forEach(disposeMaterial);
      } else if (material) {
        disposeMaterial(material);
      }
    });
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

function disposeMaterial(m: THREE.Material): void {
  const withMap = m as THREE.Material & { map?: THREE.Texture | null };
  if (withMap.map) withMap.map.dispose();
  m.dispose();
}
