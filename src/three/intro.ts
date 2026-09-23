import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * TEMP SIMPLIFICATION (2026-09-23, per Chris): the star field — stars,
 * motion streaks, shimmer — is parked while the bridge scroll-out is the
 * focus. Set to true to bring it all back. Nothing was deleted.
 */
const SHOW_STARS = false;

/**
 * The Gray Solutions scroll-driven cinematic intro.
 *
 * SIMPLIFICATION PASS (2026-09-23, per Chris): forget stars and text —
 * the bridge scroll-out is the whole shot. The star field (stars,
 * streaks, shimmer) is parked behind SHOW_STARS below (off); the DOM
 * story phrases are parked behind SHOW_PHRASES in IntroSequence.vue
 * (off). Nothing deleted — both return in a later pass.
 *
 * THE GEOMETRY (per Chris's schematic): the bridge IS the G's crossbar —
 * ONE straight bar, one line. A single 64×56 chrome bar runs along Z
 * (z −200 → 2240), centered x=0, y=0: it is BOTH the bridge deck and the
 * crossbar. No separate crossbar mesh exists. The grey G (v4's extruded
 * annulus sector, gap facing +X in shape space) rides in a group with
 * rotation.y = π/2, so its face lies in the ZY plane and the bar passes
 * through its middle along Z: interpenetrating the arc band (same chrome
 * = one cast piece) and spanning the G's opening as the crossbar. The
 * camera ends on +X looking down −X; the gap faces screen-right (−Z),
 * like the mark. The blue S ribbon + pixel cubes ride in the same
 * rotated group, landing lower-right / upper-right of the G.
 *
 * Beats:
 *   - 0 → 0.45: the money shot. Camera dollies straight BACK over the
 *     bar, (0,52,600) → (0,85,1150), looking down its length to a
 *     centered vanishing point. Railing posts stream past.
 *   - 0.45 → 0.62: the monument's opacity ramps 0→1 on the scrubbed
 *     timeline (never fog-reliant); the camera starts its sweep toward
 *     (450,200,700) with the look target gluing to the monument (0,0,0).
 *   - 0.62 → 0.8: the sweep completes → (950,300,150). THE REVEAL: the
 *     bar you rode lies horizontal in frame as the G's crossbar.
 *   - 0.8 → 0.9: scale punch, then a crossfade of the 3D world to a plane
 *     textured with Chris's ACTUAL logo-lockup.jpg — the brand anchor.
 *     The DOM hero (same lockup) is then uncovered in place behind the
 *     fading canvas (see IntroSequence.vue).
 *
 * Division of labor:
 *   - Three.js owns the WORLD: the bar, G, S, pixels, bridge furniture,
 *     camera, fog, snap plane. (Stars/streaks/shimmer parked, off.)
 *   - GSAP owns the STORY — but as a PAUSED, scroll-scrubbed timeline.
 *     `setProgress(p)` maps scroll progress 0->1 onto the timeline, so the
 *     whole sequence is fully reversible: scrolling up rewinds everything
 *     exactly. The DOM (hero, progress bar, vignette) is choreographed
 *     separately in IntroSequence.vue from the same scroll position.
 *
 * Restrained by design: the bar, edge lights, railings, fog. No assembly
 * animations, no fly-ins, no bursts.
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
/* THE BAR: one continuous 64×56 chrome bar along Z (z −200 → 2240),    */
/* centered x=0, y=0. It is BOTH the bridge deck and the G's crossbar — */
/* a single mesh; no separate crossbar exists. It starts UNDER the p=0 */
/* camera and runs ahead through the G to the vanishing point — and    */
/* behind the camera, to sell "infinite".                              */
/* The G stands ~360 tall; its face is rotated into the ZY plane (see  */
/* the monument group below) so the bar passes through its middle.     */
/* ------------------------------------------------------------------ */

const G_OUTER_R = 180;
const G_INNER_R = 108;
const G_GAP_HALF = THREE.MathUtils.degToRad(52); // opening faces +X in shape space, like the mark
const G_DEPTH = 64;
const G_BEVEL_T = 12;
const G_BEVEL_S = 10;

const DECK_W = 64; // bar width == the G's crossbar width: the bar IS the crossbar
const DECK_H = 56; // bar thickness
const DECK_Z_FAR = -200; // ahead of the G, past its opening toward the vanishing point
const DECK_Z_NEAR = 2240; // far behind the camera's furthest travel

