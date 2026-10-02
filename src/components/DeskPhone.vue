<script setup lang="ts">
/**
 * The desk phone, now tappable. Tap it to pick it up: it's PIN-locked
 * (the UV ink hides the code in four plain sentences). Three wrong
 * tries locks it for the session. Unlock it for Snake and Contacts —
 * calling Gray Solutions reveals the 20%-off code, and if the match
 * guy has quit, his contact appears so you can hire him back.
 */
import { computed, inject, ref, onUnmounted, nextTick, type Ref } from 'vue';
import { activeDiscountCode, autoFillDiscountCode } from '../lib/discount';
import { useModalA11y } from '../composables/useModalA11y';
import { scrollToElement } from '../lib/scroll';

const PIN = '4132';
const MAX_ATTEMPTS = 3;

/** The match guy's employment status, provided by the desk. */
interface MatchGuyPhoneApi {
  candleGone: Ref<boolean>;
  rehire: () => void;
}
const matchGuy = inject<MatchGuyPhoneApi | undefined>('matchGuy', undefined);
const guyQuit = computed(() => matchGuy?.candleGone.value ?? false);

const held = ref(false);
const screen = ref<'pin' | 'locked' | 'home' | 'snake' | 'contacts' | 'call'>('pin');
const pinEntry = ref('');
const pinAttempts = ref(0);
const pinError = ref(false);

function pickUp() {
  held.value = true;
  pinEntry.value = '';
  pinError.value = false;
  if (screen.value !== 'locked' && screen.value !== 'home') screen.value = 'pin';
}
function putDown() {
  held.value = false;
  stopSnake();
  if (callTimer !== null) {
    clearTimeout(callTimer);
    callTimer = null;
  }
}

