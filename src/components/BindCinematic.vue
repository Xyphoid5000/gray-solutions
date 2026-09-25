<script setup lang="ts">
import { ref } from 'vue';
import { gsap } from 'gsap';
import Bookshelf from './Bookshelf.vue';

const emit = defineEmits<{
  done: [];
  /** Fired at full black so the home page can swap in the finished book. */
  blackout: [];
}>();

const overlay = ref<HTMLElement | null>(null);
const stack = ref<HTMLElement | null>(null);
const coverEl = ref<HTMLElement | null>(null);
const book3d = ref<HTMLElement | null>(null);
const handL = ref<HTMLElement | null>(null);
const handR = ref<HTMLElement | null>(null);
const cameraWrap = ref<HTMLElement | null>(null);
const veil = ref<HTMLElement | null>(null);
const playing = ref(false);
const titleTyped = ref('');
const titled = ref(false);
const TITLE = 'Gray Solutions';

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
  if (cameraWrap.value) gsap.set(cameraWrap.value, { yPercent: 100 });
  if (veil.value) gsap.set(veil.value, { opacity: 0 });
  if (handL.value) gsap.set(handL.value, { clearProps: 'all', opacity: 0 });
  if (handR.value) gsap.set(handR.value, { clearProps: 'all', opacity: 0 });
  // The shelf's own spine only appears once the book is filed.
  const ours = ov?.querySelector('.bs-ours');
  if (ours) gsap.set(ours, { opacity: 0 });
  playing.value = false;
  tl = null;
  emit('done');
}

/** Skip to the finished book. */
function skip() {
  if (tl) tl.progress(1);
}

/**
 * The binding, beat by beat:
 * 1. the final pages land in the pile (5-4-3-2-1 over the cover);
 * 2. hands swing in from the right, drag the pile to center, fan the
 *    pages and shuffle them into 1-2-3-4-5;
 * 3. the MANUSCRIPT cover is plucked out and flung away;
 * 4. the dark cover drops from above and the pages tuck inside;
 * 5. the title is written on;
 * 6. the finished book takes its slot on a shelf of classics;
 * 7. fade to black, fade back in on the home page with the finished book.
 */
