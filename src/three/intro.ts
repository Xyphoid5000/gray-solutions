import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * The Gray Solutions scroll-driven cinematic intro.
 *
 * The concept: Chris's ACTUAL logo (`public/logo-lockup.jpg` — never
 * redrawn, never reinterpreted) is a physical 3D relief floating in
 * infinite space. The JPEG is BOTH the color map and the height source:
 * its luminance is baked into a high-segment plane's vertices, so the
 * bright silver G, the blue S, the pixel accents, and the wordmark
 * physically RISE off the dark badge face as dimensional chrome. The
 * same luminance drives metalness (dark badge ≈ dielectric, bright
 * letters ≈ chrome), and a radial alphaMap dissolves the plane's square
 * edges so the badge floats as an island in the starfield.
 *
 * The journey: you start hovering just above the RAISED crossbar — the
 * circled bar in the logo — at a low grazing angle. Scrolling only ever
 * zooms OUT (dolly back + rise + a slight lateral arc): the chrome bar
 * fills the frame → the G's inner counter resolves around you → the S's
 * curves show their thickness → the full dimensional badge → the
 * wordmark → the wide lockup → crossfade into the hero.
 *
 * Division of labor:
 *   - Three.js owns the WORLD: the relief, camera, lights, stars, haze.
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

/**
 * Radial alpha fade: the relief's square edges dissolve into space so the
 * badge floats as an island. Opaque through the badge + wordmark radius,
 * fully transparent before the quad corners.
 */