const phoneDialogEl = ref<HTMLElement | null>(null);
useModalA11y(phoneDialogEl, held, putDown);

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
const canvasEl = ref<HTMLCanvasElement | null>(null);
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
  nextTick(() => drawSnake());
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
  const canvas = canvasEl.value;
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
  const t = e.changedTouches && e.changedTouches[0];
  if (!t) return;
  touchStart = { x: t.clientX, y: t.clientY };
}
function onTouchEnd(e: TouchEvent) {
  if (!touchStart) return;
  const t = e.changedTouches && e.changedTouches[0];
  if (!t) { touchStart = null; return; }
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

/* ---------------- Contacts ---------------- */
interface Contact {
  id: string;
  name: string;
  /** The punchline when they don't pick up. */
  note: string;
  special?: 'gray' | 'guy';
}
const contacts = computed<Contact[]>(() => {
  const list: Contact[] = [
    { id: 'gray', name: 'Gray Solutions', note: '', special: 'gray' },
    { id: 'pizza', name: 'Pizza Palace', note: 'Nobody picks up. Rude.' },
    { id: 'blockbuster', name: 'Blockbuster Video', note: 'This number has been disconnected since 2013.' },
    { id: 'mom', name: 'Mom', note: "She'll call you back. She always does." },
    // He's always listed; what he says depends on his employment status.
    { id: 'guy', name: 'Match Guy', note: '', special: 'guy' },
    { id: 'tech', name: 'Tech Support', note: 'Have you tried turning it off and on again?' },
    { id: 'void', name: 'The Void', note: 'It stares back.' },
    { id: 'dentist', name: 'Dentist', note: 'You have 3 missed cleanings.' },
    { id: 'website', name: 'Your Current Website', note: "It doesn't answer. It just begs for a redesign." },
  ];
  return list.sort((a, b) => a.name.localeCompare(b.name));
});

const callContact = ref<Contact | null>(null);
const callStatus = ref<'calling' | 'connected' | 'noanswer'>('calling');
let callTimer: number | null = null;

function openContacts() {
  screen.value = 'contacts';
}
function startCall(c: Contact) {
  callContact.value = c;
  callStatus.value = 'calling';
  screen.value = 'call';
  if (callTimer !== null) clearTimeout(callTimer);
  if (c.special === 'gray') {
    // Gray Solutions always answers. The code is minted once per visit.
    callTimer = window.setTimeout(() => {
      if (!activeDiscountCode.value) activeDiscountCode.value = makeCode();
      callStatus.value = 'connected';
    }, 1400);
  } else if (c.special === 'guy') {
    // He answers either way. If he quit over the candle, he agrees to
    // come back — hang up so you can watch him walk in with it. If he's
    // still employed, he's at work and brushes you off.
    callTimer = window.setTimeout(() => {
      callStatus.value = 'connected';
      callTimer = window.setTimeout(() => {
        const quit = guyQuit.value;
        putDown();
        if (quit) matchGuy?.rehire();
      }, 1500);
    }, 1400);
  } else {
    callTimer = window.setTimeout(() => {
      callStatus.value = 'noanswer';
    }, 1600);
  }
}
function endCall() {
  if (callTimer !== null) {
    clearTimeout(callTimer);
    callTimer = null;
  }
  callContact.value = null;
  screen.value = 'contacts';
}

/** Copy this visit's code into the contact form and scroll to it. */
function fillForm() {
  autoFillDiscountCode.value = activeDiscountCode.value;
  const el = document.getElementById('contact');
  if (el) scrollToElement(el);
}

/* ---------------- Bonus code ---------------- */
function makeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CURIOUS-${s}`;
}

onUnmounted(() => {
  stopSnake();
  if (callTimer !== null) clearTimeout(callTimer);
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
  <div
    v-if="held"
    ref="phoneDialogEl"
    class="phone-modal"
    role="dialog"
    aria-modal="true"
    aria-label="Chris's phone"
    tabindex="-1"
  >
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
          <p v-if="pinError" class="pin-hint" role="alert">
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
          <svg class="locked-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2 1 21h22L12 2z"
              fill="none"
              stroke="#e5484d"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <line x1="12" y1="9" x2="12" y2="14" stroke="#e5484d" stroke-width="2" stroke-linecap="round" />
            <circle cx="12" cy="17" r="1.2" fill="#e5484d" />
          </svg>
          <p class="locked-title">Locked</p>
          <p class="locked-text">Too many attempts.</p>
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
            <button type="button" class="app-icon" @click="openContacts">
              <span class="app-glyph app-contacts" aria-hidden="true"></span>
              Contacts
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

        <!-- Contacts -->
        <div v-else-if="screen === 'contacts'" class="scr scr-contacts">
          <div class="contacts-head">
            <button type="button" class="snake-back" @click="screen = 'home'" aria-label="Back">‹</button>
            <span>Contacts</span>
          </div>
          <ul class="contacts-list">
            <li v-for="c in contacts" :key="c.id">
              <button type="button" class="contact-row" @click="startCall(c)">
                <span class="contact-avatar" aria-hidden="true">{{ c.name.charAt(0) }}</span>
                <span class="contact-name">{{ c.name }}</span>
                <span class="contact-call" aria-hidden="true">Call</span>
              </button>
            </li>
          </ul>
          <button type="button" class="phone-putdown" @click="putDown">Put it back</button>
        </div>

        <!-- Call -->
        <div v-else-if="screen === 'call'" class="scr scr-call">
          <p class="call-name">{{ callContact?.name }}</p>
          <p v-if="callStatus === 'calling'" class="call-status">Calling…</p>
          <div v-else-if="callStatus === 'connected' && callContact?.special === 'gray'" class="call-code">
            <p class="call-thanks">Thanks for calling Gray Solutions!</p>
            <p class="call-code-value">{{ activeDiscountCode }}</p>
            <p class="call-code-note">Mention it in the contact form for <strong>20% off</strong> your new website.</p>
            <button type="button" class="call-code-fill" @click="fillForm">Fill it in for me</button>
          </div>
          <p v-else-if="callStatus === 'connected'" class="call-status">
            {{
              callContact?.special === 'guy' && !guyQuit
                ? '“I’m at work — call me back later.”'
                : '“Fine. I’ll come back.”'
            }}
          </p>
          <p v-else class="call-status">{{ callContact?.note }}</p>
          <button
            v-if="!(callStatus === 'connected' && callContact?.special === 'guy')"
            type="button"
            class="call-end"
            @click="endCall"
            aria-label="End call"
          >End</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ---- on the desk ---- */
.desk-phone-btn {
  position: absolute;
  z-index: 845;
  right: calc(28px - var(--desk-pr));
  top: calc(var(--desk-h) * 0.735);
  width: 80px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transform: rotate(-10deg);
  opacity: 1;
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
  opacity: 1;
}
html[data-blacklight='on'] .desk-phone-btn {
  opacity: 0.55;
}

/* ---- picked-up modal ---- */
.phone-modal {
  position: absolute;
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
.locked-icon {
  width: 44px;
  height: 44px;
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
.app-contacts {
  background: linear-gradient(135deg, #3a2b12, #b07d2b);
  position: relative;
}
.app-contacts::after {
  content: '';
  position: absolute;
  left: 19px;
  top: 12px;
  width: 20px;
  height: 26px;
  border-radius: 4px;
  background: #f3e3c2;
  box-shadow: 0 0 0 2.5px #8a6420;
}
.app-contacts::before {
  content: '';
  position: absolute;
  left: 24px;
  top: 17px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #8a6420;
  box-shadow: 0 13px 0 -1px #8a6420;
  z-index: 1;
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

/* Contacts */
.scr-contacts {
  padding-top: 3rem;
}
.contacts-head {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  margin-bottom: 0.6rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #e8ecf3;
}
.contacts-list {
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.contact-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.5rem 0.4rem;
  background: none;
  border: 0;
  border-bottom: 1px solid #1a2030;
  color: #e8ecf3;
  cursor: pointer;
  text-align: left;
}
.contact-row:active {
  background: #141a26;
}
.contact-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #232c38;
  color: #9fb4d8;
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 0.95rem;
  flex: none;
}
.contact-name {
  font-size: 0.9rem;
  flex: 1;
}
.contact-call {
  font-size: 0.72rem;
  color: #5aa9ff;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* Call */
.scr-call {
  justify-content: center;
  gap: 0.7rem;
  text-align: center;
}
.call-name {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0;
}
.call-status {
  font-size: 0.9rem;
  color: #8b93a5;
  margin: 0;
  max-width: 24ch;
  line-height: 1.5;
}
.call-code {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
}
.call-thanks {
  font-size: 0.95rem;
  color: #e8ecf3;
  margin: 0;
}
.call-code-value {
  font-family: ui-monospace, monospace;
  font-size: 1.25rem;
  letter-spacing: 0.08em;
  color: #7ee787;
  background: #0d1410;
  border: 1px dashed #2f6b3a;
  border-radius: 0.7rem;
  padding: 0.7rem 0.9rem;
  margin: 0;
}
.call-code-note {
  font-size: 0.78rem;
  color: #8b93a5;
  margin: 0;
  max-width: 26ch;
  line-height: 1.5;
}
.call-code-fill {
  border: 1px solid #2f6b3a;
  background: #0d1410;
  color: #7ee787;
  border-radius: 999px;
  padding: 0.45rem 1rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
.call-code-fill:hover {
  background: #14231a;
}
.call-end {
  margin-top: 1.2rem;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 0;
  background: #c92a2a;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.call-end:active {
  background: #a61e1e;
}

@media (max-width: 640px) {
  .desk-phone-btn {
    right: calc(4px - var(--desk-pr));
    top: calc(var(--desk-h) * 0.72);
    width: 60px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .phone-notif,
  .phone-device {
    animation: none;
  }
}
</style>
