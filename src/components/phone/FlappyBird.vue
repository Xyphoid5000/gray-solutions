<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

/** Flappy Bird on the desk phone: tap to flap through the pipes. */
const emit = defineEmits<{ back: [] }>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const score = ref(0);
const state = ref<'ready' | 'playing' | 'over'>('ready');

const W = 300;
const H = 400;
const BIRD_X = 70;
const BIRD_R = 12;
const GRAVITY = 0.45;
const FLAP = -7.5;
const PIPE_W = 52;
const PIPE_GAP = 110;
const PIPE_SPEED = 2.2;

let birdY = H / 2;
let birdV = 0;
let pipes: { x: number; gapY: number; passed: boolean }[] = [];
let raf = 0;
let running = false;
let frame = 0;

function reset() {
  birdY = H / 2;
  birdV = 0;
  pipes = [];
  score.value = 0;
  frame = 0;
}

function start() {
  reset();
  state.value = 'playing';
  running = true;
  loop();
}

function flap() {
  if (state.value === 'ready') {
    start();
    return;
  }
  if (state.value !== 'playing') return;
  birdV = FLAP;
}

function loop() {
  if (!running) return;
  update();
  draw();
  raf = requestAnimationFrame(loop);
}

function update() {
  frame++;
  birdV += GRAVITY;
  birdY += birdV;

  // Ceiling / ground
  if (birdY - BIRD_R < 0) {
    birdY = BIRD_R;
    birdV = 0;
  }
  if (birdY + BIRD_R > H) {
    die();
    return;
  }

  // Spawn pipes
  if (frame % 95 === 0) {
    const gapY = 90 + Math.random() * (H - 180 - PIPE_GAP);
    pipes.push({ x: W, gapY, passed: false });
  }

  // Move pipes
  for (const p of pipes) {
    p.x -= PIPE_SPEED;
    if (!p.passed && p.x + PIPE_W < BIRD_X - BIRD_R) {
      p.passed = true;
      score.value++;
    }
    // Collision
    const inX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
    const inGap = birdY - BIRD_R > p.gapY && birdY + BIRD_R < p.gapY + PIPE_GAP;
    if (inX && !inGap) {
      die();
      return;
    }
  }
  pipes = pipes.filter((p) => p.x + PIPE_W > -10);
}

function die() {
  state.value = 'over';
  running = false;
}

function draw() {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0e1626');
  sky.addColorStop(1, '#1a2b45');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Pipes
  for (const p of pipes) {
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
    ctx.fillRect(p.x, p.gapY + PIPE_GAP, PIPE_W, H - p.gapY - PIPE_GAP);
    // Caps
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(p.x - 3, p.gapY - 14, PIPE_W + 6, 14);
    ctx.fillRect(p.x - 3, p.gapY + PIPE_GAP, PIPE_W + 6, 14);
  }

  // Bird
  const wobble = state.value === 'playing' ? Math.sin(frame * 0.3) * 2 : 0;
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath();
  ctx.arc(BIRD_X, birdY + wobble, BIRD_R, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  ctx.fillStyle = '#0a0d16';
  ctx.beginPath();
  ctx.arc(BIRD_X + 4, birdY + wobble - 3, 3, 0, Math.PI * 2);
  ctx.fill();
  // Beak
  ctx.fillStyle = '#e67e22';
  ctx.beginPath();
  ctx.moveTo(BIRD_X + BIRD_R - 2, birdY + wobble);
  ctx.lineTo(BIRD_X + BIRD_R + 8, birdY + wobble + 3);
  ctx.lineTo(BIRD_X + BIRD_R - 2, birdY + wobble + 6);
  ctx.fill();
}

function onKey(e: KeyboardEvent) {
  if (e.code === 'Space') {
    e.preventDefault();
    flap();
  }
}

onMounted(() => {
  reset();
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
    </div>
    <canvas
      ref="canvasEl"
      :width="W"
      :height="H"
      class="game-canvas"
      @pointerdown="flap"
    ></canvas>
    <div v-if="state !== 'playing'" class="game-overlay">
      <p v-if="state === 'ready'">Tap to flap</p>
      <p v-else>Game over! Score {{ score }}</p>
      <button type="button" class="game-btn" @click="start">
        {{ state === 'ready' ? 'Start' : 'Try again' }}
      </button>
    </div>
    <p class="game-hint">Tap to flap · Space on desktop</p>
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
.game-canvas {
  width: 100%;
  height: auto;
  touch-action: none;
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
