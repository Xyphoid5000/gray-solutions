<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useHighScore } from './useHighScore';

/** Brick Breaker on the desk phone: drag the paddle, break all bricks.
    Clearing a level generates a fresh random layout; broken bricks
    sometimes drop powerups (multi-ball, wide paddle, slow-mo, extra life). */
const emit = defineEmits<{ back: [] }>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const score = ref(0);
const lives = ref(3);
const level = ref(1);
const levelBanner = ref('');
const state = ref<'ready' | 'playing' | 'over'>('ready');
const { high: best, maybeSave } = useHighScore('brick');
const newBest = ref(false);

const W = 300;
const H = 540;
const PADDLE_H = 10;
const BALL_R = 6;
const BASE_PADDLE_W = 70;

interface Brick { x: number; y: number; w: number; h: number; color: string; alive: boolean; hits: number }
interface Ball { x: number; y: number; dx: number; dy: number }
type PowerKind = 'multi' | 'wide' | 'slow' | 'life' | 'burning' | 'shrink' | 'speedup';
interface PowerUp { x: number; y: number; kind: PowerKind }

let paddleX = W / 2 - BASE_PADDLE_W / 2;
let paddleW = BASE_PADDLE_W;
let balls: Ball[] = [];
let bricks: Brick[] = [];
let powerups: PowerUp[] = [];
let paddleSizeUntil = 0;
let paddleSizeFactor = 1;
let ballSpeedUntil = 0;
let ballSpeedFactor = 1;
let burningUntil = 0;
let raf = 0;
let running = false;

const BRICK_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db'];
const POWER_STYLE: Record<PowerKind, { color: string; glyph: string }> = {
  multi: { color: '#3498db', glyph: '×3' },
  wide: { color: '#2ecc71', glyph: '⇔' },
  slow: { color: '#f1c40f', glyph: '◔' },
  life: { color: '#e74c3c', glyph: '♥' },
  burning: { color: '#ff6b35', glyph: '🔥' },
  shrink: { color: '#c0392b', glyph: '›‹' },
  speedup: { color: '#f39c12', glyph: '⚡' },
};

function ballSpeed() {
  return Math.min(3 + level.value * 0.25, 5);
}

function buildLevel(lv: number) {
  bricks = [];
  powerups = [];
  const cols = 7;
  const rows = Math.min(4 + lv, 7);
  const gap = 4;
  const bw = (W - gap * (cols + 1)) / cols;
  const bh = 18;
  const pattern = Math.floor(Math.random() * 4);
  const toughChance = lv >= 2 ? Math.min(0.1 + lv * 0.03, 0.3) : 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Random layouts
      if (pattern === 1 && (r + c) % 2 === 1) continue; // checkerboard
      if (pattern === 2 && Math.abs(c - 3) + Math.abs(r - rows / 2) > 3.5) continue; // diamond
      if (pattern === 3 && Math.random() < 0.3) continue; // sparse
      const tough = Math.random() < toughChance;
      bricks.push({
        x: gap + c * (bw + gap),
        y: 50 + r * (bh + gap),
        w: bw,
        h: bh,
        color: BRICK_COLORS[r % BRICK_COLORS.length],
        alive: true,
        hits: tough ? 2 : 1,
      });
    }
  }
  // Guarantee at least a few bricks
  if (bricks.length < 8) buildLevel(lv);
}

function resetBalls() {
  const s = ballSpeed();
  balls = [{
    x: paddleX + paddleW / 2,
    y: H - 40,
    dx: s * (Math.random() > 0.5 ? 1 : -1),
    dy: -s,
  }];
}

function start() {
  level.value = 1;
  score.value = 0;
  lives.value = 3;
  newBest.value = false;
  paddleW = BASE_PADDLE_W;
  paddleSizeUntil = 0;
  paddleSizeFactor = 1;
  ballSpeedUntil = 0;
  ballSpeedFactor = 1;
  burningUntil = 0;
  buildLevel(1);
  resetBalls();
  state.value = 'playing';
  running = true;
  loop();
}

function nextLevel() {
  level.value++;
  levelBanner.value = `Level ${level.value}`;
  setTimeout(() => { levelBanner.value = ''; }, 1600);
  buildLevel(level.value);
  resetBalls();
}

