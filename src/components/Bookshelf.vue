<script setup lang="ts">
import { ref } from 'vue';
import { gsap } from 'gsap';
import { manuscriptBound } from '../lib/manuscript';

withDefaults(
  defineProps<{
    /** The manuscript / spine can be clicked to open the book. */
    interactive?: boolean;
    /** Show the manuscript object in front of the books. */
    showManuscript?: boolean;
    /** Pure scenery: dim, out-of-focus bookcase behind the home hero.
        No titles, no foreground, no interaction. */
    backdrop?: boolean;
  }>(),
  { interactive: false, showManuscript: true, backdrop: false },
);

const emit = defineEmits(['open-book']);

/** The finished book lives in the slot once the reader binds it.
    Session-scoped — every visit starts with the slot empty. */
const isBound = manuscriptBound;

interface ShelfBook {
  title: string;
  color: string;
  h: number;
  w: number;
  synopsis: string;
}

/** The shelf: one set of 5 books, used identically everywhere.
    (Moby-Dick and The Odyssey were cut — the row only fits five.) */
const SHELF_BOOKS: ShelfBook[] = [
  { title: 'Pride and Prejudice', color: '#1f3a5a', h: 212, w: 40, synopsis: 'Two people who are perfect for each other spend 400 pages pretending they are not.' },
  { title: 'Frankenstein', color: '#2e4a2e', h: 244, w: 48, synopsis: 'A college dropout builds a man, then complains about it for the rest of his life.' },
  { title: 'Jane Eyre', color: '#5a3a1f', h: 222, w: 42, synopsis: 'An orphan gets a job, falls for her boss, discovers he hid his wife in the attic. As you do.' },
  { title: 'Dracula', color: '#3a1f3a', h: 236, w: 44, synopsis: 'A group chat of Victorians try to cancel a vampire. Told entirely through emails.' },
  { title: 'Wuthering Heights', color: '#1f4a4a', h: 206, w: 38, synopsis: 'Two terrible people are terrible to each other on a windy hill. Everyone suffers.' },
];
/** Split around the binding slot: 3 left, 2 right. */
const shelfLeft = SHELF_BOOKS.slice(0, 3);
const shelfRight = SHELF_BOOKS.slice(3);

/** The currently selected (floating) book, by title. Null when none. */
const selected = ref<string | null>(null);
/** The floating book element, for the put-back animation. */
let floatingEl: HTMLElement | null = null;
/** The book's home position, to return it. */

/** Pull a book off the shelf: reverse of the file-away — the spine
    becomes 3D, turns to face you, and floats in the middle. */
function pullOut(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const isMobile = window.innerWidth < 640;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  if (isMobile) {
    // On phones the book stays near its slot — lift and turn to show
    // the cover, but don't fly to screen center or it swallows the shelf.
    gsap.to(el, {
      x: 0,
      y: -60,
      z: 100,
      rotationY: -68,
      scale: 0.9,
      duration: 0.9,
      ease: 'power3.inOut',
      transformPerspective: 900,
    });
  } else {
    // Lift off the shelf and come to the middle, turning to show the
    // front cover as it floats.
    gsap.to(el, {
      x: cx - (r.left + r.width / 2),
      y: cy - (r.top + r.height / 2),
      z: 220,
      rotationY: -68,
      scale: 1.35,
      duration: 0.9,
      ease: 'power3.inOut',
      transformPerspective: 900,
    });
  }
  // Gentle float once it's out.
  gsap.to(el, {
    y: '+=14',
    duration: 1.6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    delay: 0.9,
  });
  el.classList.add('is-floating');
}

function selectBook(book: ShelfBook, el: HTMLElement) {
  if (selected.value) return;
  selected.value = book.title;
  floatingEl = el;
  pullOut(el);
}

/** Slide the floating book back into its slot. */
function deselectBook() {
  const el = floatingEl;
  if (!el) {
    selected.value = null;
    return;
  }
  gsap.killTweensOf(el);
  el.classList.remove('is-floating');
  gsap.to(el, {
    x: 0,
    y: 0,
    z: 0,
    rotationY: 0,
    scale: 1,
    duration: 0.7,
    ease: 'power3.inOut',
    transformPerspective: 900,
    onComplete: () => {
      selected.value = null;
      floatingEl = null;
    },
  });
}

function toggleBook(book: ShelfBook, ev: Event) {
  const el = ev.currentTarget as HTMLElement;
  if (selected.value === book.title) deselectBook();
  else if (!selected.value) selectBook(book, el);
}

/** Gray Solutions, when bound: pull it out like the others, but it
    can actually be opened. */
function toggleOurs(ev: Event) {
  const el = ev.currentTarget as HTMLElement;
  if (selected.value === '__ours') deselectBook();
  else if (!selected.value) {
    selected.value = '__ours';
    floatingEl = el;
    pullOut(el);
  }
}
</script>

