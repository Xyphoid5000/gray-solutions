<script setup lang="ts">
import { ref } from 'vue';
import { gsap } from 'gsap';

const emit = defineEmits<{
  done: [];
}>();

const overlay = ref<HTMLElement | null>(null);
const stack = ref<HTMLElement | null>(null);
const coverEl = ref<HTMLElement | null>(null);
const handL = ref<HTMLElement | null>(null);
const handR = ref<HTMLElement | null>(null);
const titleTyped = ref('');
const TITLE = 'Gray Solutions';

/**
 * The binding: hands gather the manuscript into a neat stack,
 * bind it, and write the title. Then we're done.
 */
async function start() {
  const ov = overlay.value;
  if (!ov) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    .matches;
  if (reduced) {
    emit('done');
    return;
  }

  gsap.set(ov, { display: 'block', opacity: 0 });
  gsap.to(ov, { opacity: 1, duration: 0.5 });

  // Gather: pile pages fly to a neat centered stack.
  const pilePages = [
    ...document.querySelectorAll('.read-pile .pile-page'),
  ] as HTMLElement[];
  const st = stack.value!;
  // Move pile pages into the stack (they're already paper).
  pilePages.forEach((p) => {
    st.appendChild(p);
    gsap.set(p, { position: 'absolute', inset: '0' });
  });
  // Add a few blank pages for the current (Finale) page.
  for (let i = 0; i < 3; i++) {
    const blank = document.createElement('div');
    blank.className = 'bind-page';
    st.appendChild(blank);
  }

  const pages = [...st.children] as HTMLElement[];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  // Each page flies from its pile spot to the centered stack.
  pages.forEach((p, i) => {
    const r = p.getBoundingClientRect();
    const dx = cx - (r.left + r.width / 2);
    const dy = cy - (r.top + r.height / 2);
    gsap.fromTo(
      p,
      { x: 0, y: 0, rotation: gsap.getProperty(p, 'rotation') as number },
      {
        x: dx,
        y: dy,
        rotation: 0,
        duration: 1.1,
        ease: 'power2.inOut',
        delay: 0.3 + i * 0.07,
      },
    );
  });

  await gsap.to({}, { duration: 1.8 });

  // Hands slide in and press the stack.
  const hl = handL.value!;
  const hr = handR.value!;
  gsap.set([hl, hr], { opacity: 1 });
  await Promise.all([
    gsap
      .to(hl, { x: 0, duration: 0.7, ease: 'power3.out' })
      .then(),
    gsap
      .to(hr, { x: 0, duration: 0.7, ease: 'power3.out' })
      .then(),
  ]);
  // Press.
  await gsap.to(st, {
    scaleY: 0.92,
    duration: 0.35,
    ease: 'power2.inOut',
    yoyo: true,
    repeat: 1,
  });
  // Hands leave.
  await Promise.all([
    gsap.to(hl, { x: '-120vw', duration: 0.6, ease: 'power3.in' }).then(),
    gsap.to(hr, { x: '120vw', duration: 0.6, ease: 'power3.in' }).then(),
  ]);
  gsap.set([hl, hr], { opacity: 0 });

  // The cover binds around the stack.
  const cv = coverEl.value!;
  gsap.set(cv, { display: 'flex', opacity: 0, scale: 0.94 });
  await gsap.to(cv, {
    opacity: 1,
    scale: 1,
    duration: 0.9,
    ease: 'power2.out',
  });

  // The title gets written on.
  titleTyped.value = '';
  for (let i = 0; i < TITLE.length; i++) {
    titleTyped.value += TITLE[i];
    await gsap.to({}, { duration: TITLE[i] === ' ' ? 0.12 : 0.09 });
  }
  await gsap.to({}, { duration: 1.2 });

  // Done — fade out.
  await gsap.to(ov, { opacity: 0, duration: 0.6 });
  gsap.set(ov, { display: 'none' });
  // Clean up the moved pages.
  st.innerHTML = '';
  emit('done');
}

defineExpose({ start });
</script>

<template>
  <div ref="overlay" class="bind-overlay" aria-hidden="true">
    <!-- The neat stack forms here. -->
    <div ref="stack" class="bind-stack"></div>

    <!-- Hands: flat silhouettes, pressing the stack. -->
    <div ref="handL" class="bind-hand bind-hand-l">
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
    <div ref="handR" class="bind-hand bind-hand-r">
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
    <div ref="coverEl" class="bind-cover">
      <div class="bind-cover-inner">
        <p class="bind-title">{{ titleTyped }}<span class="type-cursor"></span></p>
        <p class="bind-sub">A Gray Solutions manuscript, bound</p>
      </div>
    </div>
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
.bind-sub {
  font-size: 0.8rem;
  color: rgba(235, 225, 210, 0.55);
  margin: 0;
}
</style>