function makeAlphaTexture(): THREE.CanvasTexture {
  const s = 512;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.74, '#ffffff');
  g.addColorStop(1, '#000000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

function randomIn(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Bake the logo's luminance into plane vertices (CPU displacement) so the
 * relief gets CORRECT smooth normals via computeVertexNormals — three.js
 * does not recompute normals for GPU displacementMap, which would leave
 * the extrusion shading flat. Also builds a grayscale luminance canvas
 * for the metalness map. UV math mirrors PlaneGeometry's own mapping
 * (top edge = image top), so relief and print stay registered.
 */
function buildRelief(
  img: HTMLImageElement,
  size: number,
  segments: number,
  reliefScale: number,
  reliefBias: number,
): { geometry: THREE.PlaneGeometry; luminanceCanvas: HTMLCanvasElement } {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  if (!sctx) throw new Error('2d context unavailable');
  sctx.drawImage(img, 0, 0);
  const srcData = sctx.getImageData(0, 0, w, h).data;

  const gray = document.createElement('canvas');
  gray.width = w;
  gray.height = h;
  const gctx = gray.getContext('2d');
  if (!gctx) throw new Error('2d context unavailable');
  const grayImg = gctx.createImageData(w, h);
  const grayData = grayImg.data;

  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const arr = posAttr.array as Float32Array;
  for (let i = 0; i < posAttr.count; i++) {
    const x = arr[i * 3];
    const y = arr[i * 3 + 1];
    const u = x / size + 0.5;
    const v = y / size + 0.5;
    const px = Math.min(w - 1, Math.max(0, Math.floor(u * w)));
    const py = Math.min(h - 1, Math.max(0, Math.floor((1 - v) * h)));
    const o = (py * w + px) * 4;
    const lum = Math.round(
      0.2126 * srcData[o] + 0.7152 * srcData[o + 1] + 0.0722 * srcData[o + 2],
    );
    const go = (py * w + px) * 4;
    grayData[go] = lum;
    grayData[go + 1] = lum;
    grayData[go + 2] = lum;
    grayData[go + 3] = 255;
    arr[i * 3 + 2] = (lum / 255) * reliefScale + reliefBias;
  }
  gctx.putImageData(grayImg, 0, 0);
  posAttr.needsUpdate = true;
  geo.computeVertexNormals();
  return { geometry: geo, luminanceCanvas: gray };
}

// The logo IS the world: one 220×220 relief. The image is 1254×1254;
// the silver crossbar sits at image ≈(647,450) → plane-local ≈(+3,+28).
// Relief: bright letters rise ~9 units off the badge face.
const LOGO_SIZE = 200;
const LOGO_Y = 8;
const LOGO_Z = -260;
const LOGO_CENTER = new THREE.Vector3(0, LOGO_Y, LOGO_Z);
const RELIEF_SCALE = 12;
const RELIEF_BIAS = -1.6;

export async function startIntroScene(
  canvas: HTMLCanvasElement,
  cb: IntroSceneCallbacks = {},
): Promise<IntroSceneHandle> {
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

  // Image-based lighting so the chrome relief has something to reflect.
  // Kept subtle (envMapIntensity on the material) so the artwork's colors
  // stay true — the finale crossfades into the unlit DOM image.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(
    58,
    window.innerWidth / window.innerHeight,
    0.5,
    2000,
  );
  // Start hovering just above the RAISED crossbar — the circled bar in
  // the logo (image ≈(647,450)/1254 → plane-local ≈(+3,+28), its top
  // surface ~8 units proud of the badge face): low grazing angle,
  // looking slightly down ALONG the bar — the chrome surface below you,
  // its beveled sides falling away, darkness + stars beyond. From here
  // the camera ONLY pulls back and rises — never forward.
  camera.position.set(-20, 38, -238);

  const camTarget = new THREE.Object3D();
  camTarget.position.set(30, 24, -254);
  scene.add(camTarget);

  const logoTarget = new THREE.Object3D();
  logoTarget.position.copy(LOGO_CENTER);
  scene.add(logoTarget);

  // ---------- lights: dimension must read at close range ----------
  scene.add(new THREE.AmbientLight(0x223044, 0.9));

  const key = new THREE.DirectionalLight(0xe8f0ff, 1.3);
  key.position.set(-50, 90, -150);
  scene.add(key);

  // Low raking light across the relief: grazes the extrusion so the
  // 9-unit letter depth casts strong light/shade at close range.
  const rake = new THREE.DirectionalLight(0xbfd4ff, 1.7);
  rake.position.set(-160, 14, -190);
  rake.target = logoTarget;
  scene.add(rake);

  const rim = new THREE.PointLight(0x2f9bff, 1200, 400, 1.8);
  rim.position.set(60, 40, -180);
  scene.add(rim);

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

  // ---------- the logo: Chris's actual mark as dimensional chrome relief —
  // fog:false — the reveal is driven by the zoom, not distance haze.
  // FrontSide + the camera always on the +z side: the artwork reads
  // upright, never mirrored.
  const logoTex = await new THREE.TextureLoader().loadAsync('/logo-lockup.jpg');
  logoTex.colorSpace = THREE.SRGBColorSpace;
  logoTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const { geometry: reliefGeo, luminanceCanvas } = buildRelief(
    logoTex.image as HTMLImageElement,
    LOGO_SIZE,
    320,
    RELIEF_SCALE,
    RELIEF_BIAS,
  );
  const metalTex = new THREE.CanvasTexture(luminanceCanvas);
  // NoColorSpace (linear): luminance → metalness. Dark badge ≈ 0.15
  // (dielectric), bright silver ≈ 0.9 (chrome).
  const logoMat = new THREE.MeshStandardMaterial({
    map: logoTex,
    metalnessMap: metalTex,
    metalness: 1.0,
    roughness: 0.38,
    envMapIntensity: 0.55,
    transparent: true,
    alphaMap: makeAlphaTexture(),
    fog: false,
    side: THREE.FrontSide,
  });
  const relief = new THREE.Mesh(reliefGeo, logoMat);
  relief.position.copy(LOGO_CENTER);
  scene.add(relief);

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
  // from the badge — scrubbing 0→1 is one continuous zoom-out.
  // Distances from badge center: ~42 → ~100 → ~186 → ~251.
  //
  // Phase 1 (0→0.35): the zoom-out begins, still tight on the bar.
  // Phase 2 (0.35→0.7): the G's inner counter resolves around you, the
  // S's curves show their thickness, then the badge. Slight lateral arc.
  // Phase 3 (0.7→1): FAST accelerating pullback — power3.in so the
  // motion rushes outward into a near-flat-on wide shot of the full
  // lockup ("scroll out a lot faster"), fully reversible under scrub.
  const tl = gsap.timeline({ paused: true });
  const camPos = camera.position;
  const lookPos = camTarget.position;
  const fx = { flash: 0 };

  tl.to(camPos, { x: -28, y: 34, z: -168, duration: 0.35, ease: 'sine.inOut' }, 0);
  tl.to(lookPos, { x: 0, y: LOGO_Y, z: LOGO_Z, duration: 0.35, ease: 'sine.inOut' }, 0);

  tl.to(camPos, { x: -46, y: 60, z: -88, duration: 0.35, ease: 'power2.inOut' }, 0.35);
  tl.to(lookPos, { x: 0, y: LOGO_Y, z: LOGO_Z, duration: 0.35, ease: 'power2.inOut' }, 0.35);

  tl.to(camPos, { x: 0, y: 26, z: -10, duration: 0.3, ease: 'power3.in' }, 0.7);
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

function disposeMaterial(m: THREE.Material): void {
  const withMaps = m as THREE.Material & {
    map?: THREE.Texture | null;
    metalnessMap?: THREE.Texture | null;
    alphaMap?: THREE.Texture | null;
  };
  if (withMaps.map) withMaps.map.dispose();
  if (withMaps.metalnessMap) withMaps.metalnessMap.dispose();
  if (withMaps.alphaMap) withMaps.alphaMap.dispose();
  m.dispose();
}