<template>
  <section
    class="bookshelf-hero"
    :class="{ 'is-bound': isBound, 'is-backdrop': backdrop }"
    :aria-hidden="backdrop || undefined"
    aria-label="Bookshelf"
  >
    <div class="bs-vignette" aria-hidden="true"></div>
    <p v-if="!backdrop" class="bs-kicker">A portfolio &middot; by Chris Gray</p>

    <div class="bs-case" aria-hidden="true">
      <div class="bs-cornice"></div>
      <template v-if="backdrop">
        <div class="bs-shelf">
          <div class="bs-books">
            <div
              v-for="b in shelfLeft"
              :key="'bg-' + b.title"
              class="bs-book"
              :style="{ height: b.h + 'px', width: b.w + 'px', background: b.color, '--bw': b.w + 'px', '--bc': b.color }"
            >
              <span>{{ b.title }}</span>
            </div>
            <div class="bs-slot" data-bind-slot>
              <div class="bs-ours"><span>Gray Solutions</span></div>
            </div>
            <div
              v-for="b in shelfRight"
              :key="'bg-' + b.title"
              class="bs-book"
              :style="{ height: b.h + 'px', width: b.w + 'px', background: b.color, '--bw': b.w + 'px', '--bc': b.color }"
            >
              <span>{{ b.title }}</span>
            </div>
          </div>
          <div class="bs-plank"></div>
        </div>
      </template>
      <template v-else>
      <div class="bs-shelf">
        <div class="bs-books">
          <button
            v-for="b in shelfLeft"
            :key="b.title"
            type="button"
            class="bs-book"
            :class="{ 'is-interactive': interactive, 'is-selected': selected === b.title }"
            :style="{ height: b.h + 'px', width: b.w + 'px', background: b.color, '--bw': b.w + 'px', '--bc': b.color }"
            :aria-label="b.title"
            @click="interactive && toggleBook(b, $event)"
          >
            <span class="bs-spine-label">{{ b.title }}</span>
            <span class="bs-face bs-front" aria-hidden="true">
              <span class="bs-front-title">{{ b.title }}</span>
            </span>
            <span class="bs-face bs-back" aria-hidden="true">
              <span class="bs-back-text">{{ b.synopsis }}</span>
            </span>
          </button>
          <div class="bs-slot" data-bind-slot>
            <button
              v-if="isBound"
              type="button"
              class="bs-ours"
              :class="{ 'is-interactive': interactive, 'is-selected': selected === '__ours' }"
              aria-label="Gray Solutions — open the book"
              @click="interactive && toggleOurs($event)"
            >
              <span>Gray Solutions</span>
              <span class="bs-face bs-front" aria-hidden="true">
                <span class="bs-front-title">Gray<br />Solutions<em>.</em></span>
                <span class="bs-front-tag"><em>Websites that tell stories.</em></span>
              </span>
            </button>
            <button
              v-if="isBound && interactive && selected === '__ours'"
              type="button"
              class="bs-open"
              @click="emit('open-book')"
            >
              Open the book <span aria-hidden="true">&rarr;</span>
            </button>
            <div v-else-if="!isBound" class="bs-slot-empty" aria-hidden="true"></div>
          </div>
          <button
            v-for="b in shelfRight"
            :key="b.title"
            type="button"
            class="bs-book"
            :class="{ 'is-interactive': interactive, 'is-selected': selected === b.title }"
            :style="{ height: b.h + 'px', width: b.w + 'px', background: b.color, '--bw': b.w + 'px', '--bc': b.color }"
            :aria-label="b.title"
            @click="interactive && toggleBook(b, $event)"
          >
            <span class="bs-spine-label">{{ b.title }}</span>
            <span class="bs-face bs-front" aria-hidden="true">
              <span class="bs-front-title">{{ b.title }}</span>
            </span>
            <span class="bs-face bs-back" aria-hidden="true">
              <span class="bs-back-text">{{ b.synopsis }}</span>
            </span>
          </button>
        </div>
        <div class="bs-plank"></div>
      </div>
      </template>
      <div class="bs-base"></div>
    </div>
    <div v-if="backdrop" class="bs-blur-veil" aria-hidden="true"></div>

    <div v-if="!backdrop" class="bs-foreground">
      <button
        v-if="showManuscript && !isBound"
        type="button"
        class="bs-manuscript"
        :class="{ 'is-interactive': interactive }"
        @click="interactive && emit('open-book')"
        aria-label="Read the manuscript"
      >
        <span class="bs-ms-stack" aria-hidden="true">
          <i></i><i></i><i></i>
          <span class="bs-ms-stamp"><span>Manuscript</span></span>
        </span>
        <span class="bs-ms-label"
          >Read the manuscript <span aria-hidden="true">&rarr;</span></span
        >
      </button>
      <button
        v-else-if="isBound && interactive"
        type="button"
        class="bs-reopen"
        @click="emit('open-book')"
      >
        Open the book <span aria-hidden="true">&rarr;</span>
      </button>
      <p v-if="showManuscript && !isBound" class="bs-hint">
        Six pages &middot; best read front to back
      </p>
    </div>
  </section>
