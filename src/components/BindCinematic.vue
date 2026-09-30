<script setup lang="ts">
import { ref } from 'vue';
import { gsap } from 'gsap';
import { chapters } from '../lib/chapters';
import Bookshelf from './Bookshelf.vue';

defineProps<{ bonusContent?: boolean }>();

const emit = defineEmits<{
  done: [];
  /** Fired when the shelf is revealed so the home page can mount behind. */
  blackout: [];
  /** Fired when the shelf beat starts so the home page (and its real
   * bookshelf) can be mounted behind the cinematic. */
  shelf: [];
}>();

const overlay = ref<HTMLElement | null>(null);
const room = ref<HTMLElement | null>(null);
const stack = ref<HTMLElement | null>(null);
const coverEl = ref<HTMLElement | null>(null);
const book3d = ref<HTMLElement | null>(null);
const flatSpine = ref<HTMLElement | null>(null);
const msCover = ref<HTMLElement | null>(null);
const playing = ref(false);
const titleTyped = ref('');
const titled = ref(false);
const TITLE = 'Gray Solutions.';

let tl: gsap.core.Timeline | null = null;

/** Restore the overlay to its resting state and hand off. */
function finish() {
  const ov = overlay.value;
  titleTyped.value = TITLE;
  titled.value = true;
  if (ov) gsap.set(ov, { display: 'none', opacity: 0 });
  if (room.value) gsap.set(room.value, { clearProps: 'all' });
  if (stack.value) {
    stack.value.innerHTML = '';
    gsap.set(stack.value, { clearProps: 'all' });
  }
  if (coverEl.value)
    gsap.set(coverEl.value, { clearProps: 'all', display: 'none', opacity: 0 });
  if (book3d.value)
    gsap.set(book3d.value, { clearProps: 'all', display: 'none', opacity: 0 });
  if (msCover.value)
    gsap.set(msCover.value, { clearProps: 'all', display: 'none', opacity: 0 });
  if (flatSpine.value)
    gsap.set(flatSpine.value, { clearProps: 'all', display: 'none', opacity: 0 });
  playing.value = false;
  tl = null;
  emit('done');
}

/** Skip to the finished book. */
function skip() {
  if (tl) tl.progress(1);
}

/**
 * The binding, beat by beat (no hands — everything moves on its own).
 * The room is a tall div: bookshelf on top, desk on bottom. We start
 * on the desk; after the book shows its 3D, the room tilts up to
 * reveal the shelf (the seam crosses the frame — one space, no cut).
 * 1. page 5 drops into the pile with a bounce;
 * 2. the pages fan out and shuffle themselves into order, chapter 1 on top;
 * 3. the stamped MANUSCRIPT cover drops onto the stack, then gets thrown
 *    off to the side, leaving chapter 1;
 * 4. the dark cover drops from above and the pages tuck inside;
 * 5. the title is written on;
 * 6. the finished book rises as a 3D object and shows its thickness;
 * 7. the room tilts up — the desk slides away below, the shelf glides
 *    in from above, seam visible;
 * 8. the book files itself into its waiting slot, staying as the 3D
 *    model, then the overlay melts away onto the home page shelf.
 *
 * App tosses the open page into the pile before calling start(), so
 * page 5 is always the real page, never a stand-in.
 */
