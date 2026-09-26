<script setup lang="ts">
import { ref } from 'vue';
import { gsap } from 'gsap';

const emit = defineEmits<{
  done: [];
  /** Fired at full black so the home page can swap in the finished book. */
  blackout: [];
  /** Fired when the shelf beat starts so the home page (and its real
   * bookshelf) can be mounted behind the cinematic. */
  shelf: [];
}>();

const overlay = ref<HTMLElement | null>(null);
const backdrop = ref<HTMLElement | null>(null);
const stack = ref<HTMLElement | null>(null);
const coverEl = ref<HTMLElement | null>(null);
const book3d = ref<HTMLElement | null>(null);
const msCover = ref<HTMLElement | null>(null);
const veil = ref<HTMLElement | null>(null);
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
  if (backdrop.value) gsap.set(backdrop.value, { opacity: 1 });
  if (veil.value) gsap.set(veil.value, { opacity: 0 });
  playing.value = false;
  tl = null;
  emit('done');
}

/** Skip to the finished book. */
function skip() {
  if (tl) tl.progress(1);
}

/**
 * The binding, beat by beat (no hands — everything moves on its own):
 * 1. page 5 drops into the pile with a bounce;
 * 2. the pages fan out and shuffle themselves into order, chapter 1 on top;
 * 3. the stamped MANUSCRIPT cover drops onto the stack, then gets thrown
 *    off to the side, leaving chapter 1;
 * 4. the dark cover drops from above and the pages tuck inside;
 * 5. the title is written on;
 * 6. the finished book rises as a 3D object; the dark backdrop dissolves
 *    to reveal the home page's real bookshelf, and the book files itself
 *    into its waiting slot, staying as the 3D model;
 * 7. fade to black, fade back in on the home page with the finished book.
 *
 * App tosses the open page into the pile before calling start(), so
 * page 5 is always the real page, never a stand-in.
 */
