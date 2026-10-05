<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import ChapterHeading from './ChapterHeading.vue';

const props = defineProps<{ active?: boolean }>();

const emit = defineEmits<{
  (e: 'go', index: number): void;
}>();

/** Desktop pagination: one exhibit per view with prev/next stepping.
    Mobile keeps the swipe strip (its panels paginate as plain blocks). */
const panelIndex = ref(0);
const PANEL_COUNT = 3;
const PANEL_LETTERS = ['A', 'B', 'C'];
function prevPanel() {
  panelIndex.value = Math.max(0, panelIndex.value - 1);
}
function nextPanel() {
  panelIndex.value = Math.min(PANEL_COUNT - 1, panelIndex.value + 1);
}

/** Arrow keys step between exhibits — only while this chapter is the
    open book page. At the ends the keys fall through to the book's own
    page-turn handler (capture + no stopPropagation there). */
function onKey(e: KeyboardEvent) {
  if (!props.active) return;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const t = e.target as HTMLElement | null;
  if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (document.querySelector('.phone-modal, .draft-modal, .chapter-modal'))
    return;
  if (e.key === 'ArrowRight' && panelIndex.value < PANEL_COUNT - 1) {
    e.stopPropagation();
    nextPanel();
  } else if (e.key === 'ArrowLeft' && panelIndex.value > 0) {
    e.stopPropagation();
    prevPanel();
  }
}
onMounted(() => window.addEventListener('keydown', onKey, true));
onUnmounted(() => window.removeEventListener('keydown', onKey, true));
</script>

<template>
  <section id="proof" class="chapter" aria-label="Chapter 3 — The proof">
    <div class="wrap">
      <ChapterHeading
        index="03"
        kicker="Chapter Three &mdash; The Proof"
        title="Don&rsquo;t take my <em>word for it.</em>"
      />
      <p v-reveal class="lede" style="margin-bottom: 2.6rem">
        A portfolio is a story&rsquo;s evidence locker. Here&rsquo;s what
        happens when a business gets <em>a website with a plot.</em>
      </p>
      <div v-reveal class="proof-strip">
        <article class="proof-panel" :class="{ 'is-current': panelIndex === 0 }">
          <div>
            <span class="proof-index">Exhibit A</span>
            <h3>Burning River Auto Glass</h3>
            <p>
              A local auto glass company on a generic Squarespace template.
              I rebuilt it as a cinematic custom site &mdash; the same
              business, <em>an entirely different first impression.</em>
              Scroll-driven storytelling, built to make a cracked windshield
              feel like the start of an adventure.
            </p>
            <ul class="proof-tags">
              <li>Design</li>
              <li>Vue 3</li>
              <li>GSAP</li>
            </ul>
          </div>
        </article>
        <article class="proof-panel" :class="{ 'is-current': panelIndex === 1 }">
          <div>
            <span class="proof-index">Exhibit B</span>
            <h3>This very website</h3>
            <p>
              You&rsquo;re turning the pages of the portfolio itself &mdash;
              cover, chapters, page turns and all. No templates, no themes:
              <em>the medium is the pitch.</em>
            </p>
            <ul class="proof-tags">
              <li>Concept</li>
              <li>Vue 3</li>
              <li>TypeScript</li>
              <li>GSAP</li>
            </ul>
          </div>
        </article>
        <article class="proof-panel cta-panel" :class="{ 'is-current': panelIndex === 2 }">
          <div>
            <span class="proof-index">Exhibit C</span>
            <h3>Your business here.</h3>
            <p>
              Every portfolio needs a blank page. <em>This one&rsquo;s
              yours</em> &mdash; the before-and-after your competitors will
              wish they&rsquo;d done first.
            </p>
          </div>
          <button class="btn btn-solid" @click="emit('go', 4)">
            Claim the page <span class="arrow" aria-hidden="true">&rarr;</span>
          </button>
        </article>
        <nav class="proof-pager" aria-label="Project exhibits">
          <button
            type="button"
            class="proof-page-btn"
            :disabled="panelIndex === 0"
            @click="prevPanel"
            aria-label="Previous project"
          >
            &larr; Prev
          </button>
          <span class="proof-page-count" aria-live="polite">
            Exhibit {{ PANEL_LETTERS[panelIndex] }} &middot; {{ panelIndex + 1 }} of {{ PANEL_COUNT }}
          </span>
          <button
            type="button"
            class="proof-page-btn"
            :disabled="panelIndex === PANEL_COUNT - 1"
            @click="nextPanel"
            aria-label="Next project"
          >
            Next &rarr;
          </button>
        </nav>
      </div>
      <p class="proof-hint" aria-hidden="true">
        <span>Swipe</span><span>&rarr;</span>
      </p>
    </div>
  </section>
</template>
