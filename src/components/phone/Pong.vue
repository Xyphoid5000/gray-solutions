<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useHighScore } from './useHighScore';
import { useDeviceStore } from '../../stores/device';

/** Pong on the desk phone: drag your paddle, outlast the AI.
    Endless rally — the AI gets faster and smarter as you score.
    Powerups drift through the middle: wide paddle, slow-mo. */
const emit = defineEmits<{ back: [] }>();

const device = useDeviceStore();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const score = ref(0);
const lives = ref(3);
const aiScore = ref(0);
const state = ref<'ready' | 'playing' | 'over'>('ready');
const { high: best, maybeSave } = useHighScore('pong');
const newBest = ref(false);

const W = 300;
const H = 540;
const PADDLE_H = 10;
const BASE_PADDLE_W = 70;
const BALL_R = 7;

type PowerKind = 'wide' | 'slow';
interface PowerUp { x: number; y: number; dx: number; kind: PowerKind }

let playerX = W / 2 - BASE_PADDLE_W / 2;
let playerW = BASE_PADDLE_W;
let aiX = W / 2 - BASE_PADDLE_W / 2;
let ball = { x: W / 2, y: H / 2, dx: 2.5, dy: 3 };
let powerups: PowerUp[] = [];
let wideUntil = 0;
let slowUntil = 0;
let powerTimer = 0;
let aiAimError = 0;
let raf = 0;
let running = false;

const POWER_STYLE: Record<PowerKind, { color: string; glyph: string }> = {
  wide: { color: '#2ecc71', glyph: '⇔' },
  slow: { color: '#f1c40f', glyph: '◔' },
};

function aiSpeed() {
  return Math.min(2.2 + score.value * 0.12, 5.5);
}

function aiError() {
  return Math.max(28 - score.value * 1.2, 6);
}

function serve(towardPlayer: boolean) {
  const s = 3;
  ball = {
    x: W / 2,
    y: H / 2,
    dx: s * (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.4),
    dy: s * (towardPlayer ? 1 : -1),
  };
}

function start() {
  score.value = 0;
  aiScore.value = 0;
  lives.value = 3;
  newBest.value = false;
  playerW = BASE_PADDLE_W;
  wideUntil = 0;
  slowUntil = 0;
  powerups = [];
  powerTimer = 0;
  serve(true);
  state.value = 'playing';
  running = true;
  loop();
}

function spawnPowerup() {
  const kind: PowerKind = Math.random() > 0.5 ? 'wide' : 'slow';
  powerups.push({
    x: 40 + Math.random() * (W - 80),
    y: H / 2,
    dx: (Math.random() > 0.5 ? 1 : -1) * 1.2,
    kind,
  });
}

function applyPowerup(kind: PowerKind) {
  const now = performance.now();
  if (kind === 'wide') {
    playerW = BASE_PADDLE_W * 1.6;
    wideUntil = now + 15000;
  } else if (kind === 'slow') {
    ball.dx *= 0.65;
    ball.dy *= 0.65;
    slowUntil = now + 10000;
  }
  score.value += 2;
}

function loop() {
  if (!running) return;
  update();
  draw();
  raf = requestAnimationFrame(loop);
}

