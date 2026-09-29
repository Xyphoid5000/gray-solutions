<script setup lang="ts">
/**
 * The desk phone, now tappable. Tap it to pick it up: it's PIN-locked
 * (the UV ink hides the code in four plain sentences). Three wrong
 * tries locks it for the session. Unlock it for Snake and a dial pad —
 * dialing Chris's number opens the bonus page with a 20%-off code.
 */
import { ref, onUnmounted } from 'vue';
import { sendDiscountEmail, bonusEmailConfigured } from '../lib/discountEmail';

const PIN = '4132';
const MAX_ATTEMPTS = 3;
const CHRIS_NUMBER = '3305549989';

const held = ref(false);
const screen = ref<'pin' | 'locked' | 'home' | 'snake' | 'dialer'>('pin');
const pinEntry = ref('');
const pinAttempts = ref(0);
const pinError = ref(false);

const bonus = ref(false);
const bonusCode = ref('');
const bonusEmailed = ref(false);

function pickUp() {
  held.value = true;
  pinEntry.value = '';
  pinError.value = false;
  if (screen.value !== 'locked' && screen.value !== 'home') screen.value = 'pin';
}
function putDown() {
  held.value = false;
  stopSnake();
}

function pressDigit(d: string) {
  if (screen.value !== 'pin' || pinEntry.value.length >= 4) return;
  pinError.value = false;
  pinEntry.value += d;
  if (pinEntry.value.length === 4) {
    setTimeout(checkPin, 220);
  }
}
function clearPin() {
  pinEntry.value = '';
  pinError.value = false;
}
function checkPin() {
  if (pinEntry.value === PIN) {
    screen.value = 'home';
    pinEntry.value = '';
    return;
  }
  pinAttempts.value++;
  pinError.value = true;
  if (pinAttempts.value >= MAX_ATTEMPTS) {
    setTimeout(() => {
      screen.value = 'locked';
    }, 600);
  } else {
    setTimeout(() => {
      pinEntry.value = '';
      pinError.value = false;
    }, 600);
  }
}

/* ---------------- Snake ---------------- */
const SNAKE_COLS = 12;
const SNAKE_ROWS = 16;
const CELL = 20;
const snakeScore = ref(0);
const snakeState = ref<'ready' | 'playing' | 'over'>('ready');
let snake: { x: number; y: number }[] = [];
let dir = { x: 1, y: 0 };
let pendingDir = { x: 1, y: 0 };
let food = { x: 7, y: 8 };
let snakeTimer: number | null = null;
let canvasEl: HTMLCanvasElement | null = null;
let touchStart: { x: number; y: number } | null = null;

