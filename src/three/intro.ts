import * as THREE from 'three';
import { gsap } from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Stars, motion streaks, and the environmental shimmer are ON (per Chris,
 * 2026-09-23): "you can add the starts and environmental shimmers back in".
 * Set to false to park them again. Nothing was deleted.
 */
const SHOW_STARS = true;

/**
 * The Gray Solutions scroll-driven cinematic intro.
 *
 * CREATIVE RESET (2026-09-23, per Chris): forget the logo for now. The
 * intro is a pure cinematic bridge sequence built around the approved
 * standalone bridge object — a solid silver-grey trapezoid with slashed
 * ends and real thickness, running down the Z axis into infinite fog.
 * The 3D logo monument (G, crossbar, S, pixels) was REMOVED; morphing the
 * bridge into the logo itself is future work, not this build. No story
 * text (parked behind SHOW_PHRASES, off). The sequence ends with the
 * bridge's far end lining up with the crossbar of his real mark —
 * the morph beginning — then hands off to the hero.
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
 * Beats (all scroll-scrubbed, fully reversible):
 *   - 0 → 0.5: backward dolly, (0,95,520) → (0,140,1150), looking
 *     down the deck's length to a centered vanishing point. Star
 *     streaks fire with scroll speed.
 *   - 0.5 → 0.68: pull-back and rise — the money shot:
 *     (0,420,1650), target (0,0,-300). The full trapezoid receding
 *     into infinite depth.
 *   - 0.68 → 0.85: THE DIVE. The camera swoops forward over the deck
 *     toward the far end: (0,200,-1900), target (0,0,-2698). Fog dips
 *     so the slashed far end arrives crisp and centered in frame.
 *   - 0.85 → 0.92: THE ALIGNMENT. The camera holds; his real mark
 *     (public/logo-mark.png, background keyed to transparent) fades in
 *     on a camera-parented plane, scaled and offset so the mark's
 *     CROSSBAR exactly overlaps the 3D bridge's far end — the bridge
 *     becomes the crossbar. Hold it: he must SEE it.
 *   - 0.92 → 0.97: the 3D world fades out, holding the mark.
 *   - 0.97 → 1.0: the DOM fades the canvas (mark and all) and uncovers
 *     the hero in place — his real logo takes over. Standard crossfade.
 *
 * Division of labor:
 *   - Three.js owns the WORLD: the bridge, stars, streaks, shimmer,
 *     camera, fog, lights, and the mark-alignment plane.
 *   - GSAP owns the STORY — a PAUSED, scroll-scrubbed timeline.
 *     `setProgress(p)` maps scroll progress 0->1 onto the timeline, so
 *     the whole sequence is fully reversible: scrolling up rewinds
 *     everything exactly. The DOM (hero, progress bar, vignette) is
 *     choreographed separately in IntroSequence.vue from the same
 *     scroll position.
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
  // the near/mid deck stays clear and solid.
  const fog = new THREE.FogExp2(0x05070b, 0.0005);
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
  haze.position.set(0, 150, -2600);
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
    transparent: true, // the handoff beat fades the world out (worldFade)
  });

  // ---------- THE BRIDGE ----------
  const bridge = new THREE.Mesh(makeBridgeGeometry(), bridgeMat);
  scene.add(bridge);

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

  // ---------- THE ALIGNMENT: his real mark over the bridge's far end ----------
  // public/logo-mark.png: his mark unchanged, background keyed to
  // transparent (derived from public/logo-lockup.jpg). Measured crossbar
  // bounds in the image (fractions of 464x423): x 0.2586-0.8772,
  // y 0.3073-0.4374 (fw 0.6185, fh 0.1300, center 0.5679/0.3723).
  //
  // The plane is parented to the camera and placed so the mark's
  // CROSSBAR exactly overlaps the 3D bridge's far end at the dive's end
  // pose (camera (0,200,-1900), target (0,0,-2698)):
  //   - the far end edge's apparent angular width (0.2006, tangent) sets
  //     the plane width: Pw = 0.2006 * 36 / 0.6185 = 11.6773
  //     (verified numerically: crossbar corners land at NDC x ±0.102,
  //     the 3D end edge spans NDC x -0.115..+0.089)
  //   - the plane is offset so the crossbar's center lands on the
  //     camera's optical axis = frame center
  //   - rotation.x = +14.07° about the camera's X axis makes the plane
  //     vertical in world space, matching the camera's downward look
  //     angle — the mark reads upright, like a poster on a wall seen
  //     from slightly above, while its crossbar sits on the bridge end
  // The bridge IS the crossbar: the morph beginning. The plane holds
  // through the world fade; the DOM crossfades it into the hero's logo.
  const MARK_PW = 11.6773;
  const MARK_PH = 10.6458; // Pw / (464/423) — the mark's own aspect
  const MARK_TILT = 0.2456; // 14.07°: the camera's downward look angle
  const markTex = new THREE.TextureLoader().load('/logo-mark.png');
  markTex.colorSpace = THREE.SRGBColorSpace;
  const markMat = new THREE.MeshBasicMaterial({
    map: markTex,
    transparent: true,
    opacity: 0,
    fog: false,
    toneMapped: false, // the brand mark keeps its own colors
  });
  const markPlane = new THREE.Mesh(new THREE.PlaneGeometry(MARK_PW, MARK_PH), markMat);
  markPlane.position.set(-0.7929, -1.3187, -36.3305);
  markPlane.rotation.x = MARK_TILT;
  camera.add(markPlane);
  scene.add(camera); // camera-parented objects only render when the camera is in the scene

  // ---------- THE STORY: one paused timeline, scrubbed by scroll ----------
  // Normalized duration 1. Everything below is a pure function of p, so
  // scrolling up rewinds the camera, the fog, the mark, and the world
  // fade exactly.
  //
  // Beats 1-2 (0 -> 0.5): the money sensation is MOVING BACKWARDS. The
  // camera dollies straight back along the bridge (+Z) while looking
  // slightly DOWN its length to the centered vanishing point. Star
  // streaks fire with scroll speed; the far end stays swallowed by fog
  // — infinite.
  //
  // Beat 3 (0.5 -> 0.68): pull-back and rise — THE MONEY SHOT. Straight
  // back along Z and up → (0,420,1650), target (0,0,-300). No X movement
  // anywhere: the full trapezoid receding into infinite depth.
  //
  // Beat 4 (0.68 -> 0.85): THE DIVE. The camera swoops forward OVER the
  // deck toward the far end → (0,200,-1900), target (0,0,-2698). Fog
  // dips so the slashed far end arrives crisp and centered in frame —
  // this is the moment he asked to see.
  //
  // Beat 5 (0.85 -> 0.92): THE ALIGNMENT. The camera holds; his real
  // mark fades in with its crossbar exactly over the 3D bridge's far
  // end. Hold it — the 3D bridge becomes the crossbar.
  //
  // Beat 6 (0.92 -> 0.97): the 3D world (bridge, stars, shimmer, haze)
  // fades out, HOLDING the mark. The DOM then crossfades the canvas —
  // mark and all — into the hero (0.92 -> 1.0), whose real logo takes
  // over. Standard crossfade.
  const lookTarget = new THREE.Vector3(0, 25, -700);
  const worldFade = { v: 1 }; // 1 -> 0 fades the 3D world during beat 6; the mark holds

  const tl = gsap.timeline({ paused: true });
  const cp = camera.position;

  // Camera path: the travel shot, the pull-back, then the dive. The
  // camera never moves in X — the reveal is symmetric and centered.
  tl.to(cp, { x: 0, y: 140, z: 1150, duration: 0.5, ease: 'sine.inOut' }, 0);
  tl.to(cp, { x: 0, y: 420, z: 1650, duration: 0.18, ease: 'power2.inOut' }, 0.5);
  tl.to(cp, { x: 0, y: 200, z: -1900, duration: 0.17, ease: 'power2.inOut' }, 0.68);

  // Look target — eases from the vanishing point toward the deck's
  // mid-distance, then dives with the camera to the far end.
  tl.to(lookTarget, { x: 0, y: 30, z: -700, duration: 0.5, ease: 'sine.inOut' }, 0);
  tl.to(lookTarget, { x: 0, y: 0, z: -300, duration: 0.18, ease: 'sine.inOut' }, 0.5);
  tl.to(lookTarget, { x: 0, y: 0, z: -2698, duration: 0.17, ease: 'power2.inOut' }, 0.68);

  // Fog: the far end melts into the void during the travel; the dip
  // during the dive leaves the far end crisp (~99.5% clear at 728 out)
  // for the alignment.
  tl.to(fog, { density: 0.00038, duration: 0.18, ease: 'sine.inOut' }, 0.5);
  tl.to(fog, { density: 0.0001, duration: 0.17, ease: 'sine.inOut' }, 0.68);

  // The alignment: his mark fades in, crossbar over the bridge's end.
  tl.to(markMat, { opacity: 1, duration: 0.07, ease: 'power1.out' }, 0.85);

  // The handoff: the 3D world fades, holding the mark.
  tl.to(worldFade, { v: 0, duration: 0.05, ease: 'power1.in' }, 0.92);

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
      (shimmerMat.uniforms.uFade as { value: number }).value = worldFade.v;
    }

    // World fade for the handoff beat: the 3D world goes, the mark holds.
    // Timeline-driven, so scrubbing backwards restores everything exactly.
    const wf = worldFade.v;
    bridgeMat.opacity = wf;
    starMat.opacity = 0.75 * wf;
    hazeMat.opacity = wf;

    // Star streaks: stretch along the camera's velocity vector, scaled by
    // scroll speed. Still camera -> no streaks, twinkle only.
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
    markTex.dispose();
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