function start() {
  const ov = overlay.value;
  const rm = room.value;
  const st = stack.value;
  const cv = coverEl.value;
  const b3d = book3d.value;
  const msc = msCover.value;
  if (!ov || !rm || !st || !cv || !b3d || !msc) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    .matches;
  if (reduced) {
    // No animation: mark it bound and hand off, same end state.
    emit('blackout');
    emit('done');
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = vw / 2;
  const cy = vh / 2;

  // Reset. The room starts on the desk (bottom half in view).
  gsap.set(ov, { display: 'block', opacity: 0 });
  gsap.set(rm, { y: -vh });
  gsap.set(cv, {
    display: 'none',
    opacity: 0,
    x: 0,
    y: 0,
    xPercent: -50,
    yPercent: -50,
    scale: 1,
    rotation: 0,
  });
  gsap.set(b3d, {
    display: 'none',
    opacity: 0,
    x: 0,
    y: 0,
    xPercent: -50,
    yPercent: -50,
    scale: 1,
    rotationY: 18,
    transformPerspective: 900,
  });
  gsap.set(msc, {
    display: 'flex',
    opacity: 1,
    x: 0,
    y: 0,
    xPercent: 0,
    yPercent: 0,
    scale: 1,
    rotation: 0,
  });
  gsap.set(st, {
    display: 'block',
    opacity: 1,
    x: 0,
    y: 0,
    xPercent: -50,
    yPercent: -50,
    scaleY: 1,
  });
  titleTyped.value = '';
  titled.value = false;
  st.innerHTML = '';
  playing.value = true;

  // The stack, bottom to top: chapters 1-5. Clones from the real pile
  // where present; numbered blanks stand in for the rest. Page 5 is
  // real — App tossed the open page into the pile before start().
  const chCards: HTMLElement[] = [];
  for (let i = 0; i < 5; i++) {
    const ch = chapters[i];
    const card = document.createElement('div');
    card.className = 'bind-page';
    card.setAttribute('aria-hidden', 'true');
    const num = document.createElement('span');
    num.className = 'bind-num';
    num.textContent = String(ch.num);
    card.appendChild(num);
    const label = document.createElement('span');
    label.className = 'bind-label';
    label.textContent = ch.label;
    card.appendChild(label);
    chCards.push(card);
  }
  const mscCard = msCover.value!;
  mscCard.classList.add('bind-page');
  chCards.push(mscCard);
  [chCards[5], ...chCards.slice(0, 5)].forEach((c) => st.appendChild(c));
  const allCards = [...st.children] as HTMLElement[];
  allCards.forEach((c) =>
    gsap.set(c, {
      position: 'absolute',
      inset: '0',
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      opacity: 1,
    }),
  );

  tl = gsap.timeline({ onComplete: finish });
  const T = tl as gsap.core.Timeline;

  // Beat 1 — the overlay rises; page 5 drops into the stack with a
  // bounce you can't miss.
  T.to(ov, { opacity: 1, duration: 0.5 }, 0);
  const ch5 = chCards[4];
  T.fromTo(
    ch5,
    { y: -vh * 0.7, opacity: 0, rotation: -10 },
    { y: 0, opacity: 1, rotation: 0, duration: 0.7, ease: 'power2.in' },
    0.45,
  );
  T.to(ch5, { y: -22, duration: 0.18, ease: 'power2.out' }, 1.17);
  T.to(ch5, { y: 0, duration: 0.34, ease: 'bounce.out' }, 1.35);
  const b1 = 1.78;

  // Beat 2 — the pages fan out and shuffle themselves into order,
  // chapter 1 ending on top.
  const fanAt = b1 + 0.3;
  const fanStep = Math.min(46, ((vw * 0.92 - 220) / 2) / 2);
  chCards.forEach((c, k) => {
    const spread = (k - 2.5) * fanStep;
    T.to(
      c,
      { x: spread, rotation: spread * 0.06, duration: 0.5, ease: 'power2.out' },
      fanAt + k * 0.04,
    );
  });
  const shuffleAt = fanAt + 0.75;
  T.call(
    () => {
      [...chCards.slice(0, 5).reverse(), chCards[5]].forEach((c) =>
        st.appendChild(c),
      );
    },
    [],
    shuffleAt,
  );
  chCards.forEach((c, k) => {
    T.to(
      c,
      { y: -90, duration: 0.22, ease: 'power2.out' },
      shuffleAt + k * 0.07,
    );
    T.to(
      c,
      { y: 0, x: 0, rotation: 0, duration: 0.42, ease: 'power2.inOut' },
      shuffleAt + k * 0.07 + 0.22,
    );
  });
  const b2 = shuffleAt + 6 * 0.07 + 0.64 + 0.15;

  // Beat 3 — the manuscript (6th card, on top after the shuffle) is thrown
  // off to the side, leaving chapter 1 on top.
  const throwAt = b2 + 0.2;
  T.to(
    msc,
    {
      x: vw * 0.8,
      y: -vh * 0.25,
      rotation: 26,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.in',
    },
    throwAt,
  );
  T.set(msc, { display: 'none' }, throwAt + 0.75);
  const b3 = throwAt + 0.8;

  // Beat 4 — the dark cover drops from above, dead-center, and seals
  // over the pages; the pages tuck inside.
  const dropAt = b3 + 0.15;
  T.set(st, { x: 0, y: 0, xPercent: -50, yPercent: -50 }, dropAt);
  T.set(
    cv,
    {
      display: 'flex',
      opacity: 1,
      x: 0,
      y: -(vh + 260),
      xPercent: -50,
      yPercent: -50,
      scale: 1,
      rotation: 0,
    },
    dropAt,
  );
  T.to(cv, { y: 0, duration: 1.05, ease: 'power2.out' }, dropAt);
  T.to(
    cv,
    { scaleY: 0.92, scaleX: 1.03, duration: 0.14, ease: 'power2.in' },
    dropAt + 1.05,
  );
  T.to(
    cv,
    { scaleY: 1, scaleX: 1, duration: 0.45, ease: 'elastic.out(1, 0.55)' },
    dropAt + 1.19,
  );
  const tuckAt = dropAt + 1.05;
  chCards.slice(0, 5).forEach((c, k) => {
    T.to(
      c,
      { y: -30, scale: 0.78, opacity: 0, duration: 0.4, ease: 'power2.in' },
      tuckAt + k * 0.03,
    );
  });
  T.set(st, { display: 'none' }, tuckAt + 0.55);
  const b4 = tuckAt + 1.0;

  // Beat 5 — the title is written on.
  const titleAt = b4 + 0.15;
  for (let i = 0; i < TITLE.length; i++) {
    const ch = TITLE[i];
    T.call(
      () => {
        titleTyped.value += ch;
      },
      [],
      titleAt + i * 0.09,
    );
  }
  const titledAt = titleAt + TITLE.length * 0.09;
  T.call(
    () => {
      titled.value = true;
    },
    [],
    titledAt,
  );
  const b5 = titledAt + 0.9;

  // Beat 6 — the flat cover becomes a real 3D book and lifts itself
  // off the desk. The book turns to show its thickness.
  const grabAt = b5 + 0.15;
  T.to(cv, { opacity: 0, duration: 0.25, ease: 'power1.in' }, grabAt);
  T.set(cv, { display: 'none' }, grabAt + 0.3);
  T.set(b3d, { display: 'block' }, grabAt);
  T.to(b3d, { opacity: 1, duration: 0.25, ease: 'power1.in' }, grabAt);
  T.to(b3d, { rotationY: -38, duration: 0.55, ease: 'power2.out' }, grabAt + 0.25);
  T.to(b3d, { rotationY: -18, duration: 0.45, ease: 'power2.inOut' }, grabAt + 0.8);
  T.to(b3d, { y: '-=46', duration: 0.5, ease: 'power2.out' }, grabAt + 0.2);
  const b6 = grabAt + 1.3;

  // Beat 7 — the room tilts up: the desk slides away below, the shelf
  // glides in from above. Slow, and the seam crosses the frame — one
  // continuous space, no cut. App mounts the home page on 'shelf'.
  T.call(() => emit('shelf'), [], b6);
  T.to(rm, { y: 0, duration: 2.2, ease: 'power2.inOut' }, b6 + 0.15);
  // The book hovers, waiting, while the room moves.
  T.to(b3d, { y: '-=30', duration: 2.2, ease: 'power2.inOut' }, b6 + 0.15);
  const b7 = b6 + 2.5;

  // Beat 8 — the book files itself into the shelf slot: flies to it,
  // turns spine-out, and seats as the flat spine. The slot is measured
  // live from the room's shelf.
  T.call(
    () => {
      const slot = rm.querySelector('[data-bind-slot]') as HTMLElement | null;
      let dx = 0;
      let dy = 0;
      let s = 0.7;
      if (slot) {
        const r = slot.getBoundingClientRect();
        dx = r.left + r.width / 2 - cx;
        dy = r.top + r.height / 2 - cy;
        s = Math.min(0.75, (r.height - 10) / 340);
      }
      const file = gsap.timeline();
      const spine = flatSpine.value!;
      gsap.set(spine, {
        display: 'none',
        opacity: 0,
        x: 0,
        y: 0,
        xPercent: -50,
        yPercent: -50,
        scale: 1,
      });
      file.to(b3d, { x: dx, y: dy, duration: 1.0, ease: 'power2.inOut' }, 0);
      file.to(b3d, { rotationY: 90, duration: 0.7, ease: 'power2.inOut' }, 0.9);
      file.to(b3d, { opacity: 0, duration: 0.25, ease: 'power1.in' }, 1.6);
      file.set(b3d, { display: 'none' }, 1.9);
      file.set(spine, { display: 'flex', x: dx, y: dy }, 1.6);
      file.to(spine, { opacity: 1, duration: 0.25, ease: 'power1.out' }, 1.6);
      file.to(spine, { scale: s, duration: 0.6, ease: 'power2.inOut' }, 1.85);
    },
    [],
    b7,
  );
  const b8 = b7 + 2.7;

  // Beat 9 — hold on the completed shelf, then melt the overlay away
  // onto the home page (which has the book in its slot by now). No
  // fade to black — one smooth handoff.
  T.call(() => emit('blackout'), [], b8 + 0.4);
  T.to(ov, { opacity: 0, duration: 1.2, ease: 'power1.inOut' }, b8 + 0.6);
}

defineExpose({ start });
</script>

<template>
  <div
    ref="overlay"
    class="bind-overlay"
    role="dialog"
    aria-label="Binding the manuscript"
  >
    <!-- The room: bookshelf on top, desk on bottom. We start on the
         desk; the tilt-up slides the shelf into view. -->
    <div ref="room" class="bind-room" aria-hidden="true">
      <div class="bind-shelf-half">
        <Bookshelf :interactive="false" :show-manuscript="false" />
      </div>
      <div class="bind-desk-half" :class="{ 'has-bonus': bonusContent }">
        <div v-if="bonusContent" class="bind-props" aria-hidden="true">
          <div class="bp-candle"><i></i></div>
          <div class="bp-mug"></div>
          <div class="bp-phone"></div>
          <div class="bp-pencil"></div>
          <div class="bp-draft"><i></i><i></i><i></i></div>
        </div>
      </div>
    </div>

    <!-- The neat stack forms here, on the desk. -->
    <div ref="stack" class="bind-stack" aria-hidden="true"></div>

    <!-- The stamped MANUSCRIPT cover. -->
    <div ref="msCover" class="bind-mscover" aria-hidden="true">
      <div class="bind-mscover-frame">
        <p class="bind-mscover-stamp">Manuscript</p>
        <p class="bind-mscover-sub">Six pages &middot; first draft</p>
      </div>
    </div>

    <!-- The bound book cover. -->
    <div ref="coverEl" class="bind-cover" :class="{ titled }" aria-hidden="true">
      <div class="bind-cover-frame">
        <span class="bind-mark">G.</span>
        <p v-if="!titled" class="bind-title bind-title-typing">
          {{ titleTyped }}<span class="type-cursor"></span>
        </p>
        <p v-else class="bind-title">Gray<br />Solutions<em>.</em></p>
        <p class="bind-tag"><em>Websites that tell stories.</em></p>
        <p class="bind-by">Chris Gray</p>
      </div>
    </div>

    <!-- The finished book as a 3D object. -->
    <div ref="book3d" class="bind-book3d" aria-hidden="true">
      <div class="b3d-face b3d-front">
        <div class="b3d-frame">
          <span class="b3d-mark">G.</span>
          <p class="b3d-title">Gray<br />Solutions<em>.</em></p>
          <p class="b3d-tag"><em>Websites that tell stories.</em></p>
          <p class="b3d-by">Chris Gray</p>
        </div>
      </div>
      <div class="b3d-face b3d-spine"><span>Gray Solutions</span></div>
      <div class="b3d-face b3d-pages"></div>
    </div>

    <!-- Flat spine: seats into the shelf gap. -->
    <div ref="flatSpine" class="bind-flat-spine" aria-hidden="true">
      <span>Gray Solutions</span>
    </div>

    <button
      v-if="playing"
      type="button"
      class="bind-skip"
      @click="skip"
    >
      Skip
    </button>
  </div>
</template>

<style scoped>
.bind-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: none;
  overflow: hidden;
}
/* The room: two viewports tall. Shelf on top, desk on bottom.
   We start translated up so the desk fills the frame; the tilt-up
   slides the shelf in. The seam between them crosses the frame. */