/** The G's arc: a bold annulus sector with clean radial-cut terminals. */
function makeGArcGeometry(): THREE.ExtrudeGeometry {
  const aTop = G_GAP_HALF;
  const aBot = Math.PI * 2 - G_GAP_HALF;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, G_OUTER_R, aTop, aBot, false); // outer: the long way around
  shape.lineTo(G_INNER_R * Math.cos(aBot), G_INNER_R * Math.sin(aBot));
  shape.absarc(0, 0, G_INNER_R, aBot, aTop, true); // inner: back again
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: G_DEPTH,
    bevelEnabled: true,
    bevelThickness: G_BEVEL_T,
    bevelSize: G_BEVEL_S,
    bevelSegments: 4,
    curveSegments: 128,
  });
  geo.translate(0, 0, -G_DEPTH / 2);
  return geo;
}

/**
 * The blue S: a sculpted ribbon swept along a hand-tuned bezier
 * centerline (C1-smooth at every joint), with slash-cut terminals from
 * the ribbon's end tangents. Extruded + beveled for real depth.
 */
function makeSRibbonGeometry(): THREE.ExtrudeGeometry {
  const v3 = (x: number, y: number) => new THREE.Vector3(x, y, 0);
  const path = new THREE.CurvePath<THREE.Vector3>();
  path.add(new THREE.CubicBezierCurve3(v3(30, 58), v3(2, 64), v3(-28, 52), v3(-34, 28)));
  path.add(new THREE.CubicBezierCurve3(v3(-34, 28), v3(-40, 4), v3(-16, -6), v3(8, -10)));
  path.add(new THREE.CubicBezierCurve3(v3(8, -10), v3(30, -14), v3(40, -24), v3(34, -44)));
  path.add(new THREE.CubicBezierCurve3(v3(34, -44), v3(28, -62), v3(-2, -66), v3(-30, -56)));

  const pts = path.getPoints(120);
  const n = pts.length;
  const half = 26;
  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const pPrev = pts[Math.max(0, i - 1)];
    const pNext = pts[Math.min(n - 1, i + 1)];
    const tx = pNext.x - pPrev.x;
    const ty = pNext.y - pPrev.y;
    const tl = Math.hypot(tx, ty) || 1;
    const nx = -ty / tl;
    const ny = tx / tl;
    left.push(new THREE.Vector2(p.x + nx * half, p.y + ny * half));
    right.push(new THREE.Vector2(p.x - nx * half, p.y - ny * half));
  }
  const shape = new THREE.Shape();
  shape.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < n; i++) shape.lineTo(left[i].x, left[i].y);
  for (let i = n - 1; i >= 0; i--) shape.lineTo(right[i].x, right[i].y);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 52,
    bevelEnabled: true,
    bevelThickness: 8,
    bevelSize: 8,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geo.translate(0, 0, -26);
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
  // Gentle exponential fog: melts the far deck into black, adds atmosphere
  // around the reveal. It is NOT the monument's hiding mechanism — the
  // G/S/pixels hide via opacity on the timeline (video QA proved fog
  // alone unreliable).
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
  // p=0: sitting low over the bridge deck — the G's crossbar — looking
  // slightly DOWN its length to a CENTERED vanishing point. The deck
  // starts under/behind the camera (z=2240 > camera z=600) and fills the
  // lower frame as a perspective triangle (storyboard frame 1).
  camera.position.set(0, 52, 600);
  scene.add(camera); // the 2D snap plane rides parented to the camera

  // ---------- lights ----------
  // Dramatic dark-space studio: a strong key rakes the G so the bevels
  // throw highlights and the grey metal READS on black; a blue fill
  // ties the S and the bridge edge lights together.
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
  haze.position.set(0, 150, -2600);
  scene.add(haze);

  // ---------- materials ----------
  // The bar + the G arc share IDENTICAL params (separate instances so
  // the monument's opacity can ramp independently of the always-visible
  // bar). Same lighting response => the junctions read as one cast
  // piece. Params chosen so the metal reads light GREY on black: bright
  // base, moderate roughness, hot env.
  const chromeParams = {
    color: 0xdde3ea,
    metalness: 0.85,
    roughness: 0.34,
    envMapIntensity: 1.7,
    transparent: true,
  };
  const deckMat = new THREE.MeshStandardMaterial({ ...chromeParams }); // opacity 1: visible from frame one
  const gMat = new THREE.MeshStandardMaterial({ ...chromeParams, opacity: 0 }); // revealed at beat 4

  // Glossy blue ribbon S: clearcoat for that wet sculpted look.
  const sMat = new THREE.MeshPhysicalMaterial({
    color: 0x2b6bff,
    metalness: 0.3,
    roughness: 0.28,
    clearcoat: 1.0,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.5,
    emissive: 0x0a2470,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0, // revealed at beat 4
  });

  // Pixel cubes: the mark's pixel motif, translated to 3D.
  const pixelMat = new THREE.MeshStandardMaterial({
    color: 0x2f9bff,
    emissive: 0x1a5fff,
    emissiveIntensity: 0.9,
    metalness: 0.4,
    roughness: 0.3,
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

  // Blue edge strips: bright enough to read from frame one, tying the
  // bridge to the blue S.
  const edgeMat = new THREE.MeshBasicMaterial({
    color: 0x3fa9ff,
    transparent: true,
  });

  // ---------- the monument: grey G + blue S + pixels ----------
  // Opacity 0 from frame one — revealed ONLY by the timeline at beat 4.
  // rotation.y = π/2 lays the G's face in the ZY plane (facing ±X): the
  // bar passes through the monument's middle along Z — interpenetrating
  // the arc band (same chrome = one cast piece) and spanning the G's
  // opening as the crossbar. S + pixels ride along into place.
  const logoGroup = new THREE.Group();
  logoGroup.rotation.y = Math.PI / 2;

  const gArc = new THREE.Mesh(makeGArcGeometry(), gMat);
  logoGroup.add(gArc);

  const sGroup = new THREE.Group();
  sGroup.add(new THREE.Mesh(makeSRibbonGeometry(), sMat));
  sGroup.scale.setScalar(0.8);
  sGroup.position.set(150, -140, 10);
  logoGroup.add(sGroup);

  const pixelGeo = new THREE.BoxGeometry(20, 20, 20);
  const pixelSpots: Array<[number, number, number, number]> = [
    // x, y, z, rotY — scattered upper-right of the S, like the mark
    [250, 20, 0, 0.4],
    [285, 55, 10, -0.3],
    [320, 40, -10, 0.7],
    [285, 90, 0, 0.15],
  ];
  for (const [px, py, pz, ry] of pixelSpots) {
    const cube = new THREE.Mesh(pixelGeo, pixelMat);
    cube.position.set(px, py, pz);
    cube.rotation.y = ry;
    logoGroup.add(cube);
  }
  scene.add(logoGroup);

  // ---------- THE BAR: the bridge IS the G's crossbar ----------
  // ONE straight bar along Z — single mesh, the v4 grey chrome (it reads
  // grey; params untouched). Visible from frame one; the monument fades
  // in around its middle at beat 4.
  const deckLen = DECK_Z_NEAR - DECK_Z_FAR;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(DECK_W, DECK_H, deckLen), deckMat);
  deck.position.set(0, 0, (DECK_Z_NEAR + DECK_Z_FAR) / 2);
  scene.add(deck);

  // Glowing blue edge strips along the deck's top edges.
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, deckLen), edgeMat);
    strip.position.set(side * (DECK_W / 2 - 3), DECK_H / 2 + 0.75, (DECK_Z_NEAR + DECK_Z_FAR) / 2);
    scene.add(strip);
  }

  // Railings: instanced posts streaming past in beats 1-3 + top rails.
  const postGeo = new THREE.BoxGeometry(2.5, 16, 2.5);
  const postZs: number[] = [];
  for (let z = 1300; z > 220; z -= 70) postZs.push(z); // stream past during the 600→1150 dolly; clear of the monument
  const posts = new THREE.InstancedMesh(postGeo, railMat, postZs.length * 2);
  const dummy = new THREE.Object3D();
  let pi = 0;
  for (const side of [-1, 1]) {
    for (const z of postZs) {
      dummy.position.set(side * (DECK_W / 2 - 2), DECK_H / 2 + 8, z);
      dummy.updateMatrix();
      posts.setMatrixAt(pi++, dummy.matrix);
    }
  }
  posts.instanceMatrix.needsUpdate = true;
  scene.add(posts);

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, deckLen), railMat);
    rail.position.set(side * (DECK_W / 2 - 2), DECK_H / 2 + 16.5, (DECK_Z_NEAR + DECK_Z_FAR) / 2);
    scene.add(rail);
  }

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

  // ---------- beat 6: the REAL logo, snapped from 3D to 2D ----------
  // Chris's actual mark — a plane textured with public/logo-lockup.jpg,
  // parented to the camera so it fills the frame for the snap. The brand
  // anchor: only the 3D version is our interpretation.
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
  // camera dollies straight back along the bar (+Z) while looking slightly
  // DOWN its length to the centered vanishing point. Railing posts stream
  // past; the monument sits at opacity 0 — not the subject.
  //
  // Beat 4 (0.45 -> 0.62): the monument's opacity ramps 0->1 on this
  // timeline (NOT fog) while the camera starts its sweep. The G emerges
  // from darkness with the bar already running through it — one piece
  // that was always there, revealed, never assembled.
  //
  // Beat 5 (0.62 -> 0.8): the sweep completes to (950,300,150), look
  // target glued to the monument. THE REVEAL: the bar you rode lies
  // horizontal in frame as the G's crossbar.
  //
  // Beat 6 (0.8 -> 0.9): scale punch, then crossfade the whole 3D world
  // to the real 2D logo plane. The DOM then fades the canvas (0.9-1.0)
  // and uncovers the hero in place.
  const lookTarget = new THREE.Vector3(0, 26, -500);
  const worldFade = { v: 1 }; // 1 -> 0 drives every visible 3D material's opacity
  const logoReveal = { v: 0 }; // 0 -> 1 reveals the monument during beat 4
  const fadeMats: THREE.Material[] = [deckMat, railMat, edgeMat, starMat];

  const tl = gsap.timeline({ paused: true });
  const cp = camera.position;

  // Camera path
  tl.to(cp, { x: 0, y: 85, z: 1150, duration: 0.45, ease: 'sine.inOut' }, 0);
  tl.to(cp, { x: 450, y: 200, z: 700, duration: 0.17, ease: 'power2.inOut' }, 0.45);
  tl.to(cp, { x: 950, y: 300, z: 150, duration: 0.18, ease: 'power2.inOut' }, 0.62);

  // Look target — glued to the monument (0,0,0) through the whole sweep
  // so the G never leaves frame.
  tl.to(lookTarget, { x: 0, y: 30, z: -500, duration: 0.45, ease: 'sine.inOut' }, 0);
  tl.to(lookTarget, { x: 0, y: 0, z: 0, duration: 0.17, ease: 'sine.inOut' }, 0.45);
  tl.to(lookTarget, { x: 0, y: 0, z: 0, duration: 0.18, ease: 'sine.inOut' }, 0.62);

  // Fog: gentle melt of the far deck; the monument hides via opacity, not fog
  tl.to(fog, { density: 0.0009, duration: 0.45, ease: 'sine.inOut' }, 0);
  tl.to(fog, { density: 0.0004, duration: 0.17, ease: 'sine.inOut' }, 0.45);
  tl.to(fog, { density: 0.00025, duration: 0.18, ease: 'sine.inOut' }, 0.62);

  // The monument emerges from darkness during beat 4 — timeline-driven,
  // so scrubbing backwards re-hides it exactly (no pop-in to invert).
  tl.to(logoReveal, { v: 1, duration: 0.17, ease: 'sine.inOut' }, 0.45);

  // Snap: punch the monument, crossfade the world to the real 2D mark
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
    // Parked behind SHOW_STARS — the whole block below returns with it.
    if (SHOW_STARS) {
      (shimmerMat.uniforms.uTime as { value: number }).value = elapsed;
      (shimmerMat.uniforms.uFade as { value: number }).value = worldFade.v;
    }

    // World fade for the 3D->2D snap.
    for (const m of fadeMats) m.opacity = worldFade.v;

    // Monument reveal: opacity ramp × world fade. depthWrite follows the
    // reveal so the invisible-at-p=0 geometry can't punch depth holes
    // in the stars/deck behind it; fully reversible under scrub.
    const lr = logoReveal.v * worldFade.v;
    gMat.opacity = lr;
    sMat.opacity = lr;
    pixelMat.opacity = lr;
    const rw = logoReveal.v > 0.002;
    gMat.depthWrite = rw;
    sMat.depthWrite = rw;
    pixelMat.depthWrite = rw;

    // Star streaks: stretch along the camera's velocity vector, scaled by
    // scroll speed. Still camera -> no streaks, twinkle only.
    // Parked behind SHOW_STARS — the whole block below returns with it.
    if (SHOW_STARS) {
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