</template>

<style scoped>
.bookshelf-hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    radial-gradient(
      130% 100% at 50% 0%,
      #2a1d12 0%,
      #170f08 52%,
      #0b0705 100%
    );
}
.bs-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    90% 75% at 50% 45%,
    transparent 55%,
    rgba(0, 0, 0, 0.55) 100%
  );
}

/* Backdrop mode: the shelf is pure scenery behind the home hero.
   No dimming — a clear veil over it carries the blur. */
.bookshelf-hero.is-backdrop {
  position: absolute;
  inset: 0;
  min-height: 0;
  pointer-events: none;
}
.bookshelf-hero.is-backdrop .bs-case {
  /* Scale is on the base .bs-case — all modes match. */
}
.bs-blur-veil {
  position: absolute;
  inset: 0;
  background: transparent;
  backdrop-filter: blur(7px);
  -webkit-backdrop-filter: blur(7px);
  pointer-events: none;
}
.bs-kicker {
  position: absolute;
  top: max(5.75rem, calc(env(safe-area-inset-top) + 5.25rem));
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: rgba(232, 205, 150, 0.6);
  margin: 0;
}
/* The bookcase. */
.bs-case {
  position: relative;
  width: min(400px, 86vw);
  border-left: 14px solid transparent;
  border-right: 14px solid transparent;
  border-image: linear-gradient(to bottom, #4a2e18, #2b1a0e) 1;
  padding: 0 10px;
  transform: scale(1.35);
}
.bs-cornice {
  height: 18px;
  margin: 0 -24px;
  background: linear-gradient(180deg, #54341b 0%, #33200f 70%, #211307 100%);
  border-radius: 4px 4px 0 0;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
}
.bs-shelf {
  margin-top: 26px;
}
.bs-books {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 7px;
  min-height: 244px;
  padding: 0 6px;
}
/* Interactive books: clickable, 3D. */
.bs-book.is-interactive {
  cursor: pointer;
  transform-style: preserve-3d;
}
.bs-book.is-interactive:hover {
  filter: brightness(1.12);
}
.bs-book .bs-spine-label {
  transform: translateZ(100px);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Front and back covers: edge-on until the book turns. */
.bs-face {
  position: absolute;
  top: 0;
  height: 100%;
  width: 200px;
  left: 50%;
  margin-left: -100px;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.2rem;
  box-sizing: border-box;
  opacity: 0;
  transition: opacity 0.4s ease;
}
.bs-book.is-selected .bs-face {
  opacity: 1;
}
.bs-front {
  transform: rotateY(90deg) translateZ(calc(var(--bw, 46px) / 2));
  background: linear-gradient(145deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 100%), var(--bc, #333);
  border: 1px solid rgba(232, 205, 150, 0.25);
}
.bs-front-title {
  font-family: var(--serif);
  font-size: 1.4rem;
  font-weight: 600;
  color: rgba(232, 205, 150, 0.95);
  line-height: 1.25;
  writing-mode: horizontal-tb;
  white-space: normal;
}
.bs-back {
  transform: rotateY(-90deg) translateZ(calc(var(--bw, 46px) / 2));
  background: linear-gradient(145deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%), var(--bc, #333);
  border: 1px solid rgba(232, 205, 150, 0.2);
}
.bs-back-text {
  font-family: var(--serif);
  font-style: italic;
  font-size: 0.95rem;
  color: rgba(232, 205, 150, 0.85);
  line-height: 1.5;
  writing-mode: horizontal-tb;
  white-space: normal;
}
/* The floating book lifts above the shelf. */
.bs-book.is-floating {
  z-index: 10;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
}
/* Gray Solutions in the slot: clickable when bound + interactive. */
.bs-ours.is-interactive {
  cursor: pointer;
  transform-style: preserve-3d;
  opacity: 1;
}
.bs-ours .bs-face {
  width: 200px;
  left: 50%;
  margin-left: -100px;
}
.bs-ours.is-selected .bs-face {
  opacity: 1;
}
/* Open button appears when Gray Solutions is floating. */
.bs-open {
  position: absolute;
  left: 50%;
  bottom: -3.2rem;
  transform: translateX(-50%);
  background: rgba(208, 138, 78, 0.16);
  border: 1px solid rgba(208, 138, 78, 0.55);
  border-radius: 999px;
  color: #e8cd96;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.65em 1.4em;
  cursor: pointer;
  white-space: nowrap;
  z-index: 11;
}
.bs-open:hover {
  background: rgba(208, 138, 78, 0.28);
}
.bs-book {
  flex-shrink: 0;
  writing-mode: vertical-rl;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--serif);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  color: rgba(232, 205, 150, 0.92);
  border-radius: 3px 3px 0 0;
  padding: 16px 0;
  white-space: nowrap;
  overflow: hidden;
  box-shadow:
    inset -4px 0 7px rgba(0, 0, 0, 0.4),
    inset 2px 0 3px rgba(255, 235, 200, 0.06);
}
.bs-book .bs-spine-label {
  overflow: hidden;
  text-overflow: ellipsis;
}
/* The open slot — a visible gap waiting for the finished book. */
.bs-slot {
  flex-shrink: 0;
  width: 54px;
  align-self: stretch;
  border-radius: 3px 3px 0 0;
  background: rgba(0, 0, 0, 0.35);
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.7);
  outline: 1px dashed rgba(232, 205, 150, 0.22);
  outline-offset: -5px;
  position: relative;
}
.bs-ours {
  position: absolute;
  inset: 0;
  writing-mode: vertical-rl;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(to bottom, #1d140c 0%, #100c07 100%);
  border-radius: 3px 3px 0 0;
  border-left: 1px solid rgba(208, 138, 78, 0.4);
  opacity: 0;
  box-shadow:
    inset -4px 0 7px rgba(0, 0, 0, 0.5),
    0 0 22px rgba(208, 138, 78, 0.12);
}
.bookshelf-hero.is-bound .bs-ours {
  opacity: 1;
}
.bs-ours span {
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #d08a4e;
  white-space: nowrap;
  padding: 14px 0;
}
.bs-plank {
  height: 16px;
  margin: 0 -24px;
  background: linear-gradient(180deg, #4a2c17 0%, #2e1a0d 60%, #1d1008 100%);
  border-radius: 2px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.55);
}
.bs-base {
  height: 26px;
  margin: 26px -24px 0;
  background: linear-gradient(180deg, #3a2412 0%, #211307 100%);
  border-radius: 0 0 4px 4px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.6);
}
/* The manuscript waits in front of the books. */
.bs-foreground {
  position: absolute;
  left: 0;
  right: 0;
  bottom: max(2.2rem, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  z-index: 2;
}
.bs-manuscript {
  background: none;
  border: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  transition: transform 0.35s ease;
}
.bs-manuscript.is-interactive:hover {
  transform: translateY(-6px);
}
.bs-manuscript.is-interactive:active {
  transform: translateY(-2px) scale(0.99);
}
.bs-ms-stack {
  position: relative;
  width: 186px;
  height: 118px;
  filter: drop-shadow(0 16px 26px rgba(0, 0, 0, 0.55));
}
.bs-ms-stack i {
  position: absolute;
  inset: 0;
  background: var(--page, #f2ecdf);
  border: 1px solid rgba(120, 90, 60, 0.4);
}
.bs-ms-stack i:nth-child(1) {
  transform: rotate(-5deg) translate(-7px, 5px);
}
.bs-ms-stack i:nth-child(2) {
  transform: rotate(4deg) translate(7px, 3px);
}
.bs-ms-stack i:nth-child(3) {
  transform: rotate(-1deg);
}
.bs-ms-stamp {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--serif);
  font-size: 1.05rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(120, 70, 40, 0.85);
}
.bs-ms-stamp span {
  transform: rotate(-4deg);
  border: 3px double rgba(120, 70, 40, 0.6);
  padding: 0.35em 0.5em 0.35em 0.65em;
  background: rgba(242, 236, 223, 0.5);
}
.bs-ms-label {
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #e8cd96;
}
.bs-hint {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  color: rgba(232, 205, 150, 0.5);
}
.bs-reopen {
  background: rgba(208, 138, 78, 0.12);
  border: 1px solid rgba(208, 138, 78, 0.45);
  border-radius: 999px;
  color: #e8cd96;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.7em 1.5em;
  cursor: pointer;
  transition: transform 0.3s ease, background 0.3s ease;
}
.bs-reopen:hover {
  transform: translateY(-3px);
  background: rgba(208, 138, 78, 0.2);
}
@media (max-width: 640px) {
  .bs-case {
    zoom: 0.78;
  }
  .bs-ms-stack {
    width: 158px;
    height: 100px;
  }
  .bs-kicker {
    top: max(5.25rem, calc(env(safe-area-inset-top) + 4.75rem));
  }
}
html[data-theme='dark'] .bookshelf-hero {
  filter: brightness(0.82);
}
</style>
