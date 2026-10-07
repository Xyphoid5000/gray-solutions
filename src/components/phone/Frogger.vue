<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useHighScore } from './useHighScore';

/** Frogger on the desk phone: hop across traffic and ride the logs.
    Endless — each crossing gets faster. Swipe to hop, arrows on desktop. */
const emit = defineEmits<{ back: [] }>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const score = ref(0);
const lives = ref(3);
const level = ref(1);
const levelBanner = ref('');
const state = ref<'ready' | 'playing' | 'over'>('ready');
const { high: best, maybeSave } = useHighScore('frogger');
const newBest = ref(false);

const COLS = 10;
const ROWS = 13;
const CELL = 30;
const W = COLS * CELL;
const H = ROWS * CELL;

// Row types: 0=goal, 1-3=road, 4=safe, 5-7=river, 8=safe, 9-11=road, 12=start
const ROAD_ROWS = [1, 2, 3, 9, 10, 11];
const RIVER_ROWS = [5, 6, 7];

interface Mover { row: number; x: number; w: number; speed: number }

let frog = { col: 4, row: 12 };
let cars: Mover[] = [];
let logs: Mover[] = [];
let raf = 0;
let running = false;
let touchStart: { x: number; y: number } | null = null;

function speedMul() {
  return 1 + (level.value - 1) * 0.18;
}

function buildLevel() {
  cars = [];
  logs = [];
  for (const row of ROAD_ROWS) {
    const dir = row % 2 === 0 ? 1 : -1;
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      cars.push({
        row,
        x: Math.random() * W,
        w: CELL * (1.5 + Math.random()),
        speed: dir * (1.2 + Math.random() * 1.2) * speedMul(),
      });
    }
  }
  for (const row of RIVER_ROWS) {
    const dir = row % 2 === 0 ? -1 : 1;
    const count = 3;
    for (let i = 0; i < count; i++) {
      logs.push({
        row,
        x: (i / count) * W + Math.random() * 40,
        w: CELL * (2 + Math.random() * 1.5),
        speed: dir * (0.8 + Math.random() * 0.7) * speedMul(),
      });
    }
  }
}

function resetFrog() {
  frog = { col: 4, row: 12 };
}

function start() {
  level.value = 1;
  score.value = 0;
  lives.value = 3;
  newBest.value = false;
  buildLevel();
  resetFrog();
  state.value = 'playing';
  running = true;
  loop();
}

function nextLevel() {
  level.value++;
  score.value += 100;
  levelBanner.value = `Level ${level.value}`;
  setTimeout(() => { levelBanner.value = ''; }, 1600);
  buildLevel();
  resetFrog();
}

function die() {
  lives.value--;
  if (lives.value <= 0) {
    state.value = 'over';
    newBest.value = maybeSave(score.value);
    running = false;
  } else {
    resetFrog();
  }
}

function hop(dcol: number, drow: number) {
  if (state.value !== 'playing') return;
  frog.col = Math.max(0, Math.min(COLS - 1, frog.col + dcol));
  frog.row = Math.max(0, Math.min(ROWS - 1, frog.row + drow));
  if (frog.row === 0) {
    nextLevel();
  } else {
    score.value += 1;
  }
}

function loop() {
  if (!running) return;
  update();
  draw();
  raf = requestAnimationFrame(loop);
}

