<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { gsap } from 'gsap';
import { chapters } from '../router';
import { startScroll, stopScroll } from '../lib/scroll';

const router = useRouter();
const open = ref(false);
let overlay: HTMLElement | null = null;
let items: NodeListOf<HTMLElement> | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) close();
}

function show() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
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
    { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.05, delay: 0.25 },
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

function go(path: string) {
  // Let the curtain close and scrolling resume before the page turns,
  // so the new page lands at its top.
  close();
  closeTimer = setTimeout(() => router.push(path), 600);
}

defineExpose({ show, close, isOpen: () => open.value });

onMounted(() => {
  overlay = document.querySelector<HTMLElement>('.chapters-overlay');
  items = overlay?.querySelectorAll<HTMLElement>('.chapter-item') ?? null;
  window.addEventListener('keydown', onKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  if (closeTimer) clearTimeout(closeTimer);
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
        <p class="chapters-kicker">Table of contents</p>
        <nav aria-label="Chapters">
          <a
            v-for="ch in chapters"
            :key="ch.path"
            class="chapter-item"
            :href="'#' + ch.path"
            @click.prevent="go(ch.path)"
          >
            <span class="chapter-num" aria-hidden="true">{{ ch.num }}</span>
            <span class="chapter-text">
              <span class="chapter-title">{{ ch.label }}</span>
              <span class="chapter-sub">{{ ch.logline }}</span>
            </span>
            <span class="chapter-go" aria-hidden="true">&rarr;</span>
          </a>
        </nav>
        <a href="#/epilogue" class="btn btn-solid chapters-cta" @click.prevent="go('/epilogue')">
          Start a project <span class="arrow" aria-hidden="true">&rarr;</span>
        </a>
        <p class="chapters-foot">Pick a chapter. The story will take you there.</p>
      </div>
    </div>
  </Teleport>
</template>
