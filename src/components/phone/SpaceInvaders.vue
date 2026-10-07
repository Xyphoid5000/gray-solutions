<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useHighScore } from './useHighScore';

/** Space Invaders on the desk phone: drag to move, tap to shoot.
    Endless waves — each cleared wave spawns a tougher one. Killed
    invaders sometimes drop powerups (rapid fire, triple shot, shield). */
const emit = defineEmits<{ back: [] }>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const score = ref(0);
const lives = ref(3);
const wave = ref(1);
const waveBanner = ref('');
const state = ref<'ready' | 'playing' | 'over'>('ready');
const { high: best, maybeSave } = useHighScore('invaders');
const newBest = ref(false);

const W = 300;
const H = 540;
const SHIP_W = 36;
const SHIP_H = 18;
const SHIP_Y = H - 36;

type PowerKind = 'rapid' | 'triple' | 'shield' | 'life';
interface PowerUp { x: number; y: number; kind: PowerKind }

let shipX = W / 2 - SHIP_W / 2;
let invaders: { x: number; y: number; alive: boolean }[] = [];
let bullets: { x: number; y: number; dx: number }[] = [];
let enemyBullets: { x: number; y: number }[] = [];
let powerups: PowerUp[] = [];
let invDir = 1;
let raf = 0;
let running = false;
let frame = 0;
let lastShot = 0;
let rapidUntil = 0;
let tripleUntil = 0;
let shielded = false;

const POWER_STYLE: Record<PowerKind, { color: string; glyph: string }> = {
  rapid: { color: '#3498db', glyph: '≋' },
  triple: { color: '#9b59b6', glyph: '⋔' },
  shield: { color: '#2ecc71', glyph: '◈' },
  life: { color: '#e74c3c', glyph: '♥' },
};

function buildWave(n: number) {
  invaders = [];
  powerups = [];
  const cols = 6;
  const rows = Math.min(3 + Math.ceil(n / 2), 6);
  const gapX = 12;
  const gapY = 14;
  const iw = 28;
  const ih = 20;
  const totalW = cols * iw + (cols - 1) * gapX;
  const x0 = (W - totalW) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      invaders.push({
        x: x0 + c * (iw + gapX),
        y: 50 + r * (ih + gapY),
        alive: true,
      });
    }
  }
}

function start() {
  wave.value = 1;
  score.value = 0;
  lives.value = 3;
  newBest.value = false;
  rapidUntil = 0;
  tripleUntil = 0;
  shielded = false;
  buildWave(1);
  bullets = [];
  enemyBullets = [];
  shipX = W / 2 - SHIP_W / 2;
  invDir = 1;
  frame = 0;
  state.value = 'playing';
  running = true;
  loop();
}

function nextWave() {
  wave.value++;
  waveBanner.value = `Wave ${wave.value}`;
  setTimeout(() => { waveBanner.value = ''; }, 1600);
  buildWave(wave.value);
  bullets = [];
  enemyBullets = [];
  invDir = 1;
}

function fireCooldown() {
  return rapidUntil > performance.now() ? 90 : 220;
}

function shoot() {
  if (state.value !== 'playing') return;
  const now = performance.now();
  if (now - lastShot < fireCooldown()) return;
  lastShot = now;
  const cx = shipX + SHIP_W / 2;
  if (tripleUntil > now) {
    bullets.push({ x: cx, y: SHIP_Y, dx: -1.2 });
    bullets.push({ x: cx, y: SHIP_Y, dx: 0 });
    bullets.push({ x: cx, y: SHIP_Y, dx: 1.2 });
  } else {
    bullets.push({ x: cx, y: SHIP_Y, dx: 0 });
  }
}

function dropPowerup(x: number, y: number) {
  if (Math.random() > 0.12) return;
  const kinds: PowerKind[] = ['rapid', 'triple', 'shield', 'rapid', 'triple', 'shield', 'life'];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  if (kind === 'life' && Math.random() > 0.2) return;
  powerups.push({ x, y, kind });
}

function applyPowerup(kind: PowerKind) {
  const now = performance.now();
  if (kind === 'rapid') rapidUntil = now + 12000;
  else if (kind === 'triple') tripleUntil = now + 12000;
  else if (kind === 'shield') shielded = true;
  else if (kind === 'life') lives.value = Math.min(lives.value + 1, 5);
  score.value += 5;
}