function start() {
  const ov = overlay.value;
  const st = stack.value;
  const cv = coverEl.value;
  const b3d = book3d.value;
  const msc = msCover.value;
  const vl = veil.value;
  if (!ov || !st || !cv || !b3d || !msc || !vl) return;
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

  // Reset. Centering is pinned explicitly (xPercent/yPercent) rather
  // than trusting the CSS transform parse. The stack starts centered —
  // nothing to drag in from the pile anymore.
  gsap.set(ov, { display: 'block', opacity: 0 });
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
    opacity: 0,
    x: 0,
    y: 0,
    xPercent: -50,
    yPercent: -50,
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
  gsap.set(vl, { opacity: 0 });
  titleTyped.value = '';
  titled.value = false;
  st.innerHTML = '';
  playing.value = true;

  // The stack, bottom to top: chapters 1-5. Clones from the real pile
  // where present; numbered blanks stand in for the rest. Page 5 is
  // real — App tossed the open page into the pile before start().
  // The stamped MANUSCRIPT cover is its own element (msCover) and sits
  // in front of the stack, facing the viewer.
  const pilePages = [
    ...document.querySelectorAll('.read-pile .pile-page'),
  ] as HTMLElement[];
  const pageFor = (i: number) =>
    pilePages.find((el) => el.dataset.pileIndex === String(i));
  const chCards: HTMLElement[] = [];
  for (let i = 0; i < 5; i++) {
    const src = pageFor(i);
    let card: HTMLElement;
    if (src) {
      card = src.cloneNode(true) as HTMLElement;
      card.removeAttribute('data-pile-index');
      card.setAttribute('aria-hidden', 'true');
    } else {
      card = document.createElement('div');
      card.className = 'bind-page bind-blank';
      const num = document.createElement('span');
      num.className = 'bind-num';
      num.textContent = String(i + 1);
      card.appendChild(num);
    }
    chCards.push(card);
  }
  chCards.forEach((c) => st.appendChild(c));
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
  // Landing bounce and settle — page five has arrived.
  T.to(ch5, { y: -22, duration: 0.18, ease: 'power2.out' }, 1.17);
  T.to(ch5, { y: 0, duration: 0.34, ease: 'bounce.out' }, 1.35);
  const b1 = 1.78;

  // Beat 2 — the pages fan out and shuffle themselves into order,
  // chapter 1 ending on top.
  const fanAt = b1 + 0.3;
  const fanStep = Math.min(46, ((vw * 0.92 - 220) / 2) / 2);
  chCards.forEach((c, k) => {
    const spread = (k - 2) * fanStep;
    T.to(
      c,
      { x: spread, rotation: spread * 0.06, duration: 0.5, ease: 'power2.out' },
      fanAt + k * 0.04,
    );
  });
  const shuffleAt = fanAt + 0.75;
  T.call(
    () => {
      [...chCards].reverse().forEach((c) => st.appendChild(c));
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
  const b2 = shuffleAt + 5 * 0.07 + 0.64 + 0.15;

  // Beat 3 — the stamped MANUSCRIPT cover starts on top of the neat
  // stack (it fades in where it sits — no fly-in); then it's thrown
  // off to the side, leaving chapter 1 on top.
  const msAt = b2 + 0.2;
  T.to(msc, { opacity: 1, duration: 0.45, ease: 'power1.out' }, msAt);
  const throwAt = msAt + 1.1;
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
  // Pin the stack dead-center under the falling cover.
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
  // Landing squash — the cover seals shut over the pages.
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
  chCards.forEach((c, k) => {
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

  // Beat 6a — the flat cover becomes a real 3D book and lifts itself
  // off the desk. The book turns to show its thickness — the 3D
  // moment reads clearly.
  const grabAt = b5 + 0.15;
  T.to(cv, { opacity: 0, duration: 0.25, ease: 'power1.in' }, grabAt);
  T.set(cv, { display: 'none' }, grabAt + 0.3);
  T.set(b3d, { display: 'block' }, grabAt);
  T.to(b3d, { opacity: 1, duration: 0.25, ease: 'power1.in' }, grabAt);
  // Turn to show it's a real object with thickness.
  T.to(b3d, { rotationY: -38, duration: 0.55, ease: 'power2.out' }, grabAt + 0.25);
  T.to(b3d, { rotationY: -18, duration: 0.45, ease: 'power2.inOut' }, grabAt + 0.8);
  // Lift off the desk.
  T.to(b3d, { y: '-=46', duration: 0.5, ease: 'power2.out' }, grabAt + 0.2);
  const b6 = grabAt + 1.3;

  // Beat 6b — the dark backdrop dissolves, revealing the home page's
  // real bookshelf behind the cinematic while the book hovers, waiting.
  // App mounts the home page on the 'shelf' emit.
  const bd = backdrop.value!;
  T.call(() => emit('shelf'), [], b6);
  T.to(bd, { opacity: 0, duration: 1.1, ease: 'power2.inOut' }, b6 + 0.15);
  const b7 = b6 + 1.35;

  // Beat 6c — the book flies itself to the home page shelf's slot,
  // turns so the spine faces the reader, and files itself among the
  // classics as the 3D model. The slot is measured live, once the
  // home page has settled.
  T.call(
    () => {
      const slot = document.querySelector(
        '.view-home [data-bind-slot]',
      ) as HTMLElement | null;
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
      // Fly to the slot.
      file.to(b3d, { x: dx, y: dy, duration: 1.0, ease: 'power2.inOut' }, 0);
      // Turn fully sideways and seat into the slot, like it used to.
      file.to(b3d, { rotationY: 90, duration: 0.7, ease: 'power2.inOut' }, 0.85);
      file.to(b3d, { scale: s, duration: 0.7, ease: 'power2.inOut' }, 0.85);
      // It stays as the 3D model in the slot — no flat swap.
    },
    [],
    b7,
  );
  const b8 = b7 + 2.0;

  // Beat 7 — hold on the completed shelf; fade to black; behind it the
  // home page takes the bound shelf; fade back in on it.
  T.to(vl, { opacity: 1, duration: 0.8, ease: 'power1.inOut' }, b8);
  T.call(() => emit('blackout'), [], b8 + 0.85);
  T.to(ov, { opacity: 0, duration: 1.0, ease: 'power1.inOut' }, b8 + 1.35);
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
    <!-- The dark cinematic backdrop; dissolves for the shelf beat. -->
    <div ref="backdrop" class="bind-backdrop" aria-hidden="true"></div>

    <!-- The neat stack forms here. -->
    <div ref="stack" class="bind-stack" aria-hidden="true"></div>

    <!-- The stamped MANUSCRIPT cover: drops in front of the stack,
         stamp facing the viewer, then flies away on its own. -->
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

    <!-- The finished book as a 3D object: lifts and files itself. -->
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

    <!-- Fade-to-black veil for the final beat. -->
    <div ref="veil" class="bind-veil" aria-hidden="true"></div>

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
.bind-backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      120% 90% at 50% 10%,
      rgba(58, 36, 22, 0.98) 0%,
      rgba(32, 19, 12, 0.99) 55%,
      rgba(18, 11, 7, 1) 100%
    );
}
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
.bind-stack {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 220px;
  height: 300px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.bind-stack .bind-page,
.bind-stack .pile-page {
  position: absolute;
  inset: 0;
  background: var(--page);
  border: 1px solid var(--line-soft);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}
/* Numbered stand-ins for pages not in the pile. */
.bind-blank {
  display: grid;
  place-items: center;
}
.bind-num {
  font-family: var(--serif);
  font-size: 1.8rem;
  font-weight: 600;
  color: rgba(74, 52, 32, 0.6);
  user-select: none;
}
/* The stamped MANUSCRIPT cover: paper, big stamp, sits in front of
   the stack facing the viewer, then flies away on its own. */
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
/* The finished cover, matching the bound book on the home page:
   G. mark, Gray Solutions., tagline, byline. */
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
/* While the title is being written it types on one line; once done it
   settles into the two-line treatment above. */
.bind-title-typing {
  font-size: 1.8rem;
}
/* The mark, tagline and byline fade in once the title is written. */
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
/* The finished book as a 3D object: front, spine, page block. */
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
  /* No filter here — filter flattens preserve-3d into a flat card. */
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
/* Fade-to-black veil for the final beat. */
.bind-veil {
  position: absolute;
  inset: 0;
  background: #000;
  opacity: 0;
  pointer-events: none;
  z-index: 5;
}
.bind-skip {
  z-index: 6;
}
</style>
