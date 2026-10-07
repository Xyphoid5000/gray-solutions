<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

/** Brick Breaker on the desk phone: drag the paddle, break all bricks. */
const emit = defineEmits<{ back: [] }>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const score = ref(0);
const lives = ref(3);
const state = ref<'ready' | 'playing' | 'over' | 'win'>('ready');

const W = 300;
const H = 400;
const PADDLE_W = 70;
const PADDLE_H = 10;
const BALL_R = 6;

let paddleX = W / 2 - PADDLE_W / 2;
let ball = { x: W / 2, y: H - 40, dx: 3, dy: -3 };
let bricks: { x: number; y: number; w: number; h: number; color: string; alive: boolean }[] = [];
let raf = 0;
let running = false;

const BRICK_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db'];

function buildBricks() {
  bricks = [];
  const cols = 7;
  const rows = 5;
  const gap = 4;
  const bw = (W - gap * (cols + 1)) / cols;
  const bh = 18;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      bricks.push({
        x: gap + c * (bw + gap),
        y: 50 + r * (bh + gap),
        w: bw,
        h: bh,
        color: BRICK_COLORS[r % BRICK_COLORS.length],
        alive: true,
      });
    }
  }
}

function resetBall() {
  ball = { x: paddleX + PADDLE_W / 2, y: H - 40, dx: 3 * (Math.random() > 0.5 ? 1 : -1), dy: -3 };
}

function start() {
  buildBricks();
  score.value = 0;
  lives.value = 3;
  state.value = 'playing';
  resetBall();
  running = true;
  loop();
}

function loop() {
  if (!running) return;
  update();
  draw();
  raf = requestAnimationFrame(loop);
}

function update() {
  // Ball
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Walls
  if (ball.x - BALL_R < 0 || ball.x + BALL_R > W) ball.dx *= -1;
  if (ball.y - BALL_R < 0) ball.dy *= -1;

  // Paddle
  const paddleY = H - 24;
  if (
    ball.dy > 0 &&
    ball.y + BALL_R >= paddleY &&
    ball.y + BALL_R <= paddleY + PADDLE_H + 8 &&
    ball.x >= paddleX &&
    ball.x <= paddleX + PADDLE_W
  ) {
    // Angle based on hit position
    const hit = (ball.x - paddleX) / PADDLE_W - 0.5;
    ball.dx = hit * 6;
    ball.dy = -Math.abs(ball.dy);
    ball.y = paddleY - BALL_R;
  }

  // Bottom — lose a life
  if (ball.y - BALL_R > H) {
    lives.value--;
    if (lives.value <= 0) {
      state.value = 'over';
      running = false;
      return;
    }
    resetBall();
  }

  // Bricks
  for (const b of bricks) {
    if (!b.alive) continue;
    if (
      ball.x + BALL_R > b.x &&
      ball.x - BALL_R < b.x + b.w &&
      ball.y + BALL_R > b.y &&
      ball.y - BALL_R < b.y + b.h
    ) {
      b.alive = false;
      ball.dy *= -1;
      score.value += 10;
      break;
    }
  }

  if (bricks.every((b) => !b.alive)) {
    state.value = 'win';
    running = false;
  }
}

function draw() {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#0a0d16';
  ctx.fillRect(0, 0, W, H);

  // Bricks
  for (const b of bricks) {
    if (!b.alive) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  // Paddle
  ctx.fillStyle = '#f2ecdf';
  const paddleY = H - 24;
  ctx.beginPath();
  ctx.roundRect(paddleX, paddleY, PADDLE_W, PADDLE_H, 5);
  ctx.fill();

  // Ball
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
}

function onPointerMove(e: PointerEvent) {
  if (state.value !== 'playing') return;
  const canvas = canvasEl.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * W;
  paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
}

function onKey(e: KeyboardEvent) {
  if (state.value !== 'playing') return;
  if (e.key === 'ArrowLeft') paddleX = Math.max(0, paddleX - 18);
  if (e.key === 'ArrowRight') paddleX = Math.min(W - PADDLE_W, paddleX + 18);
}

onMounted(() => {
  buildBricks();
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
      <span class="lives">● {{ lives }}</span>
    </div>
    <canvas
      ref="canvasEl"
      :width="W"
      :height="H"
      class="game-canvas"
      @pointermove="onPointerMove"
    ></canvas>
    <div v-if="state !== 'playing'" class="game-overlay">
      <p v-if="state === 'ready'">Drag to move the paddle</p>
      <p v-else-if="state === 'over'">Game over!</p>
      <p v-else-if="state === 'win'">You win!</p>
      <button type="button" class="game-btn" @click="start">
        {{ state === 'ready' ? 'Start' : 'Play again' }}
      </button>
    </div>
    <p class="game-hint">Drag to move · Arrow keys on desktop</p>
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
