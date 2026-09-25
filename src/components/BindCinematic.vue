<script setup lang="ts">
import { ref } from 'vue';
import { gsap } from 'gsap';

const emit = defineEmits<{
  done: [];
  /** Fired at full black so the home page can swap in the finished book. */
  blackout: [];
}>();

const overlay = ref<HTMLElement | null>(null);
const stack = ref<HTMLElement | null>(null);
const coverEl = ref<HTMLElement | null>(null);
const handL = ref<HTMLElement | null>(null);
const handR = ref<HTMLElement | null>(null);
const shelf = ref<HTMLElement | null>(null);
const slotEl = ref<HTMLElement | null>(null);
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
  if (shelf.value) gsap.set(shelf.value, { clearProps: 'all', opacity: 0 });
  if (veil.value) gsap.set(veil.value, { opacity: 0 });
  if (handL.value) gsap.set(handL.value, { clearProps: 'all', opacity: 0 });
  if (handR.value) gsap.set(handR.value, { clearProps: 'all', opacity: 0 });
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
  const hl = handL.value;
  const hr = handR.value;
  const sh = shelf.value;
  const sl = slotEl.value;
  const vl = veil.value;
  if (!ov || !st || !cv || !hl || !hr || !sh || !sl || !vl) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    .matches;
  if (reduced) {
    emit('done');
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = vw / 2;
  const cy = vh / 2;

  // The pile's screen spot — the stack starts life there.
  const pileRect = document
    .querySelector('.read-pile')
    ?.getBoundingClientRect();
  const pileCx = pileRect ? pileRect.left + pileRect.width / 2 : vw * 0.16;
  const pileCy = pileRect ? pileRect.top + pileRect.height / 2 : vh * 0.78;

  // Reset.
  gsap.set(ov, { display: 'block', opacity: 0 });
  gsap.set(cv, { display: 'none', opacity: 0, x: 0, y: 0, scale: 1, rotation: 0 });
  gsap.set(st, {
    display: 'block',
    opacity: 1,
    x: pileCx - cx,
    y: pileCy - cy,
    scaleY: 1,
  });
  gsap.set(sh, { opacity: 0, y: 0 });
  gsap.set(vl, { opacity: 0 });
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

  // Where the finished book lands on the shelf (measured while the
  // shelf is invisible but laid out; the cover itself is 260x340 and
  // lands centered, so its geometry is computed, not measured).
  const sr = sl.getBoundingClientRect();
  const slotDx = sr.left + sr.width / 2 - cx;
  const slotDy = sr.top + sr.height / 2 - cy;
  const slotScale = Math.min(0.8, (sr.height - 8) / 340);

  tl = gsap.timeline({ onComplete: finish });
  const T = tl as gsap.core.Timeline;

  // Beat 1 — the overlay rises; the final page drops into the pile,
  // leaving it 5-4-3-2-1 over the cover.
  T.to(ov, { opacity: 1, duration: 0.5 }, 0);
  const ch5 = chCards[4];
  T.fromTo(
    ch5,
    { y: -vh * 0.5, opacity: 0, rotation: -8 },
    { y: 0, opacity: 1, rotation: 0, duration: 0.7, ease: 'power2.in' },
    0.45,
  );
  allCards.forEach((c, k) => {
    if (c === ch5) return;
    T.fromTo(
      c,
      { rotation: k % 2 ? 5 : -5 },
      { rotation: 0, duration: 0.6, ease: 'power2.out' },
      0.35 + k * 0.05,
    );
  });
  const b1 = 1.35;

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

  // Beat 4 — the dark cover drops from above; the pages tuck inside.
  const dropAt = b3 + 0.15;
  T.set(
    cv,
    { display: 'flex', opacity: 1, x: 0, y: -(vh + 260), scale: 1, rotation: 0 },
    dropAt,
  );
  T.to(cv, { y: 0, duration: 1.05, ease: 'power2.out' }, dropAt);
  const tuckAt = dropAt + 1.05;
  chCards.forEach((c, k) => {
    T.to(
      c,
      { y: -34, scale: 0.84, opacity: 0, duration: 0.45, ease: 'power2.in' },
      tuckAt + k * 0.03,
    );
  });
  T.set(st, { display: 'none' }, tuckAt + 0.6);
  T.to(
    cv,
    { scaleY: 0.94, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.inOut' },
    tuckAt + 0.55,
  );
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

  // Beat 6 — the bookshelf rises; the finished book takes its slot
  // among the classics.
  T.fromTo(
    sh,
    { y: 46, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out' },
    b5,
  );
  const slotAt = b5 + 0.8;
  T.to(
    cv,
    {
      x: `+=${slotDx}`,
      y: `+=${slotDy}`,
      scale: slotScale,
      rotation: -4,
      duration: 1.15,
      ease: 'power2.inOut',
    },
    slotAt,
  );
  const b6 = slotAt + 1.15 + 0.7;

  // Beat 7 — fade to black; behind it the home page swaps in the
  // finished book; fade back in on it.
  T.to(vl, { opacity: 1, duration: 0.8, ease: 'power1.inOut' }, b6);
  T.call(() => emit('blackout'), [], b6 + 0.85);
  T.to(ov, { opacity: 0, duration: 1.0, ease: 'power1.inOut' }, b6 + 1.35);
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

    <!-- The bookshelf: classics on a plank; the book takes its slot. -->
    <div ref="shelf" class="bind-shelf" aria-hidden="true">
      <div class="shelf-row">
        <div class="shelf-book" style="height: 240px; background: #4a1f1f">Moby-Dick</div>
        <div class="shelf-book" style="height: 220px; background: #1f3a5a">Pride and Prejudice</div>
        <div class="shelf-book" style="height: 250px; background: #2e4a2e">Frankenstein</div>
        <div class="shelf-book" style="height: 230px; background: #5a3a1f">Jane Eyre</div>
        <div ref="slotEl" class="shelf-slot"></div>
        <div class="shelf-book" style="height: 245px; background: #3a1f3a">Dracula</div>
        <div class="shelf-book" style="height: 215px; background: #1f4a4a">Wuthering Heights</div>
        <div class="shelf-book" style="height: 235px; background: #4a4a1f">The Odyssey</div>
      </div>
      <div class="shelf-plank"></div>
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
  color: rgba(242, 236, 223, 0.25);
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
/* The bookshelf: classic spines on a wooden plank. */
.bind-shelf {
  position: absolute;
  left: 50%;
  bottom: 5vh;
  transform: translateX(-50%);
  width: max-content;
  max-width: 94vw;
  opacity: 0;
  z-index: 3;
}
.shelf-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 7px;
  padding: 0 8px;
}
.shelf-book {
  width: 52px;
  flex-shrink: 0;
  writing-mode: vertical-rl;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--serif);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  color: rgba(232, 205, 150, 0.92);
  border-radius: 3px 3px 0 0;
  padding: 14px 0;
  white-space: nowrap;
  overflow: hidden;
  box-shadow: inset -3px 0 6px rgba(0, 0, 0, 0.35);
}
.shelf-slot {
  width: 170px;
  height: 248px;
  flex-shrink: 0;
}
.shelf-plank {
  height: 16px;
  background: linear-gradient(180deg, #4a2c17 0%, #2e1a0d 60%, #1d1008 100%);
  border-radius: 3px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
}
@media (max-width: 640px) {
  /* The CSS `scale` property composes with GSAP's transform untouched. */
  .bind-shelf {
    scale: 0.62;
  }
}
/* Fade-to-black veil for the final beat. */
.bind-veil {
  position: absolute;
  inset: 0;
  background: #000;
  opacity: 0;
  pointer-events: none;
  z-index: 4;
}
</style>