function start() {
  const ov = overlay.value;
  const st = stack.value;
  const cv = coverEl.value;
  const b3d = book3d.value;
  const hl = handL.value;
  const hr = handR.value;
  const cam = cameraWrap.value;
  const vl = veil.value;
  if (!ov || !st || !cv || !b3d || !hl || !hr || !cam || !vl) return;
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

  // The pile's screen spot — the stack starts life there. The real
  // pile hugs the screen edge, so the spot is clamped to keep the
  // 220x300 stack fully visible for the opening beats.
  const pileRect = document
    .querySelector('.read-pile')
    ?.getBoundingClientRect();
  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, v));
  const pileCx = pileRect
    ? clamp(pileRect.left + pileRect.width / 2, 132, vw - 132)
    : vw * 0.16;
  const pileCy = pileRect
    ? clamp(pileRect.top + pileRect.height / 2, 172, vh - 172)
    : vh * 0.78;

  // Reset. Centering is pinned explicitly (xPercent/yPercent) rather
  // than trusting the CSS transform parse.
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
  gsap.set(st, {
    display: 'block',
    opacity: 1,
    x: pileCx - cx,
    y: pileCy - cy,
    xPercent: -50,
    yPercent: -50,
    scaleY: 1,
  });
  gsap.set(cam, { yPercent: 100 });
  gsap.set(vl, { opacity: 0 });
  const ours = ov.querySelector('.bs-ours');
  if (ours) gsap.set(ours, { opacity: 0 });
  // Both hands work from the right side; the left hand is mirrored so
  // both reach toward the pile.
  gsap.set([hl, hr], {
    left: 0,
    top: 0,
    right: 'auto',
    xPercent: -50,
    yPercent: -50,
    x: vw + 240,
    y: pileCy,
    scaleX: 1,
    opacity: 0,
  });
  gsap.set(hl, { scaleX: -1 });
  titleTyped.value = '';
  titled.value = false;
  st.innerHTML = '';
  playing.value = true;

  // The stack, bottom to top: cover, then chapters 1-5. Clones from the
  // real pile where present; numbered blanks stand in for the rest.
  const pilePages = [
    ...document.querySelectorAll('.read-pile .pile-page'),
  ] as HTMLElement[];
  const pageFor = (i: number) =>
    pilePages.find((el) => el.dataset.pileIndex === String(i));
  const coverSrc = pilePages.find(
    (el) => el.dataset.pileIndex === undefined,
  );
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
  let coverCard: HTMLElement | null = null;
  if (coverSrc) {
    coverCard = coverSrc.cloneNode(true) as HTMLElement;
    coverCard.removeAttribute('data-pile-index');
    coverCard.setAttribute('aria-hidden', 'true');
  }
  if (coverCard) st.appendChild(coverCard);
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

  // Beat 1 — the overlay rises; the final page drops into the pile and
  // lands with a bounce you can't miss, leaving 5-4-3-2-1 over the cover.
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
  allCards.forEach((c, k) => {
    if (c === ch5) return;
    T.fromTo(
      c,
      { rotation: k % 2 ? 5 : -5 },
      { rotation: 0, duration: 0.6, ease: 'power2.out' },
      1.3 + k * 0.05,
    );
  });
  const b1 = 1.78;

  // Beat 2 — hands swing in from the right, grab the pile, drag it to
  // center, fan the pages and shuffle them into 1-2-3-4-5.
  T.to([hl, hr], { opacity: 1, duration: 0.3 }, b1);
  T.to(hr, { x: pileCx + 150, duration: 0.7, ease: 'power3.out' }, b1);
  T.to(
    hl,
    { x: pileCx + 240, y: pileCy - 60, duration: 0.7, ease: 'power3.out' },
    b1 + 0.08,
  );
  const dragAt = b1 + 0.85;
  T.to(st, { x: 0, y: 0, duration: 0.9, ease: 'power2.inOut' }, dragAt);
  T.to(hr, { x: cx + 150, y: cy, duration: 0.9, ease: 'power2.inOut' }, dragAt);
  T.to(
    hl,
    { x: cx + 240, y: cy - 60, duration: 0.9, ease: 'power2.inOut' },
    dragAt,
  );
  const fanAt = dragAt + 1.0;
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
      if (coverCard) st.appendChild(coverCard);
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
  T.to(
    hr,
    { y: cy + 16, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' },
    shuffleAt,
  );
  T.to(
    hl,
    { y: cy - 44, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' },
    shuffleAt + 0.1,
  );
  const handsOutAt = shuffleAt + 5 * 0.07 + 0.64 + 0.15;
  T.to(
    [hl, hr],
    { x: vw + 240, opacity: 0, duration: 0.55, ease: 'power2.in' },
    handsOutAt,
  );
  const b2 = handsOutAt + 0.6;

  // Beat 3 — one hand plucks the MANUSCRIPT cover and flings it away.
  T.set(hr, { x: vw + 240, y: cy, opacity: 1 }, b2);
  T.to(hr, { x: cx + 200, duration: 0.55, ease: 'power3.out' }, b2 + 0.05);
  const pluckAt = b2 + 0.7;
  if (coverCard) {
    T.to(
      coverCard,
      { x: 175, rotation: 12, duration: 0.4, ease: 'power2.out' },
      pluckAt,
    );
  }
  const flingAt = pluckAt + 0.5;
  T.to(hr, { x: vw + 320, duration: 0.55, ease: 'power2.in' }, flingAt);
  if (coverCard) {
    T.to(
      coverCard,
      {
        x: vw * 0.75,
        rotation: 32,
        opacity: 0,
        duration: 0.55,
        ease: 'power2.in',
      },
      flingAt,
    );
    T.set(coverCard, { display: 'none' }, flingAt + 0.6);
  }
  T.set(hr, { opacity: 0 }, flingAt + 0.6);
  const b3 = flingAt + 0.65;

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

  // Beat 6a — a hand picks up the finished book; the flat cover
  // becomes a real 3D object in its grip.
  T.set(hr, { x: vw + 240, y: cy, opacity: 1 }, b5);
  T.to(hr, { x: cx + 130, duration: 0.55, ease: 'power3.out' }, b5 + 0.05);
  const grabAt = b5 + 0.65;
  T.to(cv, { opacity: 0, duration: 0.25, ease: 'power1.in' }, grabAt);
  T.set(cv, { display: 'none' }, grabAt + 0.3);
  T.set(b3d, { display: 'block' }, grabAt);
  T.to(b3d, { opacity: 1, duration: 0.25, ease: 'power1.in' }, grabAt);
  // Lift off the desk.
  T.to(
    [hr, b3d],
    { y: '-=46', duration: 0.5, ease: 'power2.out' },
    grabAt + 0.2,
  );
  const b6 = grabAt + 0.85;

  // Beat 6b — the camera tilts back up: the bookshelf glides in and
  // takes the frame; the hand holds the book steady through the move.
  T.to(cam, { yPercent: 0, duration: 1.35, ease: 'power3.inOut' }, b6);
  const b7 = b6 + 1.35;

  // Beat 6c — the hand carries the book to its slot, turns it so the
  // spine faces the reader, and files it among the classics. The slot
  // is measured live, once the shelf has settled.
  T.call(
    () => {
      const slot = ov.querySelector('[data-bind-slot]') as HTMLElement | null;
      const spine = ov.querySelector('.bs-ours');
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
      // Carry to the slot.
      file.to(b3d, { x: dx, y: dy, duration: 1.0, ease: 'power2.inOut' }, 0);
      file.to(
        hr,
        { x: `+=${dx}`, y: `+=${dy}`, duration: 1.0, ease: 'power2.inOut' },
        0,
      );
      // Turn: the spine swings toward the reader as it seats.
      file.to(b3d, { rotationY: 90, duration: 0.7, ease: 'power2.inOut' }, 0.85);
      file.to(b3d, { scale: s, duration: 0.7, ease: 'power2.inOut' }, 0.85);
      // The 3D book becomes the shelf's own spine.
      file.to(b3d, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 1.7);
      if (spine)
        file.to(spine, { opacity: 1, duration: 0.35, ease: 'power1.out' }, 1.7);
      // The hand lets go and leaves.
      file.to(
        hr,
        { x: vw + 260, opacity: 0, duration: 0.5, ease: 'power2.in' },
        1.95,
      );
    },
    [],
    b7,
  );
  const b8 = b7 + 2.75;

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
    <!-- The neat stack forms here. -->
    <div ref="stack" class="bind-stack" aria-hidden="true"></div>

    <!-- Hands: flat silhouettes, working from the right side. -->
    <div ref="handL" class="bind-hand bind-hand-l" aria-hidden="true">
      <svg viewBox="0 0 140 90" fill="currentColor" aria-hidden="true">
        <path
          d="M8 45 C8 28 20 18 38 18 L84 18 C90 18 94 22 94 28 L94 62 C94 68 90 72 84 72 L38 72 C20 72 8 62 8 45 Z"
        />
        <rect x="94" y="24" width="38" height="10" rx="5" />
        <rect x="94" y="38" width="44" height="10" rx="5" />
        <rect x="94" y="52" width="36" height="10" rx="5" />
        <path d="M30 72 C36 84 52 88 64 82 L70 78 L62 70 C52 74 40 72 34 64 Z" />
      </svg>
    </div>
    <div ref="handR" class="bind-hand bind-hand-r" aria-hidden="true">
      <svg viewBox="0 0 140 90" fill="currentColor" aria-hidden="true">
        <path
          d="M132 45 C132 28 120 18 102 18 L56 18 C50 18 46 22 46 28 L46 62 C46 68 50 72 56 72 L102 72 C120 72 132 62 132 45 Z"
        />
        <rect x="8" y="24" width="38" height="10" rx="5" />
        <rect x="2" y="38" width="44" height="10" rx="5" />
        <rect x="10" y="52" width="36" height="10" rx="5" />
        <path
          d="M110 72 C104 84 88 88 76 82 L70 78 L78 70 C88 74 100 72 106 64 Z"
        />
      </svg>
    </div>

    <!-- The bound book cover. -->
    <div ref="coverEl" class="bind-cover" :class="{ titled }" aria-hidden="true">
      <div class="bind-cover-inner">
        <p class="bind-title">{{ titleTyped }}<span class="type-cursor"></span></p>
        <p class="bind-tag"><em>Websites that tell stories.</em></p>
        <p class="bind-by">Chris Gray</p>
      </div>
    </div>

    <!-- The finished book as a 3D object, picked up by the hand. -->
    <div ref="book3d" class="bind-book3d" aria-hidden="true">
      <div class="b3d-face b3d-front">
        <div class="b3d-frame">
          <p class="b3d-title">Gray Solutions</p>
          <p class="b3d-tag"><em>Websites that tell stories.</em></p>
          <p class="b3d-by">Chris Gray</p>
        </div>
      </div>
      <div class="b3d-face b3d-spine"><span>Gray Solutions</span></div>
      <div class="b3d-face b3d-pages"></div>
    </div>

    <!-- The camera tilts up to the real bookshelf; the book is filed
         into its waiting slot. -->
    <div ref="cameraWrap" class="bind-camera" aria-hidden="true">
      <Bookshelf :interactive="false" :show-manuscript="false" />
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
  background:
    radial-gradient(
      120% 90% at 50% 10%,
      rgba(58, 36, 22, 0.98) 0%,
      rgba(32, 19, 12, 0.99) 55%,
      rgba(18, 11, 7, 1) 100%
    );
  overflow: hidden;
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
.bind-hand {
  position: absolute;
  top: 50%;
  width: min(320px, 42vw);
  color: rgba(12, 8, 5, 0.92);
  opacity: 0;
  transform: translateY(-50%);
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.5));
  z-index: 4;
}
.bind-hand-l {
  left: -4vw;
  transform: translate(-120%, -50%);
}
.bind-hand-r {
  right: -4vw;
  transform: translate(120%, -50%);
}
.bind-hand svg {
  width: 100%;
  height: auto;
  display: block;
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
.bind-cover-inner {
  text-align: center;
  padding: 2rem;
}
.bind-title {
  font-family: var(--font-display);
  font-size: 1.8rem;
  color: var(--ember);
  margin: 0 0 0.5rem;
  min-height: 2.2em;
}
/* The tagline and byline fade in once the title is written — the same
   words as the finished book on the home page. */
.bind-tag,
.bind-by {
  opacity: 0;
  transition: opacity 0.9s ease;
}
.bind-cover.titled .bind-tag,
.bind-cover.titled .bind-by {
  opacity: 1;
}
.bind-tag {
  font-size: 0.85rem;
  color: rgba(235, 225, 210, 0.75);
  margin: 0 0 0.35rem;
}
.bind-by {
  font-size: 0.8rem;
  color: rgba(235, 225, 210, 0.55);
  margin: 0;
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
  filter: drop-shadow(0 30px 44px rgba(0, 0, 0, 0.55));
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
  text-align: center;
  padding: 2rem;
}
.b3d-title {
  font-family: var(--font-display);
  font-size: 1.8rem;
  color: var(--ember);
  margin: 0 0 0.5rem;
}
.b3d-tag {
  font-size: 0.85rem;
  color: rgba(235, 225, 210, 0.75);
  margin: 0 0 0.35rem;
}
.b3d-by {
  font-size: 0.8rem;
  color: rgba(235, 225, 210, 0.55);
  margin: 0;
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
/* The camera tilt: the real bookshelf glides in and takes the frame. */
.bind-camera {
  position: absolute;
  inset: 0;
  z-index: 2;
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
