import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * The Gray Solutions cinematic intro.
 *
 * Division of labor (per the design brief):
 *   - Three.js owns the WORLD: camera, perspective, bridge geometry, G/S
 *     geometry, stars, particles, haze, emissive lighting, depth, fog.
 *   - GSAP owns the STORY: camera movement, text choreography, reveal
 *     timing, the perspective shift, logo assembly, energy release.
 *
 * The visitor opens in a dark "deep-space observatory" standing on an
 * infinite straight bridge — which is secretly the extruded connector
 * between the G and S of the GS logo. The camera drifts forward past
 * floating phrases, flies through the G's negative space, meets the blue
 * S, then swings into alignment as the bridge collapses into the logo's
 * connector. A restrained energy release, the logo snaps flat, and we
 * crossfade into the site.
 */

export interface IntroCallbacks {
  /** The 3D sequence reached its end (or was skipped/failed). */
  onDone: () => void;
  /** Brief full-screen flash for the energy-release beat. */
  onFlash: () => void;
}

export interface IntroHandle {
  skip: () => void;
  dispose: () => void;
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}

interface TextSegment {
  text: string;
  color: string;
}

const DISPLAY_FONT = '"Space Grotesk", system-ui, sans-serif';

/** Draw multi-colored display text onto a canvas, return canvas + aspect. */
function makeTextCanvas(
  segments: TextSegment[],
  fontSize = 104,
): { canvas: HTMLCanvasElement; aspect: number } {
  const font = `600 ${fontSize}px ${DISPLAY_FONT}`;
  const measurer = document.createElement('canvas').getContext('2d');
  if (!measurer) throw new Error('2d context unavailable');
  measurer.font = font;
  const pad = fontSize * 0.7;
  let width = pad * 2;
  for (const s of segments) width += measurer.measureText(s.text).width;
  const height = fontSize * 1.9;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.font = font;
  ctx.textBaseline = 'middle';
  let x = pad;
  const y = height / 2;
  for (const s of segments) {
    ctx.fillStyle = s.color;
    ctx.fillText(s.text, x, y);
    x += ctx.measureText(s.text).width;
  }
  return { canvas, aspect: canvas.width / canvas.height };
}