function dropPowerup(x: number, y: number) {
  if (Math.random() > 0.13) return;
  const kinds: PowerKind[] = [
    'multi', 'multi', 'wide', 'wide', 'slow', 'slow',
    'burning', 'burning',
    'shrink', 'shrink', 'shrink', 'speedup', 'speedup', 'speedup',
    'life',
  ];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  // Extra life is rare — re-roll most of the time
  if (kind === 'life' && Math.random() > 0.25) return;
  powerups.push({ x, y, kind });
}

function applyPaddleMod(factor: number, durationMs: number) {
  paddleSizeFactor = factor;
  paddleW = BASE_PADDLE_W * factor;
  paddleSizeUntil = performance.now() + durationMs;
  paddleX = Math.max(0, Math.min(W - paddleW, paddleX));
}

function applySpeedMod(factor: number, durationMs: number) {
  const now = performance.now();
  // Undo the current mod before applying the new one
  if (ballSpeedUntil > now) {
    for (const b of balls) {
      b.dx /= ballSpeedFactor;
      b.dy /= ballSpeedFactor;
    }
  }
  ballSpeedFactor = factor;
  for (const b of balls) {
    b.dx *= factor;
    b.dy *= factor;
  }
  ballSpeedUntil = now + durationMs;
}

function applyPowerup(kind: PowerKind) {
  if (kind === 'multi') {
    const extra: Ball[] = [];
    for (const b of balls) {
      if (balls.length + extra.length >= 6) break;
      const speed = Math.hypot(b.dx, b.dy);
      for (const a of [-0.5, 0.5]) {
        const ang = Math.atan2(b.dy, b.dx) + a;
        extra.push({ x: b.x, y: b.y, dx: Math.cos(ang) * speed, dy: Math.sin(ang) * speed });
      }
    }
    balls.push(...extra);
    score.value += 5;
  } else if (kind === 'wide') {
    applyPaddleMod(1.6, 15000);
  } else if (kind === 'shrink') {
    applyPaddleMod(0.6, 12000);
  } else if (kind === 'slow') {
    applySpeedMod(0.7, 10000);
  } else if (kind === 'speedup') {
    applySpeedMod(1.4, 8000);
  } else if (kind === 'burning') {
    burningUntil = performance.now() + 6000;
  } else if (kind === 'life') {
    lives.value = Math.min(lives.value + 1, 5);
  }
}

function loop() {
  if (!running) return;
  update();
  draw();
  raf = requestAnimationFrame(loop);
}

function update() {
  const now = performance.now();
  if (paddleSizeUntil && now > paddleSizeUntil) {
    paddleW = BASE_PADDLE_W;
    paddleSizeFactor = 1;
    paddleSizeUntil = 0;
    paddleX = Math.max(0, Math.min(W - paddleW, paddleX));
  }
  if (ballSpeedUntil && now > ballSpeedUntil) {
    for (const b of balls) {
      b.dx /= ballSpeedFactor;
      b.dy /= ballSpeedFactor;
    }
    ballSpeedFactor = 1;
    ballSpeedUntil = 0;
  }
  const burning = burningUntil > now;

  const paddleY = H - 24;

  // Balls
  for (const ball of balls) {
    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x - BALL_R < 0 || ball.x + BALL_R > W) ball.dx *= -1;
    if (ball.y - BALL_R < 0) ball.dy *= -1;

    if (
      ball.dy > 0 &&
      ball.y + BALL_R >= paddleY &&
      ball.y + BALL_R <= paddleY + PADDLE_H + 8 &&
      ball.x >= paddleX &&
      ball.x <= paddleX + paddleW
    ) {
      const hit = (ball.x - paddleX) / paddleW - 0.5;
      const speed = Math.hypot(ball.dx, ball.dy);
      ball.dx = hit * 6;
      ball.dy = -Math.sqrt(Math.max(speed * speed - ball.dx * ball.dx, 4));
      ball.y = paddleY - BALL_R;
    }
  }

  // Remove balls that fell; lose a life only when all are gone
  balls = balls.filter((b) => b.y - BALL_R <= H);
  if (balls.length === 0) {
    lives.value--;
    if (lives.value <= 0) {
      state.value = 'over';
      newBest.value = maybeSave(score.value);
      running = false;
      return;
    }
    resetBalls();
  }

  // Bricks
  for (const ball of balls) {
    let bounced = false;
    for (const b of bricks) {
      if (!b.alive) continue;
      if (
        ball.x + BALL_R > b.x &&
        ball.x - BALL_R < b.x + b.w &&
        ball.y + BALL_R > b.y &&
        ball.y - BALL_R < b.y + b.h
      ) {
        if (burning) {
          // Plow straight through — no bounce
          b.alive = false;
          score.value += 10;
          dropPowerup(b.x + b.w / 2, b.y + b.h / 2);
        } else if (!bounced) {
          b.hits--;
          if (b.hits <= 0) {
            b.alive = false;
            score.value += 10;
            dropPowerup(b.x + b.w / 2, b.y + b.h / 2);
          } else {
            score.value += 5;
          }
          ball.dy *= -1;
          bounced = true;
        }
      }
    }
  }

  if (bricks.every((b) => !b.alive)) {
    nextLevel();
    return;
  }

  // Powerups falling
  for (const p of powerups) {
    p.y += 1.6;
    if (
      p.y >= paddleY - 6 &&
      p.y <= paddleY + PADDLE_H + 6 &&
      p.x >= paddleX - 8 &&
      p.x <= paddleX + paddleW + 8
    ) {
      applyPowerup(p.kind);
      p.y = H + 100; // mark caught
    }
  }
  powerups = powerups.filter((p) => p.y < H + 50);
}