function update() {
  // Move cars
  for (const c of cars) {
    c.x += c.speed;
    if (c.speed > 0 && c.x > W) c.x = -c.w;
    if (c.speed < 0 && c.x + c.w < 0) c.x = W;
  }
  // Move logs; frog rides the log it's on
  const frogX = frog.col * CELL + CELL / 2;
  for (const l of logs) {
    const wasOn = frog.row === l.row && frogX >= l.x && frogX <= l.x + l.w;
    l.x += l.speed;
    if (l.speed > 0 && l.x > W) l.x = -l.w;
    if (l.speed < 0 && l.x + l.w < 0) l.x = W;
    if (wasOn) {
      const newX = frogX + l.speed;
      frog.col = Math.round((newX - CELL / 2) / CELL);
      if (frog.col < 0 || frog.col >= COLS) {
        die(); // carried off screen
        return;
      }
    }
  }

  const fx = frog.col * CELL + CELL / 2;

  // Car collision
  if (ROAD_ROWS.includes(frog.row)) {
    for (const c of cars) {
      if (c.row === frog.row && fx > c.x - 6 && fx < c.x + c.w + 6) {
        die();
        return;
      }
    }
  }

  // Drowning
  if (RIVER_ROWS.includes(frog.row)) {
    let onLog = false;
    for (const l of logs) {
      if (l.row === frog.row && fx >= l.x && fx <= l.x + l.w) {
        onLog = true;
        break;
      }
    }
    if (!onLog) {
      die();
      return;
    }
  }
}

function draw() {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background by row type
  for (let r = 0; r < ROWS; r++) {
    if (r === 0) ctx.fillStyle = '#1d3a24'; // goal
    else if (ROAD_ROWS.includes(r)) ctx.fillStyle = '#23262e'; // road
    else if (RIVER_ROWS.includes(r)) ctx.fillStyle = '#123a5c'; // river
    else ctx.fillStyle = '#2a2f3a'; // safe
    ctx.fillRect(0, r * CELL, W, CELL);
    // Lane dividers on road
    if (ROAD_ROWS.includes(r)) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(0, r * CELL + CELL / 2);
      ctx.lineTo(W, r * CELL + CELL / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Logs
  ctx.fillStyle = '#8a5a2b';
  for (const l of logs) {
    ctx.beginPath();
    ctx.roundRect(l.x, l.row * CELL + 6, l.w, CELL - 12, 8);
    ctx.fill();
  }

  // Cars
  for (const c of cars) {
    ctx.fillStyle = c.speed > 0 ? '#e74c3c' : '#e67e22';
    ctx.beginPath();
    ctx.roundRect(c.x, c.row * CELL + 5, c.w, CELL - 10, 6);
    ctx.fill();
    // Windows
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(c.x + 6, c.row * CELL + 9, c.w - 12, 6);
  }

  // Frog
  const fx = frog.col * CELL + CELL / 2;
  const fy = frog.row * CELL + CELL / 2;
  ctx.fillStyle = '#2ecc71';
  ctx.beginPath();
  ctx.arc(fx, fy, 11, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(fx - 5, fy - 6, 3.5, 0, Math.PI * 2);
  ctx.arc(fx + 5, fy - 6, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(fx - 5, fy - 6, 1.5, 0, Math.PI * 2);
  ctx.arc(fx + 5, fy - 6, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function onTouchStart(e: TouchEvent) {
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}

function onTouchEnd(e: TouchEvent) {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
  if (Math.abs(dx) > Math.abs(dy)) hop(dx > 0 ? 1 : -1, 0);
  else hop(0, dy > 0 ? 1 : -1);
}

function onKey(e: KeyboardEvent) {
  if (state.value !== 'playing') return;
  if (e.key === 'ArrowLeft') hop(-1, 0);
  if (e.key === 'ArrowRight') hop(1, 0);
  if (e.key === 'ArrowUp') hop(0, -1);
  if (e.key === 'ArrowDown') hop(0, 1);
}

onMounted(() => {
  buildLevel();
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
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    ></canvas>
    <div v-if="levelBanner" class="level-banner">{{ levelBanner }}</div>
    <div v-if="state !== 'playing'" class="game-overlay">
      <p v-if="state === 'ready'">Swipe to hop across</p>
      <p v-else>Game over! Reached level {{ level }}</p>
      <p v-if="newBest" class="new-best">★ New best! ★</p>
      <button type="button" class="game-btn" @click="start">
        {{ state === 'ready' ? 'Start' : 'Play again' }}
      </button>
    </div>
    <p class="game-hint">Ride the logs · don't get hit · Arrow keys on desktop</p>
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
.lvl {
  color: #f1c40f;
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