function hitShip() {
  if (shielded) {
    shielded = false;
    enemyBullets = [];
    return;
  }
  lives.value--;
  enemyBullets = [];
  if (lives.value <= 0) {
    state.value = 'over';
    newBest.value = maybeSave(score.value);
    running = false;
  }
}

function loop() {
  if (!running) return;
  update();
  draw();
  raf = requestAnimationFrame(loop);
}

function update() {
  frame++;

  // Invaders move
  const alive = invaders.filter((i) => i.alive);
  if (alive.length === 0) {
    nextWave();
    return;
  }
  const speed = (0.6 + (1 - alive.length / 36) * 1.4) * (1 + wave.value * 0.08);
  let hitEdge = false;
  for (const inv of alive) {
    inv.x += speed * invDir;
    if (inv.x < 4 || inv.x > W - 32) hitEdge = true;
    if (inv.y + 20 > SHIP_Y) {
      hitShip();
      // Push the wave back up so it doesn't instantly re-trigger
      for (const i of alive) i.y -= 30;
      if (state.value !== 'playing') return;
    }
  }
  if (hitEdge) {
    invDir *= -1;
    for (const inv of alive) inv.y += 12;
  }

  // Enemy shooting — more aggressive each wave
  const fireRate = Math.max(50 - wave.value * 4, 22);
  if (frame % fireRate === 0 && alive.length > 0) {
    const shooter = alive[Math.floor(Math.random() * alive.length)];
    enemyBullets.push({ x: shooter.x + 14, y: shooter.y + 20 });
  }

  // Bullets
  for (const b of bullets) {
    b.y -= 6;
    b.x += b.dx;
  }
  bullets = bullets.filter((b) => b.y > -10 && b.x > -10 && b.x < W + 10);

  // Enemy bullets
  const enemySpeed = 3.5 + wave.value * 0.2;
  for (const b of enemyBullets) b.y += enemySpeed;
  enemyBullets = enemyBullets.filter((b) => b.y < H + 10);

  // Bullet hits invader
  for (const b of bullets) {
    for (const inv of alive) {
      if (b.x > inv.x && b.x < inv.x + 28 && b.y > inv.y && b.y < inv.y + 20) {
        inv.alive = false;
        b.y = -100; // mark for removal
        score.value += 10;
        dropPowerup(inv.x + 14, inv.y + 10);
        break;
      }
    }
  }
  bullets = bullets.filter((b) => b.y > -10);

  // Powerups falling
  for (const p of powerups) {
    p.y += 1.8;
    if (
      p.y >= SHIP_Y - 8 &&
      p.y <= SHIP_Y + SHIP_H + 8 &&
      p.x >= shipX - 10 &&
      p.x <= shipX + SHIP_W + 10
    ) {
      applyPowerup(p.kind);
      p.y = H + 100; // mark caught
    }
  }
  powerups = powerups.filter((p) => p.y < H + 50);

  // Enemy bullet hits ship
  for (const b of enemyBullets) {
    if (
      b.x > shipX &&
      b.x < shipX + SHIP_W &&
      b.y > SHIP_Y &&
      b.y < SHIP_Y + SHIP_H
    ) {
      hitShip();
      return;
    }
  }
}