function makeLabel(
  segments: TextSegment[],
  worldHeight: number,
  fontSize = 104,
): THREE.Sprite {
  const { canvas, aspect } = makeTextCanvas(segments, fontSize);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    opacity: 0,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(worldHeight * aspect, worldHeight, 1);
  sprite.userData.baseY = 0;
  return sprite;
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

export function startIntro(
  canvas: HTMLCanvasElement,
  cb: IntroCallbacks,
): IntroHandle {
  let renderer: THREE.WebGLRenderer | null = null;
  let raf = 0;
  let finished = false;
  let disposed = false;

  const finish = () => {
    if (finished || disposed) return;
    finished = true;
    cb.onDone();
  };

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch {
    finish();
    return { skip: finish, dispose: () => { disposed = true; } };
  }

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
  camera.position.set(0, 3.4, 14);

  // We tween a target object; the render loop lookAt()s it every frame.
  const camTarget = new THREE.Object3D();
  camTarget.position.set(0, 1.6, -40);
  scene.add(camTarget);
  const roll = { z: 0 };

  // ---------- lights ----------
  scene.add(new THREE.AmbientLight(0x2a3648, 1.4));
  const key = new THREE.DirectionalLight(0x9fb6d8, 1.1);
  key.position.set(-30, 60, -100);
  scene.add(key);
  const rim = new THREE.PointLight(0x2f9bff, 900, 260, 1.8);
  rim.position.set(0, 12, -120);
  scene.add(rim);

  // ---------- atmospheric haze ----------
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(1100, 560),
    new THREE.MeshBasicMaterial({
      map: makeHazeTexture(),
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  haze.position.set(0, 70, -760);
  scene.add(haze);

  // ---------- stars + glints ----------
  const starGeo = new THREE.BufferGeometry();
  const starPos: number[] = [];
  for (let i = 0; i < 1400; i++) {
    starPos.push(randomIn(-230, 230), randomIn(-30, 130), randomIn(-720, 30));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0x93a7c4,
    size: 1.15,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    fog: false, // distant stars punch through the fog
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  const glintGeo = new THREE.BufferGeometry();
  const glintPos: number[] = [];
  for (let i = 0; i < 70; i++) {
    glintPos.push(randomIn(-180, 180), randomIn(-20, 110), randomIn(-650, -20));
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
  const glints = new THREE.Points(glintGeo, glintMat);
  scene.add(glints);

  // ---------- the bridge (secretly the logo's connector) ----------
  const bridge = new THREE.Group();
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x0d1119,
    roughness: 0.85,
    metalness: 0.25,
    transparent: true,
  });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.35, 560), deckMat);
  deck.position.set(0, -0.18, -260);
  bridge.add(deck);

  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x3d4c63, transparent: true });
  for (const sx of [-2.32, 2.32]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 560), edgeMat);
    strip.position.set(sx, 0.05, -260);
    bridge.add(strip);
  }

  const dashMat = new THREE.MeshBasicMaterial({
    color: 0x223146,
    transparent: true,
    opacity: 0.9,
  });
  for (let i = 0; i < 36; i++) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 2.4), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.02, -6 - i * 15);
    bridge.add(dash);
  }
  scene.add(bridge);

  // ---------- floating phrases ----------
  const SILVER = '#c7ccd4';
  const DIM = '#8b93a1';
  const BLUE = '#5cb3ff';
  const phrases: THREE.Sprite[] = [];
  const phraseDefs: { seg: TextSegment[]; pos: [number, number, number]; h: number }[] = [
    {
      seg: [
        { text: 'Every ', color: DIM },
        { text: 'G', color: '#eef1f5' },
        { text: 'ood ', color: DIM },
        { text: 'S', color: BLUE },
        { text: 'tory', color: DIM },
      ],
      pos: [0, 4.6, -55],
      h: 7.5,
    },
    { seg: [{ text: 'Great Structure', color: SILVER }], pos: [-9, 3.6, -95], h: 6.5 },
    { seg: [{ text: 'Generate Smiles', color: SILVER }], pos: [8, 5.2, -130], h: 6.5 },
    {
      seg: [
        { text: 'Solve ', color: DIM },
        { text: 'P', color: '#eef1f5' },
        { text: 'roblems', color: DIM },
      ],
      pos: [-8, 4.2, -162],
      h: 6.5,
    },
  ];
  phraseDefs.forEach((d, i) => {
    const s = makeLabel(d.seg, d.h);
    s.position.set(...d.pos);
    s.userData.baseY = d.pos[1];
    s.userData.phase = i * 1.7;
    scene.add(s);
    phrases.push(s);
  });

  // ---------- the G (torus-arc segments + arrow crossbar) ----------
  const gGroup = new THREE.Group();
  gGroup.position.set(-18, 3.5, -195);
  const gMats: THREE.MeshStandardMaterial[] = [];
  const SEG_ARC = 1.55;
  const SEG_OFFSET = 0.42; // rotates the gap to the right, G-style
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9aa1ab,
      metalness: 0.85,
      roughness: 0.35,
      emissive: 0x39404c,
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0,
    });
    const seg = new THREE.Mesh(new THREE.TorusGeometry(13, 3, 20, 42, SEG_ARC), mat);
    seg.rotation.z = SEG_OFFSET + i * SEG_ARC;
    gGroup.add(seg);
    gMats.push(mat);
  }
  const barMat = new THREE.MeshStandardMaterial({
    color: 0x9aa1ab,
    metalness: 0.85,
    roughness: 0.35,
    emissive: 0x39404c,
    emissiveIntensity: 0,
    transparent: true,
    opacity: 0,
  });
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(11, 2.8, 2.8), barMat);
  crossbar.position.set(4.2, 0.6, 0);
  gGroup.add(crossbar);
  gMats.push(barMat);
  scene.add(gGroup);

  // ---------- projected phrases inside the G tunnel ----------
  const tunnelTexts: THREE.Sprite[] = [];
  (
    [
      { text: 'GOOD STORIES', pos: [-18, 9.5, -186] as const },
      { text: 'GREAT STRUCTURE', pos: [-26, 1.5, -190] as const },
    ]
  ).forEach((t) => {
    const s = makeLabel([{ text: t.text, color: '#7d90ac' }], 5.2, 92);
    s.position.set(t.pos[0], t.pos[1], t.pos[2]);
    scene.add(s);
    tunnelTexts.push(s);
  });

  // ---------- the S (emissive blue tube) ----------
  const sGroup = new THREE.Group();
  sGroup.position.set(16, 3.5, -255);
  const sCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(5.5, 7.5, 0),
    new THREE.Vector3(0.5, 8.6, 0),
    new THREE.Vector3(-4.5, 6.6, 0),
    new THREE.Vector3(-5.6, 3, 0),
    new THREE.Vector3(0, 0.8, 0),
    new THREE.Vector3(5, -1.6, 0),
    new THREE.Vector3(5.6, -4.6, 0),
    new THREE.Vector3(1, -7.6, 0),
    new THREE.Vector3(-4, -7, 0),
  ]);
  const sGeo = new THREE.TubeGeometry(sCurve, 140, 1.5, 18, false);
  const sIndexCount = sGeo.index ? sGeo.index.count : 0;
  sGeo.setDrawRange(0, 0);
  const sMat = new THREE.MeshStandardMaterial({
    color: 0x0d2138,
    metalness: 0.4,
    roughness: 0.4,
    emissive: 0x2f9bff,
    emissiveIntensity: 0,
    transparent: true,
    opacity: 0,
  });
  const sMesh = new THREE.Mesh(sGeo, sMat);
  sGroup.add(sMesh);
  scene.add(sGroup);

  // ---------- finale: connector bar + energy burst ----------
  const connectorMat = new THREE.MeshBasicMaterial({
    color: 0x6f87a8,
    transparent: true,
    opacity: 0,
  });
  const connector = new THREE.Mesh(new THREE.BoxGeometry(13, 1.5, 1.5), connectorMat);
  connector.position.set(0, 4, -315);
  scene.add(connector);

  const BURST_N = 260;
  const burstGeo = new THREE.BufferGeometry();
  const burstPos = new Float32Array(BURST_N * 3);
  const burstVel: number[] = [];
  for (let i = 0; i < BURST_N; i++) {
    burstPos[i * 3] = 0;
    burstPos[i * 3 + 1] = 4;
    burstPos[i * 3 + 2] = -315;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(randomIn(-1, 1));
    const speed = randomIn(6, 26);
    burstVel.push(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      Math.cos(phi) * speed,
    );
  }
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3));
  const burstMat = new THREE.PointsMaterial({
    color: 0x9fd4ff,
    size: 1.7,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const burst = new THREE.Points(burstGeo, burstMat);
  burst.visible = false;
  scene.add(burst);
  const burstState = { t: 1 }; // 1 = idle

  // ---------- the STORY (GSAP timeline) ----------
  const tl = gsap.timeline({ onComplete: finish });
  const camPos = camera.position;
  const lookPos = camTarget.position;

  const fadeSprite = (s: THREE.Sprite, at: number, dur = 1.6) => {
    const m = s.material as THREE.SpriteMaterial;
    tl.to(m, { opacity: 0, duration: dur, ease: 'sine.inOut' }, at);
  };

  // Beat 1 — drift forward along the bridge, phrases drift past (0 → 5.5s)
  tl.to(camPos, { x: 0, y: 3, z: -70, duration: 5.5, ease: 'sine.inOut' }, 0);
  tl.to(lookPos, { x: 0, y: 1.8, z: -120, duration: 5.5, ease: 'sine.inOut' }, 0);
  phrases.forEach((s, i) => {
    const m = s.material as THREE.SpriteMaterial;
    tl.to(m, { opacity: 0.95, duration: 1.2, ease: 'sine.out' }, 0.4 + i * 1.1);
    fadeSprite(s, 3.2 + i * 1.35);
  });

  // Beat 2 — veer left, fly inside the G's negative space (5.5 → 10s)
  tl.to(camPos, { x: -10, y: 3, z: -150, duration: 2.5, ease: 'sine.inOut' }, 5.5);
  tl.to(lookPos, { x: -16, y: 3, z: -195, duration: 2.5, ease: 'sine.inOut' }, 5.5);
  tl.to(camPos, { x: -18, y: 3.2, z: -197, duration: 2, ease: 'sine.inOut' }, 8);
  tl.to(lookPos, { x: -18, y: 3, z: -240, duration: 2, ease: 'sine.inOut' }, 8);

  // G reveals piece by piece from the left
  gMats.forEach((m, i) => {
    tl.to(m, { opacity: 1, duration: 0.9, ease: 'sine.out' }, 5.8 + i * 0.6);
    tl.to(m, { emissiveIntensity: 1.1, duration: 1.4, ease: 'sine.out' }, 5.8 + i * 0.6);
  });

  // Tunnel-wall projections illuminate, then fade
  tunnelTexts.forEach((s, i) => {
    const m = s.material as THREE.SpriteMaterial;
    const at = 6.8 + i * 0.9;
    tl.to(m, { opacity: 0.85, duration: 0.8, ease: 'sine.in' }, at);
    tl.to(m, { opacity: 0, duration: 1.1, ease: 'sine.out' }, at + 1.0);
  });

  // Color progression: bridge edges drift gray → blue
  const edgeColor = new THREE.Color(0x3d4c63);
  edgeMat.color = edgeColor;
  tl.to(edgeColor, { r: 0x5f / 255, g: 0x9f / 255, b: 0xe8 / 255, duration: 8, ease: 'sine.inOut' }, 4);

  // Beat 3 — through the G, the blue S draws itself on the right (10 → 13s)
  tl.to(camPos, { x: -8, y: 3.8, z: -250, duration: 1.6, ease: 'sine.inOut' }, 10);
  tl.to(lookPos, { x: 2, y: 3.6, z: -290, duration: 1.6, ease: 'sine.inOut' }, 10);
  tl.to(camPos, { x: -2, y: 4.2, z: -285, duration: 1.4, ease: 'sine.inOut' }, 11.6);
  tl.to(lookPos, { x: 0, y: 4, z: -315, duration: 1.4, ease: 'sine.inOut' }, 11.6);

  const drawState = { p: 0 };
  tl.to(sMat, { opacity: 1, duration: 0.4 }, 10.2);
  tl.to(
    drawState,
    {
      p: 1,
      duration: 2.2,
      ease: 'power2.inOut',
      onUpdate: () => sGeo.setDrawRange(0, Math.floor(drawState.p * sIndexCount)),
    },
    10.2,
  );
  tl.to(sMat, { emissiveIntensity: 2.4, duration: 2.8, ease: 'sine.out' }, 10.2);

  // Beat 4 — perspective shift: swing into alignment, assemble the logo (13 → 16s)
  tl.to(gGroup.position, { x: -7.5, y: 4, z: -315, duration: 3, ease: 'power2.inOut' }, 13);
  tl.to(gGroup.scale, { x: 0.62, y: 0.62, z: 0.62, duration: 3, ease: 'power2.inOut' }, 13);
  tl.to(sGroup.position, { x: 6.5, y: 4, z: -315, duration: 3, ease: 'power2.inOut' }, 13);
  tl.to(sGroup.scale, { x: 0.62, y: 0.62, z: 0.62, duration: 3, ease: 'power2.inOut' }, 13);
  tl.to(deckMat, { opacity: 0, duration: 2, ease: 'sine.inOut' }, 13.2);
  tl.to(edgeMat, { opacity: 0, duration: 2, ease: 'sine.inOut' }, 13.2);
  tl.to(dashMat, { opacity: 0, duration: 2, ease: 'sine.inOut' }, 13.2);
  tl.to(connectorMat, { opacity: 0.95, duration: 1.6, ease: 'sine.in' }, 14);
  tl.to(connectorMat.color, { r: 0x8f / 255, g: 0xd0 / 255, b: 1, duration: 1.6 }, 14);
  tl.to(starMat, { opacity: 0.06, duration: 2.5 }, 13.5);
  tl.to(glintMat, { opacity: 0, duration: 2 }, 13.5);
  tl.to(camPos, { x: 0, y: 4.2, z: -281, duration: 3, ease: 'power2.inOut' }, 13);
  tl.to(lookPos, { x: 0, y: 4, z: -315, duration: 3, ease: 'power2.inOut' }, 13);
  tl.to(roll, { z: -0.1, duration: 1.2, ease: 'sine.in' }, 13);
  tl.to(roll, { z: 0, duration: 1.2, ease: 'power2.out' }, 14.2);

  // Beat 5 — energy release (restrained): flash + particle burst, then hold
  tl.add(() => {
    cb.onFlash();
    burst.visible = true;
    burstState.t = 0;
  }, 16);
  tl.to(camPos, { z: -279.5, duration: 0.9, ease: 'sine.out' }, 16);
  tl.add(() => finish(), 16.9);

  // ---------- render loop ----------
  const clock = new THREE.Clock();
  let elapsed = 0;

  const tick = () => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    // Ambient drift: phrases breathe, glints shimmer
    for (const s of phrases) {
      const m = s.material as THREE.SpriteMaterial;
      if (m.opacity > 0.01) {
        s.position.y = s.userData.baseY + Math.sin(elapsed * 0.5 + s.userData.phase) * 0.35;
      }
    }
    glintMat.opacity = 0.25 + Math.sin(elapsed * 1.7) * 0.12;

    // Energy burst particles
    if (burstState.t < 1) {
      burstState.t = Math.min(1, burstState.t + dt / 0.9);
      const pos = burstGeo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const damp = 1 - burstState.t * 0.75;
      for (let i = 0; i < BURST_N; i++) {
        arr[i * 3] += burstVel[i * 3] * dt * damp;
        arr[i * 3 + 1] += burstVel[i * 3 + 1] * dt * damp;
        arr[i * 3 + 2] += burstVel[i * 3 + 2] * dt * damp;
      }
      pos.needsUpdate = true;
      burstMat.opacity = 1 - burstState.t;
    }

    camera.lookAt(camTarget.position);
    if (roll.z !== 0) camera.rotateZ(roll.z);

    // Pause rendering when the tab is hidden; the GSAP timeline keeps
    // its own clock, so the story resumes cleanly on return.
    if (!document.hidden && renderer) {
      renderer.render(scene, camera);
    }
  };
  tick();

  // ---------- resize ----------
  const onResize = () => {
    if (!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  };
  window.addEventListener('resize', onResize);

  // ---------- fail-safe: never trap the visitor ----------
  const watchdog = window.setTimeout(finish, 32000);

  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(watchdog);
    window.removeEventListener('resize', onResize);
    tl.kill();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) {
        material.forEach((m) => disposeMaterial(m));
      } else if (material) {
        disposeMaterial(material);
      }
    });
    renderer?.dispose();
    renderer = null;
  };

  return {
    skip: () => {
      tl.kill();
      finish();
    },
    dispose,
  };
}

function disposeMaterial(m: THREE.Material): void {
  const withMap = m as THREE.Material & { map?: THREE.Texture | null };
  if (withMap.map) withMap.map.dispose();
  m.dispose();
}