.bind-room {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 200vh;
}
.bind-shelf-half,
.bind-desk-half {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
/* The desk: same mahogany as the manuscript desk. */
.bind-desk-half {
  background-color: #2a140c;
  background-image:
    repeating-linear-gradient(
      94deg,
      rgba(10, 4, 2, 0.18) 0px,
      rgba(10, 4, 2, 0.18) 1px,
      transparent 1px,
      transparent 7px
    ),
    linear-gradient(180deg, #341a10 0%, #2a140c 60%, #1e0e08 100%);
}
/* Bonus props framing the desk: static dressing, never interactive. */
.bind-props {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.bind-props > div {
  position: absolute;
}
.bp-candle {
  left: 6%;
  top: 8%;
  width: 34px;
  height: 64px;
  background: linear-gradient(180deg, #f5e8d0 0%, #d9c39a 100%);
  border-radius: 6px 6px 3px 3px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}
.bp-candle i {
  position: absolute;
  left: 50%;
  top: -14px;
  width: 10px;
  height: 16px;
  transform: translateX(-50%);
  background: radial-gradient(closest-side, #fff6d8 0%, #ffca7a 55%, rgba(255, 150, 50, 0) 100%);
  border-radius: 50%;
  filter: blur(1px);
}
.bp-mug {
  right: 7%;
  top: 10%;
  width: 44px;
  height: 40px;
  background: linear-gradient(180deg, #7a2d1a 0%, #4a1a0e 100%);
  border-radius: 4px 4px 10px 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}
.bp-mug::after {
  content: '';
  position: absolute;
  right: -12px;
  top: 6px;
  width: 16px;
  height: 22px;
  border: 5px solid #4a1a0e;
  border-left: none;
  border-radius: 0 10px 10px 0;
}
.bp-phone {
  right: 10%;
  bottom: 12%;
  width: 38px;
  height: 66px;
  background: linear-gradient(180deg, #1a1a1c 0%, #0c0c0e 100%);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  transform: rotate(-8deg);
}
.bp-pencil {
  left: 8%;
  bottom: 14%;
  width: 90px;
  height: 8px;
  background: linear-gradient(180deg, #e8a83c 0%, #c07f1e 100%);
  border-radius: 4px;
  transform: rotate(18deg);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.45);
}
.bp-pencil::after {
  content: '';
  position: absolute;
  right: -14px;
  top: 0;
  border-left: 14px solid #e8d5a8;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
}
.bp-draft {
  left: 12%;
  top: 14%;
  width: 56px;
  height: 70px;
}
.bp-draft i {
  position: absolute;
  inset: 0;
  background: #e8dcc2;
  border: 1px solid rgba(60, 45, 10, 0.3);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
}
.bp-draft i:nth-child(2) { transform: rotate(-4deg) translate(-2px, 2px); }
.bp-draft i:nth-child(3) { transform: rotate(3deg) translate(2px, -1px); }
.bind-skip {
  position: absolute;
  top: max(1rem, env(safe-area-inset-top));
  right: 1.1rem;
  z-index: 2;
  background: none;
  border: 1px solid rgba(235, 225, 210, 0.35);
  border-radius: 999px;
  color: rgba(235, 225, 210, 0.75);
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.55em 1.1em;
  cursor: pointer;
}
.bind-skip:active {
  background: rgba(235, 225, 210, 0.12);
}
/* ... (rest of the existing styles for stack, cover, book3d, etc.) ... */
.bind-stack {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 220px;
  height: 300px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.bind-stack :deep(.bind-page),
.bind-stack :deep(.pile-page) {
  position: absolute;
  inset: 0;
  background: var(--page);
  border: 1px solid var(--line-soft);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}
html[data-theme='dark'] .bind-stack :deep(.bind-page),
html[data-theme='dark'] .bind-stack :deep(.pile-page) {
  background: #e8dcc2;
  border-color: rgba(60, 45, 10, 0.35);
}
:deep(.bind-page) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 1rem;
  text-align: center;
}
:deep(.bind-num) {
  font-family: var(--serif);
  font-size: 1.8rem;
  font-weight: 600;
  color: rgba(74, 52, 32, 0.6);
  user-select: none;
}
:deep(.bind-label) {
  font-family: var(--serif);
  font-size: 0.85rem;
  color: rgba(74, 52, 32, 0.75);
  user-select: none;
  line-height: 1.3;
}
.bind-mscover {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 220px;
  height: 300px;
  display: none;
  align-items: center;
  justify-content: center;
  background: var(--page);
  border: 1px solid var(--line);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  z-index: 2;
}
.bind-mscover-frame {
  flex: 1;
  margin: 13px;
  border: 2px dashed rgba(120, 90, 60, 0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.2rem 0.8rem;
  gap: 0.6rem;
}
.bind-mscover-stamp {
  font-family: var(--serif);
  font-size: clamp(1.1rem, 5.5vw, 1.5rem);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(120, 70, 40, 0.82);
  margin: 0;
  transform: rotate(-4deg);
  border: 3px double rgba(120, 70, 40, 0.6);
  padding: 0.35em 0.5em 0.35em 0.65em;
  max-width: 100%;
  box-sizing: border-box;
}
.bind-mscover-sub {
  font-size: 0.85rem;
  color: rgba(60, 45, 30, 0.65);
  margin: 0;
}
.bind-cover {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 260px;
  height: 340px;
  transform: translate(-50%, -50%);
  display: none;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #1a120b 0%, #0f0a06 100%);
  border: 1px solid rgba(208, 138, 78, 0.35);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.6),
    inset 0 0 40px rgba(0, 0, 0, 0.5);
}
.bind-cover-frame {
  flex: 1;
  margin: 13px;
  border: 1px solid rgba(208, 138, 78, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.2rem 0.8rem;
  gap: 0.55rem;
}
.bind-mark {
  font-family: var(--serif);
  font-style: italic;
  color: #d08a4e;
  font-size: 1.5rem;
}
.bind-title {
  font-family: var(--serif);
  font-weight: 480;
  font-size: clamp(1.9rem, 8vw, 2.5rem);
  line-height: 1.02;
  letter-spacing: -0.01em;
  margin: 0;
  color: #f2ecdf;
  min-height: 2.2em;
}
.bind-title em {
  font-style: italic;
  color: #d08a4e;
  font-weight: 400;
}
.bind-title-typing {
  font-size: 1.8rem;
}
.bind-mark,
.bind-tag,
.bind-by {
  opacity: 0;
  transition: opacity 0.9s ease;
}
.bind-cover.titled .bind-mark,
.bind-cover.titled .bind-tag,
.bind-cover.titled .bind-by {
  opacity: 1;
}
.bind-tag {
  font-family: var(--serif);
  font-style: italic;
  color: #a7a192;
  font-size: 0.98rem;
  margin: 0.35rem 0 0;
}
.bind-by {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #6f6a5e;
  margin: auto 0 0;
}
.bind-book3d {
  --t: 36px;
  position: absolute;
  left: 50%;
  top: 50%;
  width: 260px;
  height: 340px;
  transform-style: preserve-3d;
  display: none;
  opacity: 0;
  z-index: 3;
}
.b3d-face {
  position: absolute;
}
.b3d-front {
  inset: 0;
  transform: translateZ(calc(var(--t) / 2));
  background: linear-gradient(145deg, #1a120b 0%, #0f0a06 100%);
  border: 1px solid rgba(208, 138, 78, 0.35);
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.b3d-frame {
  flex: 1;
  margin: 13px;
  border: 1px solid rgba(208, 138, 78, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1.2rem 0.8rem;
  gap: 0.55rem;
}
.b3d-mark {
  font-family: var(--serif);
  font-style: italic;
  color: #d08a4e;
  font-size: 1.5rem;
}
.b3d-title {
  font-family: var(--serif);
  font-weight: 480;
  font-size: clamp(1.9rem, 8vw, 2.5rem);
  line-height: 1.02;
  letter-spacing: -0.01em;
  margin: 0;
  color: #f2ecdf;
}
.b3d-title em {
  font-style: italic;
  color: #d08a4e;
  font-weight: 400;
}
.b3d-tag {
  font-family: var(--serif);
  font-style: italic;
  color: #a7a192;
  font-size: 0.98rem;
  margin: 0.35rem 0 0;
}
.b3d-by {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #6f6a5e;
  margin: auto 0 0;
}
.b3d-spine {
  top: 0;
  bottom: 0;
  left: 0;
  width: var(--t);
  transform: rotateY(-90deg) translateZ(calc(var(--t) / 2));
  background: linear-gradient(to bottom, #1d140c 0%, #100c07 100%);
  border-left: 1px solid rgba(208, 138, 78, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.b3d-spine span {
  writing-mode: vertical-rl;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #d08a4e;
  white-space: nowrap;
}
.b3d-pages {
  top: 1.5%;
  bottom: 1.5%;
  right: 0;
  width: var(--t);
  transform: rotateY(90deg) translateZ(calc(var(--t) / 2));
  background: repeating-linear-gradient(
    to bottom,
    #d3c096 0 2px,
    #a68f63 2px 3px
  );
}
.bind-flat-spine {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 44px;
  height: 340px;
  display: none;
  opacity: 0;
  z-index: 3;
  background: linear-gradient(145deg, #1a120b 0%, #0f0a06 100%);
  border: 1px solid rgba(208, 138, 78, 0.35);
  align-items: center;
  justify-content: center;
}
.bind-flat-spine span {
  writing-mode: vertical-rl;
  font-family: var(--serif);
  color: #d08a4e;
  font-size: 1rem;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.bind-skip {
  z-index: 6;
}
</style>