function stopSnake() {
  if (snakeTimer !== null) {
    clearInterval(snakeTimer);
    snakeTimer = null;
  }
}
function placeFood() {
  for (let i = 0; i < 200; i++) {
    const f = {
      x: Math.floor(Math.random() * SNAKE_COLS),
      y: Math.floor(Math.random() * SNAKE_ROWS),
    };
    if (!snake.some((s) => s.x === f.x && s.y === f.y)) {
      food = f;
      return;
    }
  }
}
function openSnake() {
  screen.value = 'snake';
  snakeState.value = 'ready';
  snakeScore.value = 0;
}
function startSnake() {
  snake = [
    { x: 5, y: 8 },
    { x: 4, y: 8 },
    { x: 3, y: 8 },
  ];
  dir = { x: 1, y: 0 };
  pendingDir = { x: 1, y: 0 };
  snakeScore.value = 0;
  placeFood();
  snakeState.value = 'playing';
  stopSnake();
  drawSnake();
  snakeTimer = window.setInterval(tickSnake, 150);
}
function tickSnake() {
  dir = pendingDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  const dead =
    head.x < 0 ||
    head.y < 0 ||
    head.x >= SNAKE_COLS ||
    head.y >= SNAKE_ROWS ||
    snake.some((s) => s.x === head.x && s.y === head.y);
  if (dead) {
    stopSnake();
    snakeState.value = 'over';
    drawSnake();
    return;
  }
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    snakeScore.value++;
    placeFood();
  } else {
    snake.pop();
  }
  drawSnake();
}
function drawSnake() {
  const canvas = canvasEl;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#0d1410';
  ctx.fillRect(0, 0, SNAKE_COLS * CELL, SNAKE_ROWS * CELL);
  // food
  ctx.fillStyle = '#ff5d5d';
  ctx.beginPath();
  ctx.arc(
    food.x * CELL + CELL / 2,
    food.y * CELL + CELL / 2,
    CELL / 2 - 3,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  // snake
  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#7ee787' : '#3fa34d';
    const p = 2;
    ctx.fillRect(s.x * CELL + p, s.y * CELL + p, CELL - p * 2, CELL - p * 2);
  });
  if (snakeState.value === 'ready') {
    ctx.fillStyle = 'rgba(13,20,16,0.72)';
    ctx.fillRect(0, 0, SNAKE_COLS * CELL, SNAKE_ROWS * CELL);
    ctx.fillStyle = '#d9f2dd';
    ctx.font = '600 17px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Tap to play', (SNAKE_COLS * CELL) / 2, (SNAKE_ROWS * CELL) / 2);
  } else if (snakeState.value === 'over') {
    ctx.fillStyle = 'rgba(13,20,16,0.72)';
    ctx.fillRect(0, 0, SNAKE_COLS * CELL, SNAKE_ROWS * CELL);
    ctx.fillStyle = '#d9f2dd';
    ctx.font = '600 17px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Score ${snakeScore.value}`,
      (SNAKE_COLS * CELL) / 2,
      (SNAKE_ROWS * CELL) / 2 - 12,
    );
    ctx.font = '500 13px Inter, system-ui, sans-serif';
    ctx.fillText('Tap to retry', (SNAKE_COLS * CELL) / 2, (SNAKE_ROWS * CELL) / 2 + 16);
  }
}
function onSnakeTap() {
  if (snakeState.value !== 'playing') startSnake();
}
function steer(dx: number, dy: number) {
  if (snakeState.value !== 'playing') return;
  // No 180° reversals.
  if (dx === -dir.x && dy === -dir.y) return;
  if (dx === dir.x && dy === dir.y) return;
  pendingDir = { x: dx, y: dy };
}
function onTouchStart(e: TouchEvent) {
  const t = e.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}
function onTouchEnd(e: TouchEvent) {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
  if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 1 : -1, 0);
  else steer(0, dy > 0 ? 1 : -1);
}
function onKey(e: KeyboardEvent) {
  if (screen.value !== 'snake') return;
  if (e.key === 'ArrowUp') steer(0, -1);
  else if (e.key === 'ArrowDown') steer(0, 1);
  else if (e.key === 'ArrowLeft') steer(-1, 0);
  else if (e.key === 'ArrowRight') steer(1, 0);
}

/* ---------------- Dialer ---------------- */
const dialDigits = ref('');
const dialNote = ref('');
function dialKey(k: string) {
  if (dialDigits.value.length >= 14) return;
  dialNote.value = '';
  dialDigits.value += k;
}
function dialBack() {
  dialDigits.value = dialDigits.value.slice(0, -1);
  dialNote.value = '';
}
function dialCall() {
  const num = dialDigits.value.replace(/\D/g, '');
  if (num.endsWith(CHRIS_NUMBER)) {
    unlockBonus();
  } else if (num.length === 0) {
    dialNote.value = 'Dial a number first.';
  } else {
    dialNote.value = 'That number is not in service. Curious, though.';
  }
}
function prettyDial(): string {
  const d = dialDigits.value.replace(/\D/g, '');
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
}

