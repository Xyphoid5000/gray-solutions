<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useHighScore } from './useHighScore';

/** Space Invaders on the desk phone: drag to move, tap to shoot. */
const emit = defineEmits<{ back: [] }>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const score = ref(0);
const state = ref<'ready' | 'playing' | 'over' | 'win'>('ready');
const { high: best, maybeSave } = useHighScore('invaders');
const newBest = ref(false);

const W = 300;
const H = 400;
const SHIP_W = 36;
const SHIP_H = 18;
const SHIP_Y = H - 36;

let shipX = W / 2 - SHIP_W / 2;
let invaders: { x: number; y: number; alive: boolean }[] = [];
let bullets: { x: number; y: number }[] = [];
let enemyBullets: { x: number; y: number }[] = [];
let invDir = 1;
let raf = 0;
let running = false;
let frame = 0;
let lastShot = 0;

function buildInvaders() {
  invaders = [];
  const cols = 6;
  const rows = 4;
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
  buildInvaders();
  bullets = [];
  enemyBullets = [];
  score.value = 0;
  newBest.value = false;
  shipX = W / 2 - SHIP_W / 2;
  invDir = 1;
  frame = 0;
  state.value = 'playing';
  running = true;
  loop();
}

function shoot() {
  if (state.value !== 'playing') return;
  const now = performance.now();
  if (now - lastShot < 220) return; // fire rate limit
  lastShot = now;
  bullets.push({ x: shipX + SHIP_W / 2, y: SHIP_Y });
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
    state.value = 'win';
    newBest.value = maybeSave(score.value);
    running = false;
    return;
  }
  const speed = 0.6 + (1 - alive.length / 24) * 1.4; // speed up as they die
  let hitEdge = false;
  for (const inv of alive) {
    inv.x += speed * invDir;
    if (inv.x < 4 || inv.x > W - 32) hitEdge = true;
    if (inv.y + 20 > SHIP_Y) {
      state.value = 'over';
      newBest.value = maybeSave(score.value);
      running = false;
      return;
    }
  }
  if (hitEdge) {
    invDir *= -1;
    for (const inv of alive) inv.y += 12;
  }

  // Enemy shooting (random)
  if (frame % 50 === 0 && alive.length > 0) {
    const shooter = alive[Math.floor(Math.random() * alive.length)];
    enemyBullets.push({ x: shooter.x + 14, y: shooter.y + 20 });
  }

  // Bullets
  for (const b of bullets) b.y -= 6;
  bullets = bullets.filter((b) => b.y > -10);

  // Enemy bullets
  for (const b of enemyBullets) b.y += 3.5;
  enemyBullets = enemyBullets.filter((b) => b.y < H + 10);

  // Bullet hits invader
  for (const b of bullets) {
    for (const inv of alive) {
      if (b.x > inv.x && b.x < inv.x + 28 && b.y > inv.y && b.y < inv.y + 20) {
        inv.alive = false;
        b.y = -100; // mark for removal
        score.value += 10;
        break;
      }
    }
  }
  bullets = bullets.filter((b) => b.y > -10);

  // Enemy bullet hits ship
  for (const b of enemyBullets) {
    if (
      b.x > shipX &&
      b.x < shipX + SHIP_W &&
      b.y > SHIP_Y &&
      b.y < SHIP_Y + SHIP_H
    ) {
      state.value = 'over';
      newBest.value = maybeSave(score.value);
      running = false;
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

  // Invaders
  for (const inv of invaders) {
    if (!inv.alive) continue;
    ctx.fillStyle = '#2ecc71';
    // Simple invader shape
    ctx.fillRect(inv.x + 4, inv.y, 20, 6);
    ctx.fillRect(inv.x, inv.y + 6, 28, 8);
    ctx.fillRect(inv.x + 4, inv.y + 14, 6, 6);
    ctx.fillRect(inv.x + 18, inv.y + 14, 6, 6);
  }

  // Ship
  ctx.fillStyle = '#3498db';
  ctx.beginPath();
  ctx.moveTo(shipX + SHIP_W / 2, SHIP_Y);
  ctx.lineTo(shipX + SHIP_W, SHIP_Y + SHIP_H);
  ctx.lineTo(shipX, SHIP_Y + SHIP_H);
  ctx.closePath();
  ctx.fill();

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
  buildInvaders();
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
    </div>
    <canvas
      ref="canvasEl"
      :width="W"
      :height="H"
      class="game-canvas"
      @pointermove="onPointerMove"
      @pointerdown="onPointerDown"
    ></canvas>
    <div v-if="state !== 'playing'" class="game-overlay">
      <p v-if="state === 'ready'">Drag to move · tap to shoot</p>
      <p v-else-if="state === 'over'">Game over! Score {{ score }}</p>
      <p v-else>You win! Score {{ score }}</p>
      <p v-if="newBest" class="new-best">★ New best! ★</p>
      <button type="button" class="game-btn" @click="start">
        {{ state === 'ready' ? 'Start' : 'Play again' }}
      </button>
    </div>
    <p class="game-hint">Drag to move · tap to shoot · Arrows + Space on desktop</p>
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
.game-canvas {
  width: 100%;
  height: auto;
  touch-action: none;
}
.game-overlay {
  position: absolute;
  top: 3.2rem;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
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
.game-hint {
  text-align: center;
  font-size: 0.75rem;
  opacity: 0.6;
  padding: 0.4rem;
  margin: 0;
}
</style>