function draw() {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Space
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, W, H);
  // Stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 73) % W;
    const sy = (i * 137) % H;
    ctx.globalAlpha = 0.3 + ((i * 13) % 10) / 20;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  // Invaders (color shifts per wave)
  const hues = ['#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#e74c3c'];
  ctx.fillStyle = hues[(wave.value - 1) % hues.length];
  for (const inv of invaders) {
    if (!inv.alive) continue;
    ctx.fillRect(inv.x + 4, inv.y, 20, 6);
    ctx.fillRect(inv.x, inv.y + 6, 28, 8);
    ctx.fillRect(inv.x + 4, inv.y + 14, 6, 6);
    ctx.fillRect(inv.x + 18, inv.y + 14, 6, 6);
  }

  // Powerups
  for (const p of powerups) {
    const s = POWER_STYLE[p.kind];
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.roundRect(p.x - 11, p.y - 11, 22, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.glyph, p.x, p.y + 1);
  }

  // Ship
  ctx.fillStyle = '#3498db';
  ctx.beginPath();
  ctx.moveTo(shipX + SHIP_W / 2, SHIP_Y);
  ctx.lineTo(shipX + SHIP_W, SHIP_Y + SHIP_H);
  ctx.lineTo(shipX, SHIP_Y + SHIP_H);
  ctx.closePath();
  ctx.fill();
  // Shield ring
  if (shielded) {
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(shipX + SHIP_W / 2, SHIP_Y + SHIP_H / 2, SHIP_W / 2 + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Bullets
  ctx.fillStyle = '#f1c40f';
  for (const b of bullets) ctx.fillRect(b.x - 1.5, b.y - 8, 3, 8);

  // Enemy bullets
  ctx.fillStyle = '#e74c3c';
  for (const b of enemyBullets) ctx.fillRect(b.x - 1.5, b.y - 6, 3, 6);
}

function onPointerMove(e: PointerEvent) {
  if (state.value !== 'playing') return;
  const canvas = canvasEl.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * W;
  shipX = Math.max(0, Math.min(W - SHIP_W, x - SHIP_W / 2));
}

function onPointerDown() {
  if (state.value === 'ready') {
    start();
    return;
  }
  shoot();
}

function onKey(e: KeyboardEvent) {
  if (state.value !== 'playing') {
    if (e.code === 'Space' || e.code === 'Enter') start();
    return;
  }
  if (e.key === 'ArrowLeft') shipX = Math.max(0, shipX - 16);
  if (e.key === 'ArrowRight') shipX = Math.min(W - SHIP_W, shipX + 16);
  if (e.code === 'Space') {
    e.preventDefault();
    shoot();
  }
}

onMounted(() => {
  buildWave(1);
  draw();
  window.addEventListener('keydown', onKey);
});

onUnmounted(() => {
  running = false;
  cancelAnimationFrame(raf);
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div class="game-wrap">
    <div class="game-head">
      <button type="button" class="game-back" @click="emit('back')" aria-label="Back">‹</button>
      <span>Score {{ score }}</span>
      <span class="best">Best {{ best }}</span>
      <span class="wave">Wave {{ wave }}</span>
      <span class="lives">● {{ lives }}</span>
    </div>
    <canvas
      ref="canvasEl"
      :width="W"
      :height="H"
      class="game-canvas"
      @pointermove="onPointerMove"
      @pointerdown="onPointerDown"
    ></canvas>
    <div v-if="waveBanner" class="wave-banner">{{ waveBanner }}</div>
    <div v-if="state !== 'playing'" class="game-overlay">
      <p v-if="state === 'ready'">Drag to move · tap to shoot</p>
      <p v-else>Game over! Reached wave {{ wave }}</p>
      <p v-if="newBest" class="new-best">★ New best! ★</p>
      <div class="overlay-btns">
        <button type="button" class="game-btn" @click="start">
          {{ state === 'ready' ? 'Start' : 'Play again' }}
        </button>
        <button type="button" class="game-btn game-btn-ghost" @click="emit('back')">
          Back
        </button>
      </div>
    </div>
    <p class="game-hint">Catch falling powerups · Arrows + Space on desktop</p>
  </div>
</template>

<style scoped>
.game-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.game-head {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem 0.8rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(128, 128, 128, 0.25);
}
.game-back {
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: inherit;
  padding: 0.2rem 0.5rem;
}
.best {
  color: #8b93a5;
  font-size: 0.85em;
}
.new-best {
  color: #f1c40f;
  font-weight: 700;
}
.wave {
  color: #9b59b6;
}
.lives {
  margin-left: auto;
  color: #e74c3c;
}
.game-canvas {
  width: 100%;
  height: auto;
  touch-action: none;
}
.wave-banner {
  position: absolute;
  top: 40%;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
  pointer-events: none;
}
.game-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
}
.overlay-btns {
  display: flex;
  gap: 0.8rem;
}
.game-btn {
  padding: 0.7rem 1.8rem;
  border-radius: 999px;
  border: none;
  background: #f2ecdf;
  color: #0a0d16;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.game-btn-ghost {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
}
.game-hint {
  text-align: center;
  font-size: 0.75rem;
  opacity: 0.6;
  padding: 0.4rem;
  margin: 0;
}
</style>