/* ---------------- Bonus ---------------- */
function makeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CURIOUS-${s}`;
}
async function unlockBonus() {
  bonusCode.value = makeCode();
  bonus.value = true;
  held.value = false;
  stopSnake();
  bonusEmailed.value = await sendDiscountEmail(bonusCode.value);
}

onUnmounted(() => {
  stopSnake();
});
</script>

<template>
  <!-- The phone on the desk — tappable now. -->
  <button
    class="desk-phone-btn"
    type="button"
    aria-label="Pick up the phone"
    @click="pickUp"
  >
    <svg viewBox="0 0 60 112">
      <rect x="2" y="2" width="56" height="108" rx="10" class="phone-body" />
      <rect x="7" y="12" width="46" height="88" rx="4" class="phone-screen" />
      <rect x="7" y="12" width="46" height="88" rx="4" class="phone-sheen" />
      <polygon points="14,12 30,12 18,100 7,100" class="phone-shine" />
      <rect x="23" y="15" width="14" height="4" rx="2" class="phone-island" />
      <rect x="58" y="30" width="3" height="14" rx="1.5" class="phone-button" />
      <circle cx="47" cy="24" r="3.2" class="phone-notif" />
    </svg>
  </button>

  <!-- Picked up: the phone in hand. -->
  <div v-if="held" class="phone-modal" role="dialog" aria-label="Chris's phone">
    <div class="phone-backdrop" @click="putDown"></div>
    <div class="phone-device">
      <div class="phone-notch"></div>
      <div class="phone-screen-ui">
        <!-- PIN lock -->
        <div v-if="screen === 'pin'" class="scr scr-pin" :class="{ error: pinError }">
          <p class="pin-title">Enter PIN</p>
          <div class="pin-dots" aria-hidden="true">
            <span v-for="i in 4" :key="i" :class="{ on: pinEntry.length >= i }"></span>
          </div>
          <p v-if="pinError" class="pin-hint">
            Wrong code. {{ MAX_ATTEMPTS - pinAttempts }} tries left.
          </p>
          <div class="pin-pad">
            <button v-for="n in 9" :key="n" type="button" @click="pressDigit(String(n))">
              {{ n }}
            </button>
            <button type="button" class="pin-clear" @click="clearPin" aria-label="Clear">C</button>
            <button type="button" @click="pressDigit('0')">0</button>
            <button type="button" class="pin-back" aria-hidden="true" tabindex="-1"></button>
          </div>
          <button type="button" class="phone-putdown" @click="putDown">Put it back</button>
        </div>

        <!-- Locked out -->
        <div v-else-if="screen === 'locked'" class="scr scr-locked">
          <p class="locked-title">Locked</p>
          <p class="locked-text">Too many wrong tries. The phone stays shut.</p>
          <button type="button" class="phone-putdown" @click="putDown">Put it back</button>
        </div>

        <!-- Home -->
        <div v-else-if="screen === 'home'" class="scr scr-home">
          <p class="home-time">{{ new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }}</p>
          <div class="home-apps">
            <button type="button" class="app-icon" @click="openSnake">
              <span class="app-glyph app-snake" aria-hidden="true"></span>
              Snake
            </button>
            <button type="button" class="app-icon" @click="screen = 'dialer'">
              <span class="app-glyph app-phone" aria-hidden="true"></span>
              Phone
            </button>
          </div>
          <button type="button" class="phone-putdown" @click="putDown">Put it back</button>
        </div>

        <!-- Snake -->
        <div v-else-if="screen === 'snake'" class="scr scr-snake" @keydown="onKey" tabindex="0">
          <div class="snake-head">
            <button type="button" class="snake-back" @click="screen = 'home'; stopSnake();" aria-label="Back">‹</button>
            <span>Score {{ snakeScore }}</span>
          </div>
          <div
            class="snake-wrap"
            @click="onSnakeTap"
            @touchstart.passive="onTouchStart"
            @touchend.passive="onTouchEnd"
          >
            <canvas
              ref="canvasEl"
              :width="SNAKE_COLS * CELL"
              :height="SNAKE_ROWS * CELL"
            ></canvas>
          </div>
          <p class="snake-hint">Swipe to steer</p>
        </div>

        <!-- Dialer -->
        <div v-else-if="screen === 'dialer'" class="scr scr-dialer">
          <div class="dial-display" aria-live="polite">{{ prettyDial() || ' ' }}</div>
          <p v-if="dialNote" class="dial-note">{{ dialNote }}</p>
          <div class="dial-pad">
            <button v-for="k in ['1','2','3','4','5','6','7','8','9','*','0','#']" :key="k" type="button" @click="dialKey(k)">
              {{ k }}
            </button>
          </div>
          <div class="dial-actions">
            <button type="button" class="dial-back-btn" @click="dialBack" aria-label="Delete digit">⌫</button>
            <button type="button" class="dial-call" @click="dialCall" aria-label="Call">Call</button>
            <button type="button" class="dial-home-btn" @click="screen = 'home'" aria-label="Back">‹</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bonus page -->
  <div v-if="bonus" class="bonus-overlay" role="dialog" aria-label="Bonus: 20 percent off">
    <div class="bonus-card">
      <p class="bonus-kicker">For the curious</p>
      <h2 class="bonus-title">Your curiosity paid off.</h2>
      <p class="bonus-text">
        You found the phone, cracked the PIN, and dialed the number.
        Here's <strong>20% off</strong> your new website:
      </p>
      <p class="bonus-code">{{ bonusCode }}</p>
      <p class="bonus-text small">
        Mention it in the contact form.
        <span v-if="bonusEmailed">A copy just landed in Chris's inbox.</span>
        <span v-else-if="bonusEmailConfigured()">Chris's inbox is getting a copy too.</span>
      </p>
      <button type="button" class="btn btn-solid" @click="bonus = false">Nice. Back to poking around</button>
    </div>
  </div>
</template>

<style scoped>
/* ---- on the desk ---- */
.desk-phone-btn {
  position: absolute;
  z-index: 845;
  right: calc(0px - var(--desk-pr));
  top: 620px;
  width: 80px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transform: rotate(-10deg);
  opacity: 0.95;
  transition: transform 0.25s ease;
}
.desk-phone-btn:hover {
  transform: rotate(-10deg) scale(1.06);
}
.desk-phone-btn svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}
.phone-body {
  fill: #15171b;
  stroke: rgba(0, 0, 0, 0.6);
  stroke-width: 1.5;
}
.phone-screen {
  fill: #232c38;
}
.phone-sheen {
  fill: var(--led, #2f6bff);
  opacity: 0;
  transition: opacity 0.8s ease;
}
.phone-shine {
  fill: rgba(255, 255, 255, 0.07);
}
.phone-island {
  fill: #07090b;
}
.phone-button {
  fill: #2b3038;
}
.phone-notif {
  fill: #5aa9ff;
  animation: notif-pulse 2.8s ease-in-out infinite;
}
@keyframes notif-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
html[data-theme='dark'] .phone-sheen {
  opacity: 0.3;
}
html[data-theme='dark'] .desk-phone-btn {
  opacity: 0.78;
}
html[data-blacklight='on'] .desk-phone-btn {
  opacity: 0.55;
}

/* ---- picked-up modal ---- */
.phone-modal {
  position: fixed;
  inset: 0;
  z-index: 1600;
  display: grid;
  place-items: center;
  padding: 1.25rem;
}
.phone-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(5, 6, 8, 0.72);
  backdrop-filter: blur(3px);
}
.phone-device {
  position: relative;
  width: min(300px, 84vw);
  aspect-ratio: 300 / 620;
  background: #101216;
  border-radius: 2.4rem;
  border: 1px solid #2c313a;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  padding: 0.9rem;
  animation: phone-rise 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes phone-rise {
  from { transform: translateY(26px) scale(0.96); opacity: 0; }
  to { transform: none; opacity: 1; }
}
.phone-notch {
  position: absolute;
  top: 1.55rem;
  left: 50%;
  transform: translateX(-50%);
  width: 84px;
  height: 20px;
  background: #05070a;
  border-radius: 999px;
  z-index: 2;
}
.phone-screen-ui {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0b0e13;
  border-radius: 1.7rem;
  overflow: hidden;
  color: #e8ecf3;
}
.scr {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3.2rem 1.1rem 1.1rem;
}
.phone-putdown {
  margin-top: auto;
  background: none;
  border: 0;
  color: #8b93a5;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.6rem;
}

/* PIN */
.pin-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 1rem;
}
.pin-dots {
  display: flex;
  gap: 0.7rem;
  margin-bottom: 0.9rem;
}
.pin-dots span {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 1.5px solid #5a6376;
}
.pin-dots span.on {
  background: #5aa9ff;
  border-color: #5aa9ff;
}
.scr-pin.error .pin-dots span {
  border-color: #ff6b6b;
}
.pin-hint {
  font-size: 0.78rem;
  color: #8b93a5;
  margin: 0 0 1.2rem;
  min-height: 1.1em;
}
.scr-pin.error .pin-hint {
  color: #ff8f8f;
}
.pin-pad {
  display: grid;
  grid-template-columns: repeat(3, 64px);
  gap: 0.55rem;
  justify-content: center;
}
.pin-pad button {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 1px solid #2c313a;
  background: #141821;
  color: #e8ecf3;
  font-size: 1.25rem;
  cursor: pointer;
}
.pin-pad button:active {
  background: #232a38;
}
.pin-clear {
  font-size: 0.95rem !important;
  color: #8b93a5 !important;
}
.pin-back {
  visibility: hidden;
}

/* Locked */
.scr-locked {
  justify-content: center;
  gap: 0.8rem;
}
.locked-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
  color: #ff8f8f;
}
.locked-text {
  font-size: 0.9rem;
  color: #8b93a5;
  text-align: center;
  margin: 0 0 1rem;
  max-width: 20ch;
}

/* Home */
.scr-home {
  padding-top: 4rem;
}
.home-time {
  font-size: 2rem;
  font-weight: 300;
  margin: 0 0 2rem;
}
.home-apps {
  display: flex;
  gap: 1.6rem;
}
.app-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  background: none;
  border: 0;
  color: #c6cdd9;
  font-size: 0.75rem;
  cursor: pointer;
}
.app-glyph {
  width: 58px;
  height: 58px;
  border-radius: 15px;
  display: block;
}
.app-snake {
  background: linear-gradient(135deg, #1d3a24, #2f6b3a);
  position: relative;
}
.app-snake::after {
  content: '';
  position: absolute;
  left: 12px;
  top: 26px;
  width: 34px;
  height: 8px;
  border-radius: 4px;
  background: #7ee787;
  box-shadow: -8px -8px 0 -2px #7ee787;
}
.app-phone {
  background: linear-gradient(135deg, #1c2f4a, #2f6bff);
  position: relative;
}
.app-phone::after {
  content: '';
  position: absolute;
  left: 20px;
  top: 14px;
  width: 18px;
  height: 30px;
  border-radius: 5px;
  border: 2.5px solid #cfe0ff;
}

/* Snake */
.scr-snake {
  padding-top: 3rem;
}
.snake-head {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  margin-bottom: 0.6rem;
  font-size: 0.9rem;
  color: #c6cdd9;
}
.snake-back {
  background: none;
  border: 0;
  color: #c6cdd9;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0 0.4rem;
}
.snake-wrap {
  border-radius: 0.6rem;
  overflow: hidden;
  border: 1px solid #232a38;
  touch-action: none;
}
.snake-wrap canvas {
  display: block;
  width: 240px;
  height: 320px;
}
.snake-hint {
  font-size: 0.75rem;
  color: #8b93a5;
  margin: 0.7rem 0 0;
}

/* Dialer */
.dial-display {
  min-height: 2.6rem;
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  margin-bottom: 0.4rem;
}
.dial-note {
  font-size: 0.78rem;
  color: #8b93a5;
  margin: 0 0 0.8rem;
  min-height: 1.1em;
  text-align: center;
}
.dial-pad {
  display: grid;
  grid-template-columns: repeat(3, 64px);
  gap: 0.55rem;
  justify-content: center;
}
.dial-pad button {
  width: 64px;
  height: 52px;
  border-radius: 0.8rem;
  border: 1px solid #2c313a;
  background: #141821;
  color: #e8ecf3;
  font-size: 1.2rem;
  cursor: pointer;
}
.dial-pad button:active {
  background: #232a38;
}
.dial-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}
.dial-back-btn,
.dial-home-btn {
  background: none;
  border: 0;
  color: #8b93a5;
  font-size: 1.3rem;
  cursor: pointer;
  padding: 0.5rem;
}
.dial-call {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  border: 0;
  background: #2f9e44;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.dial-call:active {
  background: #267d36;
}

/* ---- bonus page ---- */
.bonus-overlay {
  position: fixed;
  inset: 0;
  z-index: 1700;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: rgba(5, 6, 8, 0.82);
  backdrop-filter: blur(4px);
}
.bonus-card {
  width: min(420px, 92vw);
  background: #10131a;
  border: 1px solid #2c313a;
  border-radius: 1.2rem;
  padding: 2rem 1.6rem;
  text-align: center;
  color: #e8ecf3;
  animation: phone-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.bonus-kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #5aa9ff;
  margin: 0 0 0.7rem;
}
.bonus-title {
  font-size: 1.5rem;
  margin: 0 0 0.8rem;
}
.bonus-text {
  font-size: 0.92rem;
  color: #aab3c5;
  margin: 0 0 1rem;
  line-height: 1.55;
}
.bonus-text.small {
  font-size: 0.8rem;
}
.bonus-code {
  font-family: ui-monospace, monospace;
  font-size: 1.6rem;
  letter-spacing: 0.1em;
  color: #7ee787;
  background: #0d1410;
  border: 1px dashed #2f6b3a;
  border-radius: 0.7rem;
  padding: 0.9rem;
  margin: 0 0 1rem;
}
.bonus-card .btn {
  margin-top: 0.4rem;
}

@media (max-width: 640px) {
  .desk-phone-btn {
    right: calc(4px - var(--desk-pr));
    top: 545px;
    width: 60px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .phone-notif,
  .phone-device,
  .bonus-card {
    animation: none;
  }
}
</style>
