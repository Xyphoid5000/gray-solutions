<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';
import { scrollToElement, startScroll, stopScroll } from '../lib/scroll';

const chapters = [
  { num: '\u2014', title: 'Prologue', sub: 'Every website is a story.', target: 'prologue' },
  { num: '01', title: 'The Premise', sub: 'Nobody remembers a brochure.', target: 'premise' },
  { num: '02', title: 'The Craft', sub: 'What I actually do.', target: 'craft' },
  { num: '03', title: 'The Proof', sub: "Don't take my word for it.", target: 'proof' },
  { num: '\u221E', title: 'Intermission', sub: 'Where the music swells.', target: 'intermission' },
  { num: '04', title: 'The Arc', sub: 'Every project follows the arc.', target: 'arc' },
  { num: '05', title: 'The Author', sub: "Hi, I'm Chris.", target: 'author' },
  { num: '\u00B6', title: 'Epilogue', sub: "Let's write yours.", target: 'epilogue' },
];

const open = ref(false);
let overlay: HTMLElement | null = null;
let items: NodeListOf<HTMLElement> | null = null;

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) close();
}

function show() {
  open.value = true;
  stopScroll();
  document.body.style.overflow = 'hidden';
  gsap.set(overlay, { visibility: 'visible' });
  gsap.fromTo(
    overlay,
    { clipPath: 'inset(0 0 100% 0)' },
    { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'power4.inOut' },
  );
  gsap.fromTo(
    items,
    { y: 44, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.06, delay: 0.25 },
  );
  gsap.fromTo(
    '.chapters-close',
    { opacity: 0, rotate: -90 },
    { opacity: 1, rotate: 0, duration: 0.6, ease: 'power3.out', delay: 0.35 },
  );
}

function close() {
  gsap.to(overlay, {
    clipPath: 'inset(0 0 100% 0)',
    duration: 0.55,
    ease: 'power4.inOut',
    onComplete: () => {
      gsap.set(overlay, { visibility: 'hidden' });
      open.value = false;
      document.body.style.overflow = '';
      startScroll();
    },
  });
}

function go(target: string) {
  const el = document.getElementById(target);
  gsap.to(overlay, {
    opacity: 0,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      gsap.set(overlay, { visibility: 'hidden', opacity: 1, clipPath: 'inset(0 0 100% 0)' });
      open.value = false;
      document.body.style.overflow = '';
      startScroll();
      if (el) scrollToElement(el);
    },
  });
}

defineExpose({ show, close, isOpen: () => open.value });

onMounted(() => {
  overlay = document.querySelector<HTMLElement>('.chapters-overlay');
  items = overlay?.querySelectorAll<HTMLElement>('.chapter-item') ?? null;
  window.addEventListener('keydown', onKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div
      class="chapters-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Chapters index"
    >
      <button class="chapters-close" @click="close()" aria-label="Close chapters">
        <span aria-hidden="true">&times;</span>
      </button>
      <div class="chapters-inner">
        <p class="chapters-kicker">Index of chapters</p>
        <nav aria-label="Chapters">
          <a
            v-for="ch in chapters"
            :key="ch.target"
            class="chapter-item"
            :href="'#' + ch.target"
            @click.prevent="go(ch.target)"
          >
            <span class="chapter-num" aria-hidden="true">{{ ch.num }}</span>
            <span class="chapter-text">
              <span class="chapter-title">{{ ch.title }}</span>
              <span class="chapter-sub">{{ ch.sub }}</span>
            </span>
            <span class="chapter-go" aria-hidden="true">&rarr;</span>
          </a>
        </nav>
        <p class="chapters-foot">Pick a chapter. The story will take you there.</p>
      </div>
    </div>
  </Teleport>
</template>