function draw() {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#0a0d16';
  ctx.fillRect(0, 0, W, H);

  // Bricks (tough ones render darker until cracked)
  for (const b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = b.hits > 1 ? shade(b.color, 0.55) : b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if (b.hits > 1) {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.moveTo(b.x + 4, b.y + 4);
      ctx.lineTo(b.x + b.w - 4, b.y + b.h - 4);
      ctx.stroke();
    }
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

  // Paddle (green = wide, red = shrunk)
  const paddleY = H - 24;
  ctx.fillStyle =
    paddleSizeFactor > 1 ? '#2ecc71' : paddleSizeFactor < 1 ? '#e74c3c' : '#f2ecdf';
  ctx.beginPath();
  ctx.roundRect(paddleX, paddleY, paddleW, PADDLE_H, 5);
  ctx.fill();

  // Balls (orange glow while burning)
  const burning = burningUntil > performance.now();
  for (const ball of balls) {
    if (burning) {
      ctx.fillStyle = 'rgba(255,107,53,0.35)';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R + 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = burning ? '#ff6b35' : '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Darken a hex color by factor (0-1). */
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

function onPointerMove(e: PointerEvent) {
  if (state.value !== 'playing') return;
  const canvas = canvasEl.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * W;
  paddleX = Math.max(0, Math.min(W - paddleW, x - paddleW / 2));
}

function onKey(e: KeyboardEvent) {
  if (state.value !== 'playing') return;
  if (e.key === 'ArrowLeft') paddleX = Math.max(0, paddleX - 18);
  if (e.key === 'ArrowRight') paddleX = Math.min(W - paddleW, paddleX + 18);
}

onMounted(() => {
  buildLevel(1);
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
      <span class="lvl">Lv {{ level }}</span>
      <span class="lives">● {{ lives }}</span>
    </div>
    <canvas
      ref="canvasEl"
      :width="W"
      :height="H"
      class="game-canvas"
      @pointermove="onPointerMove"
    ></canvas>
    <div v-if="levelBanner" class="level-banner">{{ levelBanner }}</div>
    <div v-if="state !== 'playing'" class="game-overlay">
      <p v-if="state === 'ready'">Drag to move the paddle</p>
      <p v-else-if="state === 'over'">Game over! Reached level {{ level }}</p>
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
    <p class="game-hint">Catch powerups — red ones are traps · Arrow keys on desktop</p>
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
.lvl {
  color: #f1c40f;
}
.best {
  color: #8b93a5;
  font-size: 0.85em;
}
.new-best {
  color: #f1c40f;
  font-weight: 700;
}
.lives {
  margin-left: auto;
  color: #e74c3c;
}
.game-canvas {
  width: 100%;
  height: auto;
  touch-action: none;
  cursor: none;
}
.level-banner {
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
  flex-direction: column;
  gap: 0.8rem;
  align-items: center;
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
