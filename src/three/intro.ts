import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * The Gray Solutions scroll-driven cinematic intro — built to Chris's
 * hand-drawn storyboard (2026-09-23), fix pass after video QA (2026-09-23).
 *
 * THE CORE IDEA: the bridge IS the logo. In logo-lockup.jpg the grey G's
 * horizontal crossbar is a perspective wedge — a bridge/road receding to a
 * vanishing point. The scene is ONE cast piece, not two:
 *
 *   - Beats 1-3: the camera sits low over the bridge deck, which reads as
 *     an endless bridge: the deck starts UNDER the camera and runs to a
 *     CENTERED vanishing point, filling the lower frame as a perspective
 *     triangle (storyboard frame 1). Scroll = moving backwards: the camera
 *     dollies back along the deck, railing posts stream past, stars streak
 *     with velocity-scaled motion streaks, and the DOM story copy overlays.
 *   - Beat 4 ("something that stands apart"): the camera pulls back and
 *     up. The giant grey chrome G — opacity 0 from frame one, never
 *     fog-reliant — ramps in on the scrubbed timeline as the camera
 *     uncovers it. Nothing assembles or pops: it emerges from darkness
 *     already joined to the deck (same material params, volumetric
 *     overlap), so it reads as one piece that was always there.
 *   - Beat 5 (pull out): the camera glides into a close 3/4 framing of
 *     the full GS — grey chrome G, blue chrome S below-right — the deck
 *     still running through as the crossbar.
 *   - Beat 6 (snap 3D->2D): a scale punch, then a crossfade to a plane
 *     textured with Chris's ACTUAL logo-lockup.jpg — never redrawn or
 *     reinterpreted. The DOM hero (same lockup) is then uncovered in place
 *     behind the fading canvas (see IntroSequence.vue).
 *
 * Division of labor:
 *   - Three.js owns the WORLD: bridge-as-crossbar, G, S, camera, fog,
 *     stars, streaks, snap plane.
 *   - GSAP owns the STORY — but as a PAUSED, scroll-scrubbed timeline.
 *     `setProgress(p)` maps scroll progress 0->1 onto the timeline, so the
 *     whole sequence is fully reversible: scrolling up rewinds everything
 *     exactly. The DOM (hero, phrases, progress bar, vignette) is
 *     choreographed separately in IntroSequence.vue from the same scroll
 *     position.
 *
 * Restrained by design: deck, edge lights, railings, stars, streaks, fog.
 * No assembly animations, no fly-ins, no bursts.
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
/* The bridge deck = the G's crossbar. A tapered slab (perspective     */
/* wedge): wide at the G/camera end, narrowing to the vanishing point. */
/* The deck starts UNDER the camera (DECK_Z_NEAR is behind the p=0      */
/* camera z) so beat 1 reads as sitting above an infinite bridge.     */
/* ------------------------------------------------------------------ */

const DECK_Z_NEAR = 620; // wide end: just behind/under the p=0 camera
const DECK_Z_FAR = -4200; // narrow end, melted into fog
const DECK_W_NEAR = 40;
const DECK_W_FAR = 4;
const DECK_X = -170; // deck centerline: threads the G's left tube

function deckWidthAt(z: number): number {
  const t = (DECK_Z_NEAR - z) / (DECK_Z_NEAR - DECK_Z_FAR);
  return DECK_W_NEAR + (DECK_W_FAR - DECK_W_NEAR) * t;
}

/**
 * A box tapered along Z: width wNear at local z=+len/2 (near), wFar at
 * local z=-len/2 (far). xCenterAt(t) offsets the slab sideways per t
 * (0 = near, 1 = far) — used for the glowing edge strips and rails that
 * hug the deck's tapering edges.
 */
function makeTaperedSlab(
  len: number,
  wNear: number,
  wFar: number,
  h: number,
  xCenterAt: (t: number) => number = () => 0,
): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(1, h, len, 1, 1, Math.max(8, Math.floor(len / 60)));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const t = 0.5 - z / len; // 0 at near (+len/2), 1 at far (-len/2)
    const w = wNear + (wFar - wNear) * t;
    pos.setX(i, pos.getX(i) * w + xCenterAt(t));
  }
  geo.computeVertexNormals();
  return geo;
}

