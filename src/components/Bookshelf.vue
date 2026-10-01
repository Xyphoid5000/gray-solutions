<script setup lang="ts">
import { ref } from 'vue';
import { manuscriptBound } from '../lib/manuscript';
import Book from './Book.vue';

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

/** The currently selected (floating) book. Null when none. */
const selectedBook = ref<ShelfBook | 'ours' | null>(null);

/** Toggle a book: show its 3D version in an overlay, or dismiss. */
function toggleBook(book: ShelfBook) {
  if (selectedBook.value === book) selectedBook.value = null;
  else selectedBook.value = book;
}

/** Gray Solutions: tap shows its 3D version, tap again dismisses.
    The "Open the book" button (not the book itself) opens it. */
function toggleOurs() {
  if (selectedBook.value === 'ours') selectedBook.value = null;
  else selectedBook.value = 'ours';
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
    <p class="bs-kicker">A portfolio &middot; by Chris Gray</p>

    <div class="bs-case" aria-hidden="true">
      <div class="bs-cornice"></div>
      <div class="bs-shelf">
        <div class="bs-books">
          <div
            v-for="b in shelfLeft"
            :key="b.title"
            role="button"
            tabindex="0"
            class="bs-book"
            :class="{ 'is-interactive': interactive }"
            :style="{ height: b.h + 'px', width: b.w + 'px', background: b.color }"
            :aria-label="b.title"
            @click="interactive && toggleBook(b)"
            @keydown.enter="interactive && toggleBook(b)"
            @keydown.space.prevent="interactive && toggleBook(b)"
          >
            <span class="bs-spine-label">{{ b.title }}</span>
          </div>
          <template v-if="isBound">
            <div
              role="button"
              tabindex="0"
              class="bs-book bs-ours"
              :class="{ 'is-interactive': interactive }"
              :style="{ height: '230px', width: '52px', background: '#1a1a1a' }"
              aria-label="Gray Solutions — open the book"
              data-bind-slot
              @click="interactive && toggleOurs()"
              @keydown.enter="interactive && toggleOurs()"
              @keydown.space.prevent="interactive && toggleOurs()"
            >
              <span class="bs-spine-label">Gray Solutions</span>
            </div>
          </template>
          <template v-else>
            <div class="bs-slot-empty" data-bind-slot aria-hidden="true"></div>
          </template>
          <div
            v-for="b in shelfRight"
            :key="b.title"
            role="button"
            tabindex="0"
            class="bs-book"
            :class="{ 'is-interactive': interactive }"
            :style="{ height: b.h + 'px', width: b.w + 'px', background: b.color }"
            :aria-label="b.title"
            @click="interactive && toggleBook(b)"
            @keydown.enter="interactive && toggleBook(b)"
            @keydown.space.prevent="interactive && toggleBook(b)"
          >
            <span class="bs-spine-label">{{ b.title }}</span>
          </div>
        </div>
        <div class="bs-plank"></div>
      </div>
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
        v-else-if="isBound && interactive && selectedBook === 'ours'"
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

    <!-- 3D book overlay: tap a spine to see its 3D Book.vue version drop in.
         Uses the same real Book component as the binding cinematic. -->
    <div
      v-if="selectedBook"
      class="bs-book-overlay"
      @click="selectedBook = null"
    >
      <div class="bs-book-drop" @click.stop>
        <Book
          v-if="selectedBook === 'ours'"
          title="Gray Solutions"
          color="#1a1a1a"
          :width="36"
          :height="220"
          :pulled="true"
          :interactive="true"
          mark="G."
          tagline="Websites that tell stories."
          author="Chris Gray"
          :showBonusToggle="true"
        />
        <Book
          v-else
          :title="selectedBook.title"
          :color="selectedBook.color"
          :synopsis="selectedBook.synopsis"
          :width="32"
          :height="200"
          :pulled="true"
          :interactive="true"
        />
        <div class="bs-book-buttons">
          <button
            v-if="selectedBook === 'ours'"
            type="button"
            class="bs-overlay-open"
            @click="emit('open-book')"
          >
            Open the book <span aria-hidden="true">&rarr;</span>
          </button>
          <button
            type="button"
            class="bs-overlay-close"
            @click="selectedBook = null"
            aria-label="Put the book back"
          >
            &times;
          </button>
        </div>
      </div>
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
/* The bookcase. Sized directly — no transform scale, which would flatten
   the 3D book pull-out and overflow small screens. */
.bs-case {
  position: relative;
  width: min(540px, 94vw);
  border-left: 14px solid transparent;
  border-right: 14px solid transparent;
  border-image: linear-gradient(to bottom, #4a2e18, #2b1a0e) 1;
  padding: 0 10px;
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
  position: relative;
  perspective: 900px;
}
/* Interactive books: clickable, 3D. */
.bs-book.is-interactive {
  cursor: pointer;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.bs-book.is-interactive:hover {
  filter: brightness(1.12);
}
/* Pulled out: lift, come forward, turn to show the front cover. */
.bs-book .bs-spine-label {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Gray Solutions: clickable when bound + interactive. */
.bs-ours.is-interactive {
  cursor: pointer;
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
  position: relative;
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
  align-self: flex-end;
  border-radius: 3px 3px 0 0;
  background: rgba(0, 0, 0, 0.35);
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.7);
  outline: 1px dashed rgba(232, 205, 150, 0.22);
  outline-offset: -5px;
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
/* When the bound book fills the slot, hide the placeholder outline. */
.bs-slot.is-filled {
  outline: none;
  background: transparent;
  box-shadow: none;
}
/* Empty slot placeholder — matches the bound book dimensions so the
   binding has a target to fly to. */
.bs-slot-empty {
  flex-shrink: 0;
  width: 52px;
  height: 230px;
  align-self: flex-end;
}
.bs-ours {
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
  /* Let taps pass through to the shelf books behind, except on the
     actual hero/buttons. */
  pointer-events: none;
}
.bs-foreground .bs-manuscript,
.bs-foreground .bs-reopen,
.bs-foreground .bs-hint {
  pointer-events: auto;
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
/* Gray Solutions front cover G. mark. */
.bs-front-mark {
  font-family: var(--serif);
  font-size: 2.2rem;
  font-weight: 700;
  color: rgba(232, 205, 150, 0.95);
  line-height: 1;
  margin-bottom: 0.5rem;
}
/* 3D book overlay: dims the shelf, drops the real Book.vue in. */
.bs-book-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 6, 3, 0.85);
  animation: bs-overlay-in 0.25s ease;
}
@keyframes bs-overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.bs-book-drop {
  position: relative;
  width: 100%;
  height: 100%;
  animation: bs-drop-in 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2);
  display: grid;
  grid-template-rows: 1fr auto 1fr;
  justify-items: center;
}
/* The pulled book lives in the middle row, so its visual center lands
   exactly at the overlay's vertical center. (The old -70px pose lift was
   removed in Book.vue: it only compensated the old bottom anchor, and the
   3D projection is vertically symmetric about the box.) */
.bs-book-drop .book3d.is-pulled {
  grid-row: 2;
  position: relative;
  left: auto;
  top: auto;
  bottom: auto;
  transform: none;
  margin: 0; /* shelf-row spacing must not throw off the centering */
}
/* Buttons ride the bottom row, just under the book. The margin clears the
   3D book's visual overhang below its box, then leaves breathing room. */
.bs-book-buttons {
  grid-row: 3;
  align-self: start;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.5rem;
  margin-top: 5rem;
}
@keyframes bs-drop-in {
  from { transform: translateY(-60vh); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.bs-overlay-open {
  font-family: var(--serif);
  font-size: 1rem;
  padding: 0.7rem 1.5rem;
  border-radius: 999px;
  border: 1px solid rgba(232, 205, 150, 0.4);
  background: rgba(232, 205, 150, 0.1);
  color: rgba(232, 205, 150, 0.95);
  cursor: pointer;
}
.bs-overlay-close {
  /* In-flow: centered below the book and its buttons. */
  position: static;
  font-size: 2rem;
  line-height: 1;
  background: none;
  border: none;
  color: rgba(232, 205, 150, 0.7);
  cursor: pointer;
  padding: 0.5rem;
}
</style>