function update() {
  const now = performance.now();
  if (wideUntil && now > wideUntil) {
    playerW = BASE_PADDLE_W;
    wideUntil = 0;
    playerX = Math.max(0, Math.min(W - playerW, playerX));
  }
  if (slowUntil && now > slowUntil) {
    ball.dx /= 0.65;
    ball.dy /= 0.65;
    slowUntil = 0;
  }

  // Ball
  ball.x += ball.dx;
  ball.y += ball.dy;
  if (ball.x - BALL_R < 0 || ball.x + BALL_R > W) ball.dx *= -1;

  const playerY = H - 30;
  const aiY = 20;

  // Player paddle
  if (
    ball.dy > 0 &&
    ball.y + BALL_R >= playerY &&
    ball.y - BALL_R <= playerY + PADDLE_H &&
    ball.x >= playerX &&
    ball.x <= playerX + playerW
  ) {
    const hit = (ball.x - playerX) / playerW - 0.5;
    const speed = Math.hypot(ball.dx, ball.dy) * 1.03;
    ball.dx = hit * 6;
    ball.dy = -Math.sqrt(Math.max(speed * speed - ball.dx * ball.dx, 4));
    ball.y = playerY - BALL_R;
    score.value++;
    // AI picks its aim error once per rally — no more twitching
    aiAimError = (Math.random() - 0.5) * aiError();
  }

  // AI paddle
  if (
    ball.dy < 0 &&
    ball.y - BALL_R <= aiY + PADDLE_H &&
    ball.y + BALL_R >= aiY &&
    ball.x >= aiX &&
    ball.x <= aiX + BASE_PADDLE_W
  ) {
    const hit = (ball.x - aiX) / BASE_PADDLE_W - 0.5;
    const speed = Math.hypot(ball.dx, ball.dy) * 1.03;
    ball.dx = hit * 6;
    ball.dy = Math.sqrt(Math.max(speed * speed - ball.dx * ball.dx, 4));
    ball.y = aiY + PADDLE_H + BALL_R;
  }

  // AI movement — glides toward its aim point, drifts center otherwise
  if (ball.dy < 0) {
    const target = ball.x - BASE_PADDLE_W / 2 + aiAimError;
    const dx = target - aiX;
    aiX += Math.max(-aiSpeed(), Math.min(aiSpeed(), dx));
  } else {
    const dx = W / 2 - BASE_PADDLE_W / 2 - aiX;
    aiX += Math.max(-1.2, Math.min(1.2, dx));
  }
  aiX = Math.max(0, Math.min(W - BASE_PADDLE_W, aiX));

  // Scoring
  if (ball.y - BALL_R > H) {
    // Player missed
    lives.value--;
    aiScore.value++;
    if (lives.value <= 0) {
      state.value = 'over';
      newBest.value = maybeSave(score.value);
      running = false;
      return;
    }
    serve(true);
  } else if (ball.y + BALL_R < 0) {
    // AI missed — bonus
    score.value += 5;
    serve(false);
  }

  // Powerups drift and get caught by the ball
  powerTimer++;
  if (powerTimer > 600 && powerups.length < 2) {
    powerTimer = 0;
    if (Math.random() > 0.4) spawnPowerup();
  }
  for (const p of powerups) {
    p.x += p.dx;
    if (p.x < 20 || p.x > W - 20) p.dx *= -1;
    if (Math.hypot(p.x - ball.x, p.y - ball.y) < BALL_R + 14) {
      applyPowerup(p.kind);
      p.y = -100; // caught
    }
  }
  powerups = powerups.filter((p) => p.y > -50);
}

function draw() {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#0a0d16';
  ctx.fillRect(0, 0, W, H);

  // Center line
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();
  ctx.setLineDash([]);

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

  // AI paddle
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.roundRect(aiX, 20, BASE_PADDLE_W, PADDLE_H, 5);
  ctx.fill();

  // Player paddle
  ctx.fillStyle = wideUntil ? '#2ecc71' : '#f2ecdf';
  ctx.beginPath();
  ctx.roundRect(playerX, H - 30, playerW, PADDLE_H, 5);
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
  playerX = Math.max(0, Math.min(W - playerW, x - playerW / 2));
}

function onKey(e: KeyboardEvent) {
  if (state.value !== 'playing') return;
  if (e.key === 'ArrowLeft') playerX = Math.max(0, playerX - 20);
  if (e.key === 'ArrowRight') playerX = Math.min(W - playerW, playerX + 20);
}

onMounted(() => {
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
      <span>You {{ score }}</span>
      <span class="best">Best {{ best }}</span>
      <span class="ai">AI {{ aiScore }}</span>
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
      <p v-if="state === 'ready'">{{ device.isDesktop ? 'Arrow keys or mouse to move' : 'Drag to move your paddle' }}</p>
      <p v-else>Game over! You scored {{ score }}</p>
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
    <p class="game-hint">{{ device.isDesktop ? 'Arrow keys or mouse · hit powerups with the ball' : 'Drag to move · hit powerups with the ball' }}</p>
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
.ai {
  color: #e74c3c;
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