/** The blue S: a smooth tube swept along an S centerline, flattened a touch. */
function makeSGeometry(): THREE.TubeGeometry {
  const pts = [
    [72, 82], [28, 106], [-32, 100], [-72, 62], [-68, 22],
    [-28, -2], [28, -14], [70, -40], [66, -80], [24, -104], [-34, -98], [-72, -68],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 24, 18, false);
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
  // Gentle exponential fog: melts the far deck into black, adds atmosphere
  // around the reveal. It is NOT the G/S hiding mechanism — those are
  // opacity-driven on the timeline (video QA proved fog alone unreliable).
  const fog = new THREE.FogExp2(0x05070b, 0.0016);
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
  // p=0: sitting low over the bridge deck, looking slightly DOWN its
  // length to a CENTERED vanishing point. The deck starts under the
  // camera (z=620 > camera z=560) and fills the lower frame.
  camera.position.set(DECK_X, 34, 560);
  scene.add(camera); // the 2D snap plane rides parented to the camera

  // ---------- lights ----------
  // Tuned after video QA: the chrome rendered near-black. Metals need
  // strong direct speculars + a hot env map — ambient alone does nothing
  // for metalness ~1. Key rakes across the G; fill lifts camera-facing
  // surfaces so the deck top reads GREY, not black.
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
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(3200, 1600),
    new THREE.MeshBasicMaterial({
      map: makeHazeTexture(),
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  haze.position.set(DECK_X, 150, -2600);
  scene.add(haze);

  // ---------- materials ----------
  // Deck + G arc share IDENTICAL params (separate instances so the G's
  // opacity can ramp independently). Same lighting response => the
  // junction reads as one cast piece. Params chosen so the metal reads
  // light GREY on black: bright base, moderate roughness, hot env.
  const chromeParams = {
    color: 0xdde3ea,
    metalness: 0.85,
    roughness: 0.34,
    envMapIntensity: 1.7,
    transparent: true,
  };
  const deckMat = new THREE.MeshStandardMaterial({ ...chromeParams }); // opacity 1: visible from frame one
  const gMat = new THREE.MeshStandardMaterial({ ...chromeParams, opacity: 0 }); // revealed at beat 4

  const sMat = new THREE.MeshStandardMaterial({
    color: 0x2f6bff,
    metalness: 0.85,
    roughness: 0.32,
    envMapIntensity: 1.6,
    transparent: true,
    opacity: 0, // revealed at beat 4
  });

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x9aa4b2,
    metalness: 1.0,
    roughness: 0.35,
    envMapIntensity: 1.2,
    transparent: true,
  });

  // Blue edge strips: thick + bright enough to read at frame one
  // (video QA: the old 0.8-wide strips were sub-pixel thin).
  const edgeMat = new THREE.MeshBasicMaterial({
    color: 0x3fa9ff,
    transparent: true,
  });

  // ---------- the G: a bold chrome arc, opening facing +X (like the mark) ----------
  // Opacity 0 from frame one — revealed ONLY by the timeline at beat 4.
  // The deck's wide end threads the arc's left tube: one continuous object.
  const logoGroup = new THREE.Group();
  const G_R = 170;
  const G_TUBE = 26;
  const gGeo = new THREE.TorusGeometry(G_R, G_TUBE, 24, 180, Math.PI * 2 - 1.1);
  const gMesh = new THREE.Mesh(gGeo, gMat);
  gMesh.rotation.z = 0.55; // center the 1.1-rad gap on +X (the G's opening)
  logoGroup.add(gMesh);

  // ---------- the blue S, below-right of the G ----------
  // Also opacity 0 from frame one; revealed with the G at beat 4.
  const sMesh = new THREE.Mesh(makeSGeometry(), sMat);
  sMesh.scale.z = 0.55; // ribbon feel, like the mark
  const sGroup = new THREE.Group();
  sGroup.add(sMesh);
  const capGeo = new THREE.SphereGeometry(24, 18, 14);
  for (const [cx, cy] of [[72, 82], [-72, -68]]) {
    const cap = new THREE.Mesh(capGeo, sMat);
    cap.position.set(cx, cy, 0);
    cap.scale.z = 0.55;
    sGroup.add(cap);
  }
  sGroup.position.set(150, -260, -40);
  logoGroup.add(sGroup);
  scene.add(logoGroup);

  // ---------- the infinite bridge = the G's crossbar ----------
  const deckLen = DECK_Z_NEAR - DECK_Z_FAR;
  const deck = new THREE.Mesh(
    makeTaperedSlab(deckLen, DECK_W_NEAR, DECK_W_FAR, 6),
    deckMat,
  );
  deck.position.set(DECK_X, 0, (DECK_Z_NEAR + DECK_Z_FAR) / 2);
  scene.add(deck);

  // Glowing blue edge strips hugging the deck's tapering edges.
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(
      makeTaperedSlab(deckLen, 1.6, 1.6, 0.8, (t) => {
        const w = DECK_W_NEAR + (DECK_W_FAR - DECK_W_NEAR) * t;
        return side * (w / 2 - 0.8);
      }),
      edgeMat,
    );
    strip.position.set(DECK_X, 3.4, (DECK_Z_NEAR + DECK_Z_FAR) / 2);
    scene.add(strip);
  }

  // Railings: instanced posts + continuous top rails, following the taper.
  // Posts run from just behind the camera (z=600) to the far end.
  const postGeo = new THREE.BoxGeometry(0.8, 7, 0.8);
  const postRows = 120;
  const posts = new THREE.InstancedMesh(postGeo, railMat, postRows * 2);
  const dummy = new THREE.Object3D();
  let pi = 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < postRows; i++) {
      const z = 600 - i * 40;
      dummy.position.set(DECK_X + side * (deckWidthAt(z) / 2 + 1.5), 6.5, z);
      dummy.updateMatrix();
      posts.setMatrixAt(pi++, dummy.matrix);
    }
  }
  posts.instanceMatrix.needsUpdate = true;
  scene.add(posts);

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(
      makeTaperedSlab(deckLen, 0.6, 0.6, 0.6, (t) => {
        const w = DECK_W_NEAR + (DECK_W_FAR - DECK_W_NEAR) * t;
        return side * (w / 2 + 1.5);
      }),
      railMat,
    );
    rail.position.set(DECK_X, 10.2, (DECK_Z_NEAR + DECK_Z_FAR) / 2);
    scene.add(rail);
  }

  // ---------- stars: twinkle always, STREAK on scroll (beat 2) ----------
  const starGeo = new THREE.BufferGeometry();
  const starPos: number[] = [];
  for (let i = 0; i < 1200; i++) {
    starPos.push(randomIn(-1300, 900), randomIn(-150, 750), randomIn(-2700, 1600));
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
  scene.add(stars);

  // Distant shimmer toward the horizon (twinkle only, ambient).
  const SHIMMER_N = 700;
  const shimmerGeo = new THREE.BufferGeometry();
  const shimmerPos = new Float32Array(SHIMMER_N * 3);
  const shimmerPhase = new Float32Array(SHIMMER_N);
  for (let i = 0; i < SHIMMER_N; i++) {
    shimmerPos[i * 3] = randomIn(-900, 700);
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
  scene.add(shimmer);

  // Motion streaks: line segments stretched along the camera's velocity
  // vector, length + opacity scaled by scroll speed. At rest they vanish
  // and only the twinkle remains — exactly the storyboard's beat 2.
  const STREAK_N = 300;
  const streakPos = new Float32Array(STREAK_N * 6);
  const streakBase: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < STREAK_N; i++) {
    streakBase.push({
      x: randomIn(-1300, 900),
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
  scene.add(streaks);

  // ---------- beat 6: the REAL logo, snapped from 3D to 2D ----------
  // Chris's actual mark — a plane textured with public/logo-lockup.jpg,
  // parented to the camera so it fills the frame for the snap.
  const snapTex = new THREE.TextureLoader().load('/logo-lockup.jpg');
  snapTex.colorSpace = THREE.SRGBColorSpace;
  const snapMat = new THREE.MeshBasicMaterial({
    map: snapTex,
    transparent: true,
    opacity: 0,
    fog: false,
    toneMapped: false,
  });
  const snapPlane = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), snapMat);
  snapPlane.position.set(0, 0, -32);
  snapPlane.scale.setScalar(1.07);
  camera.add(snapPlane);

  // ---------- THE STORY: one paused timeline, scrubbed by scroll ----------
  // Normalized duration 1. Everything below is a pure function of p, so
  // scrolling up rewinds the camera, the fog, the reveal, and the snap.
  //
  // Beats 1-3 (0 -> 0.45): the money sensation is MOVING BACKWARDS. The
  // camera dollies back along the deck (+Z) while looking slightly DOWN
  // its length to the centered vanishing point. Posts and star-streaks
  // stream past; the G/S sit at opacity 0 — not the subject.
  //
  // Beat 4 (0.45 -> 0.62): pull back AND up; the G/S opacity ramps 0->1
  // on this timeline (NOT fog). The G emerges from darkness already
  // joined to the deck — one cast piece, revealed, never assembled.
  //
  // Beat 5 (0.62 -> 0.8): the camera leaves the bridge-travel and glides
  // into a close 3/4 framing of the full GS — grey G, blue S below-right,
  // deck running through as the crossbar.
  //
  // Beat 6 (0.8 -> 0.9): scale punch, then crossfade the whole 3D world
  // to the real 2D logo plane. The DOM then fades the canvas (0.9-1.0)
  // and uncovers the hero in place.
  const lookTarget = new THREE.Vector3(DECK_X, 2, -800);
  const worldFade = { v: 1 }; // 1 -> 0 drives every visible 3D material's opacity
  const logoReveal = { v: 0 }; // 0 -> 1 reveals the G + S during beat 4
  const fadeMats: THREE.Material[] = [deckMat, railMat, edgeMat, starMat];

  const tl = gsap.timeline({ paused: true });
  const cp = camera.position;

  // Camera path
  tl.to(cp, { x: DECK_X, y: 70, z: 1100, duration: 0.45, ease: 'sine.inOut' }, 0);
  tl.to(cp, { x: -190, y: 210, z: 1050, duration: 0.17, ease: 'power2.inOut' }, 0.45);
  tl.to(cp, { x: 130, y: 70, z: 1080, duration: 0.18, ease: 'power2.inOut' }, 0.62);

  // Look target
  tl.to(lookTarget, { x: DECK_X, y: 8, z: -800, duration: 0.45, ease: 'sine.inOut' }, 0);
  tl.to(lookTarget, { x: -70, y: 20, z: -50, duration: 0.17, ease: 'sine.inOut' }, 0.45);
  tl.to(lookTarget, { x: 10, y: -70, z: -30, duration: 0.18, ease: 'sine.inOut' }, 0.62);

  // Fog: gentle melt of the far deck; the G/S hide via opacity, not fog
  tl.to(fog, { density: 0.0009, duration: 0.45, ease: 'sine.inOut' }, 0);
  tl.to(fog, { density: 0.0004, duration: 0.17, ease: 'sine.inOut' }, 0.45);
  tl.to(fog, { density: 0.00025, duration: 0.18, ease: 'sine.inOut' }, 0.62);

  // The G + S emerge from darkness during beat 4 — timeline-driven, so
  // scrubbing backwards re-hides them exactly (no pop-in to invert).
  tl.to(logoReveal, { v: 1, duration: 0.17, ease: 'sine.inOut' }, 0.45);

  // Snap: punch the logo, crossfade the world to the real 2D mark
  tl.to(logoGroup.scale, { x: 1.045, y: 1.045, z: 1.045, duration: 0.035, ease: 'power2.out' }, 0.8);
  tl.to(worldFade, { v: 0, duration: 0.06, ease: 'power1.in' }, 0.82);
  tl.to(snapMat, { opacity: 1, duration: 0.06, ease: 'power1.out' }, 0.8);
  tl.to(snapPlane.scale, { x: 1, y: 1, z: 1, duration: 0.08, ease: 'power3.out' }, 0.8);

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
    (shimmerMat.uniforms.uTime as { value: number }).value = elapsed;
    (shimmerMat.uniforms.uFade as { value: number }).value = worldFade.v;

    // World fade for the 3D->2D snap.
    for (const m of fadeMats) m.opacity = worldFade.v;

    // G + S reveal: opacity ramp × world fade. depthWrite follows the
    // reveal so the invisible-at-p=0 geometry can't punch depth holes
    // in the stars/deck behind it; fully reversible under scrub.
    const lr = logoReveal.v * worldFade.v;
    gMat.opacity = lr;
    sMat.opacity = lr;
    const rw = logoReveal.v > 0.002;
    gMat.depthWrite = rw;
    sMat.depthWrite = rw;

    // Star streaks: stretch along the camera's velocity vector, scaled by
    // scroll speed. Still camera -> no streaks, twinkle only.
    camVel.copy(camera.position).sub(prevCamPos).divideScalar(Math.max(dt, 1e-4));
    prevCamPos.copy(camera.position);
    const speed = camVel.length();
    smoothSpeed += (speed - smoothSpeed) * Math.min(1, dt * 5);
    const streakLen = Math.min(120, smoothSpeed * 0.5);
    const sOp = Math.min(0.85, smoothSpeed / 450);
    streakMat.opacity = worldFade.v * sOp;
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
    snapTex.dispose();
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
