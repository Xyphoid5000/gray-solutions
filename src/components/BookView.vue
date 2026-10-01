<script setup lang="ts">
import { computed, ref, nextTick, onMounted, watch } from 'vue';
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { chapters } from '../lib/chapters';
import { manuscriptBound } from '../lib/manuscript';
import ChapterModal from './ChapterModal.vue';

gsap.registerPlugin(Flip);

const emit = defineEmits<{
  (e: 'back-to-cover'): void;
  (e: 'back-to-cover-section', section: 'about' | 'contact'): void;
  (e: 'finale-contact'): void;
}>();

/** The Finale binds the manuscript before the contact form. */
function onChapterContact(i: number) {
  if (i === chapters.length - 1) emit('finale-contact');
  else emit('back-to-cover-section', 'contact');
}

const currentIndex = ref(0);
/** Indices of chapters sitting in the left pile, in order. */
const pile = ref<number[]>([]);

/** Pagination: which screen-sized page of the current chapter is visible. */
const currentPage = ref(0);
const pageCount = ref(1);

const isFinale = computed(() => currentIndex.value === chapters.length - 1);
/** Nudge the pencil somewhere slightly different on each chapter, like
    someone set it down without thinking. */
const pencilVars = computed<Record<string, string>>(() => {
  const spots = [
    { x: 0, y: 0, r: 0 },
    { x: -22, y: 30, r: -9 },
    { x: 14, y: -24, r: 7 },
    { x: -12, y: 18, r: -6 },
    { x: 16, y: -10, r: 5 },
  ];
  const s = spots[currentIndex.value] ?? spots[0];
  return {
    '--pencil-dx': `${s.x}px`,
    '--pencil-dy': `${s.y}px`,
    '--pencil-rot': `${s.r}deg`,
  };
});

const pileSet = computed(() => new Set(pile.value));

function pageEl(i: number): HTMLElement | null {
  return document.querySelector(`.manuscript-desk [data-page-index="${i}"] .page-paper`);
}

function pileCardEl(i: number): HTMLElement | null {
  return document.querySelector(`.read-pile [data-pile-index="${i}"]`);
}

async function goTo(target: number) {
  if (target === currentIndex.value) return;
  pileOpen.value = false;
  target = Math.max(0, Math.min(chapters.length - 1, target));

  const distance = Math.abs(target - currentIndex.value);
  if (distance > 1) {
    // Multi-chapter jump: one transition, not one per chapter passed.
    // Update the pile state directly for all intermediate chapters.
    if (target > currentIndex.value) {
      for (let i = currentIndex.value; i < target; i++) {
        if (!pile.value.includes(i)) pile.value.push(i);
      }
    } else {
      pile.value = pile.value.filter((i) => i < target || i >= currentIndex.value);
    }
    currentIndex.value = target;
    await nextTick();
    // Single page-turn animation for the whole jump.
    await animatePageTurn();
    document.querySelector('.manuscript-desk')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (target > currentIndex.value) {
    // Forward: pages from current to target-1 get tossed to the pile.
    for (let i = currentIndex.value; i < target; i++) {
      await tossToPile(i);
    }
  } else {
    // Back: pages from target to current-1 come back from the pile.
    for (let i = currentIndex.value - 1; i >= target; i--) {
      await bringBack(i);
    }
  }
  currentIndex.value = target;
  // Let the new top page settle, then scroll it into view.
  await nextTick();
  document.querySelector('.manuscript-desk')?.scrollIntoView({ behavior: 'smooth' });
}

/** Single page-turn for multi-chapter jumps — one animation, not one per chapter. */
async function animatePageTurn(): Promise<void> {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  const paper = document.querySelector(
    `.manuscript-desk [data-page-index="${currentIndex.value}"] .page-paper`,
  ) as HTMLElement | null;
  if (!paper) return;
  await gsap.fromTo(
    paper,
    { opacity: 0, x: 40 },
    { opacity: 1, x: 0, duration: 0.35, ease: 'power2.out' },
  ).then();
}

async function tossToPile(i: number): Promise<void> {
  const paper = pageEl(i);
  const pileEl = document.querySelector('.read-pile') as HTMLElement | null;

  // If we can't animate (reduced motion, missing elements), just update the pile.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!paper || !pileEl || reduced) {
    pile.value.push(i);
    await nextTick();
    return;
  }

  // Capture positions before the DOM changes.
  const paperRect = paper.getBoundingClientRect();
  const pileRect = pileEl.getBoundingClientRect();

  // Clone the paper, pin it over the original.
  const clone = paper.cloneNode(true) as HTMLElement;
  clone.style.cssText = `
    position: fixed;
    left: ${paperRect.left}px;
    top: ${paperRect.top}px;
    width: ${paperRect.width}px;
    height: ${paperRect.height}px;
    margin: 0;
    z-index: 2000;
    pointer-events: none;
  `;
  document.body.appendChild(clone);

  // Update the pile (hides the original via is-piled, shows the card).
  pile.value.push(i);
  await nextTick();

  // Fly the clone to the pile with a toss rotation.
  const dx = pileRect.left + pileRect.width / 2 - (paperRect.left + paperRect.width / 2);
  const dy = pileRect.top + pileRect.height / 2 - (paperRect.top + paperRect.height / 2);
  const rot = (i % 2 === 0 ? 1 : -1) * 12;

  await gsap.to(clone, {
    x: dx,
    y: dy,
    rotation: rot,
    scale: 0.32,
    opacity: 0.9,
    duration: 0.7,
    ease: 'power2.inOut',
  }).then();

  clone.remove();
}

/** Toss the currently open page into the pile — the binding calls this
    first so the final page is really in the list, not a stand-in. */
async function tossCurrentToPile(): Promise<void> {
  if (!pile.value.includes(currentIndex.value)) {
    await tossToPile(currentIndex.value);
  }
}

defineExpose({ tossCurrentToPile });

async function bringBack(i: number): Promise<void> {
  const card = pileCardEl(i);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!card || reduced) {
    pile.value = pile.value.filter((x) => x !== i);
    await nextTick();
    // Re-paginate the restored chapter.
    await paginateCurrentChapter();
    return;
  }

  // Capture the card's position before removing it.
  const cardRect = card.getBoundingClientRect();

  // Remove from pile (card disappears, paper reappears via is-piled removal).
  pile.value = pile.value.filter((x) => x !== i);
  await nextTick();

  const paper = pageEl(i);
  if (!paper) {
    await paginateCurrentChapter();
    return;
  }

  const paperRect = paper.getBoundingClientRect();

  // Clone the card, fly it from pile to the paper's position.
  const clone = card.cloneNode(true) as HTMLElement;
  clone.style.cssText = `
    position: fixed;
    left: ${cardRect.left}px;
    top: ${cardRect.top}px;
    width: ${cardRect.width}px;
    height: ${cardRect.height}px;
    margin: 0;
    z-index: 2000;
    pointer-events: none;
  `;
  document.body.appendChild(clone);

  // Start the clone at the card's scale, animate to full paper size.
  const scaleX = paperRect.width / cardRect.width;
  const scaleY = paperRect.height / cardRect.height;

  gsap.set(clone, { transformOrigin: 'center center' });
  await gsap.to(clone, {
    x: paperRect.left - cardRect.left,
    y: paperRect.top - cardRect.top,
    scaleX,
    scaleY,
    rotation: 0,
    duration: 0.7,
    ease: 'power2.inOut',
  }).then();

  clone.remove();
  // Re-paginate the restored chapter.
  await paginateCurrentChapter();
}

/** Deterministic toss so each page lands the same way. */
function pileToss(index: number): { rotation: number; x: number; y: number } {
  const h1 = (index * 9301 + 49297) % 233280;
  const h2 = (index * 49297 + 9301) % 233280;
  const r1 = h1 / 233280;
  const r2 = h2 / 233280;
  return {
    rotation: (r1 - 0.5) * 16,
    x: (r2 - 0.5) * 28,
    y: (r1 - 0.5) * 20,
  };
}

/** Paginate the current chapter's content into screen-sized pages.
    Groups the .wrap's block children by measured height. Moves the actual
    elements (no clones) into .book-page divs. */
async function paginateCurrentChapter() {
  await nextTick();
  const paper = document.querySelector(
    `.manuscript-desk [data-page-index="${currentIndex.value}"] .page-paper`,
  ) as HTMLElement | null;
  if (!paper) return;

  // Clear any previous pagination.
  paper.querySelectorAll('.book-page').forEach((p) => {
    // Move children back to the wrap before removing the page div.
    const wrap = paper.querySelector(':scope > .chapter > .wrap') as HTMLElement | null;
    if (wrap) {
      Array.from(p.children).forEach((c) => wrap.appendChild(c));
    }
    p.remove();
  });

  const wrap = paper.querySelector(':scope > .chapter > .wrap') as HTMLElement | null;
  if (!wrap) return;

  const children = Array.from(wrap.children) as HTMLElement[];
  if (children.length === 0) return;

  // Available height: page min-height (62vh) minus padding, with a
  // conservative margin. Prefer more pages over cramming content.
  // If a single element exceeds this, it gets its own page (min-height grows).
  const available = window.innerHeight * 0.62 - 140;

  const pages: HTMLElement[][] = [];
  let current: HTMLElement[] = [];
  let height = 0;

  // Helper: push an element, starting a new page if it doesn't fit.
  function pushEl(el: HTMLElement, h: number) {
    if (current.length > 0 && height + h > available) {
      pages.push(current);
      current = [];
      height = 0;
    }
    current.push(el);
    height += h;
  }

  for (const child of children) {
    // On mobile, remove card grids entirely (e.g. .craft-grid) — the
    // chapter text is the content; cards don't fit the page format.
    const isMobile = window.innerWidth < 640;
    if (isMobile && child.querySelector('.craft-card, .service-card, .chapter-card')) {
      child.remove();
      continue;
    }
    const h = (child as HTMLElement).offsetHeight || 120;
    // If a single element is taller than a page, split its children
    // across pages — one per page if needed.
    if (h > available && child.children.length > 0) {
      // Flush current page first.
      if (current.length > 0) {
        pages.push(current);
        current = [];
        height = 0;
      }
      // Each grandchild gets its own page (or grouped if small).
      Array.from(child.children).forEach((grandchild) => {
        const gc = grandchild as HTMLElement;
        const gh = gc.offsetHeight || 120;
        // If the grid itself had styling, wrap the card to preserve it.
        pushEl(gc, gh);
      });
      // The empty grid container is discarded (cards are moved out).
      child.remove();
    } else {
      pushEl(child as HTMLElement, h);
    }
  }
  if (current.length > 0) pages.push(current);

  pageCount.value = pages.length;
  currentPage.value = 0;

  // Create page divs and move elements.
  pages.forEach((els, idx) => {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'book-page';
    pageDiv.dataset.page = String(idx);
    if (idx !== 0) pageDiv.style.display = 'none';
    els.forEach((el) => pageDiv.appendChild(el));
    paper.appendChild(pageDiv);
  });

  // Reveal all content immediately — no scroll triggers in paginated mode.
  // Kill orphaned ScrollTriggers (elements moved, triggers point at old positions).
  paper.querySelectorAll('.reveal').forEach((el) => {
    const ext = el as HTMLElement & { _revealST?: { kill(): void } };
    if (ext._revealST) {
      ext._revealST.kill();
      delete ext._revealST;
    }
    gsap.set(el, { clearProps: 'opacity,transform' });
    el.classList.add('reveal-visible');
  });
}

/** Show a specific page of the current chapter. */
function showPage(n: number) {
  const paper = document.querySelector(
    `.manuscript-desk [data-page-index="${currentIndex.value}"] .page-paper`,
  ) as HTMLElement | null;
  if (!paper) return;

  const pages = paper.querySelectorAll('.book-page');
  pages.forEach((p, idx) => {
    (p as HTMLElement).style.display = idx === n ? '' : 'none';
  });
  currentPage.value = n;
}

function next() {
  // If more pages in this chapter, turn the page. Otherwise, next chapter.
  if (currentPage.value < pageCount.value - 1) {
    const nextPage = currentPage.value + 1;
    // Animate the page turn.
    const paper = document.querySelector(
      `.manuscript-desk [data-page-index="${currentIndex.value}"] .page-paper`,
    ) as HTMLElement | null;
    if (paper) {
      const current = paper.querySelector(`.book-page[data-page="${currentPage.value}"]`) as HTMLElement | null;
      const next = paper.querySelector(`.book-page[data-page="${nextPage}"]`) as HTMLElement | null;
      if (current && next) {
        gsap.to(current, {
          x: '-30%',
          opacity: 0,
          duration: 0.35,
          ease: 'power2.in',
          onComplete: () => {
            showPage(nextPage);
            gsap.fromTo(
              next,
              { x: '30%', opacity: 0 },
              { x: '0%', opacity: 1, duration: 0.35, ease: 'power2.out' },
            );
          },
        });
        return;
      }
    }
    showPage(nextPage);
  } else {
    goTo(currentIndex.value + 1);
  }
}

function prev() {
  // If not on first page, go back a page. Otherwise, previous chapter.
  if (currentPage.value > 0) {
    const prevPage = currentPage.value - 1;
    const paper = document.querySelector(
      `.manuscript-desk [data-page-index="${currentIndex.value}"] .page-paper`,
    ) as HTMLElement | null;
    if (paper) {
      const current = paper.querySelector(`.book-page[data-page="${currentPage.value}"]`) as HTMLElement | null;
      const prevEl = paper.querySelector(`.book-page[data-page="${prevPage}"]`) as HTMLElement | null;
      if (current && prevEl) {
        gsap.to(current, {
          x: '30%',
          opacity: 0,
          duration: 0.35,
          ease: 'power2.in',
          onComplete: () => {
            showPage(prevPage);
            gsap.fromTo(
              prevEl,
              { x: '-30%', opacity: 0 },
              { x: '0%', opacity: 1, duration: 0.35, ease: 'power2.out' },
            );
          },
        });
        return;
      }
    }
    showPage(prevPage);
  } else {
    goTo(currentIndex.value - 1);
  }
}

/** Tabs: a tab to an unread chapter opens the chapter card first;
    heading back to a finished page jumps straight there — the pile
    already says where you're going. */
const modalIndex = ref<number | null>(null);

/** Re-paginate when the chapter changes. Reset to first page. */
watch(currentIndex, async () => {
  await nextTick();
  paginateCurrentChapter();
});

onMounted(async () => {
  // Wait for the chapter DOM to settle before measuring.
  await nextTick();
  paginateCurrentChapter();
  // Re-paginate once fonts load — first-load measurements can be wrong
  // if the serif hasn't rendered yet, causing cut-off pages.
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => paginateCurrentChapter());
  }
  // Safety: re-paginate after async content settles.
  setTimeout(() => paginateCurrentChapter(), 1000);
});

function onTabClick(i: number) {
  if (i === currentIndex.value) return;
  if (i > currentIndex.value) modalIndex.value = i;
  else goTo(i);
}
function goFromModal(i: number) {
  modalIndex.value = null;
  goTo(i);
}

function onKey(e: KeyboardEvent) {
  if (overlayOpen()) return;
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') prev();
}

/** An overlay (phone, first draft, chapter preview) is open over the
    pages — swipes and arrow keys must not turn pages (or trigger the
    binding) underneath it. The overlays only exist in the DOM while open. */
function overlayOpen(): boolean {
  return !!document.querySelector('.phone-modal, .draft-modal, .chapter-modal');
}

/** Direct navigation — tabs and scattered pages go straight there. */

/** The pile is a messy stack. Clicking it scatters its pages over the open page. */
const pileOpen = ref(false);
const SCATTER_ROTS = [-9, 7, -5, 8, -7, 5, -6, 9];
function scatterRot(pos: number): number {
  return SCATTER_ROTS[pos % SCATTER_ROTS.length];
}
function pileCenter(): { x: number; y: number } | null {
  const el = document.querySelector('.read-pile');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
function scatterCards(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.pile-scatter-card'));
}
const reduceMotion = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Pages fly out of the pile and land scattered over the open page. */
function scatterOut() {
  if (reduceMotion()) return;
  const c = pileCenter();
  scatterCards().forEach((card, idx) => {
    const r = card.getBoundingClientRect();
    const dx = c ? c.x - (r.left + r.width / 2) : 0;
    const dy = c ? c.y - (r.top + r.height / 2) : 0;
    const rot = SCATTER_ROTS[idx % SCATTER_ROTS.length];
    card.classList.add('flying');
    gsap.fromTo(
      card,
      { x: dx, y: dy, scale: 0.4, rotation: 0 },
      {
        x: 0,
        y: 0,
        scale: 1,
        rotation: rot,
        duration: 0.6,
        delay: idx * 0.08,
        ease: 'back.out(1.4)',
        onComplete: () => {
          card.classList.remove('flying');
          gsap.set(card, { clearProps: 'transform' });
        },
      }
    );
  });
}
/** Pages fly back into the pile. */
function scatterBack(): Promise<void> {
  const cards = scatterCards();
  const c = pileCenter();
  if (!cards.length || reduceMotion() || !c) {
    pileOpen.value = false;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let done = 0;
    cards.forEach((card, idx) => {
      const r = card.getBoundingClientRect();
      card.classList.add('flying');
      gsap.to(card, {
        x: c.x - (r.left + r.width / 2),
        y: c.y - (r.top + r.height / 2),
        scale: 0.4,
        rotation: 0,
        duration: 0.35,
        delay: idx * 0.05,
        ease: 'power2.in',
        onComplete: () => {
          if (++done === cards.length) {
            pileOpen.value = false;
            resolve();
          }
        },
      });
    });
  });
}
async function togglePile() {
  if (pileOpen.value) {
    await scatterBack();
  } else {
    pileOpen.value = true;
    await nextTick();
    scatterOut();
  }
}
function pickFromScatter(i: number) {
  pileOpen.value = false;
  goTo(i);
}
function pickCoverFromScatter() {
  pileOpen.value = false;
  emit('back-to-cover');
}

function pileCardStyle(i: number): Record<string, string> {
  const toss = pileToss(i);
  return {
    '--pile-rot': `${toss.rotation}deg`,
    '--pile-x': `${toss.x}px`,
    '--pile-y': `${toss.y}px`,
  };
}

/** Swipe to turn pages — but never hijack the proof strip's own scrolling. */
let touchX: number | null = null;
let touchOnStrip = false;
function onTouchStart(e: TouchEvent) {
  const t = e.target as HTMLElement | null;
  touchOnStrip = !!t?.closest('.proof-strip');
  touchX = e.touches[0].clientX;
}
function onTouchEnd(e: TouchEvent) {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  const onStrip = touchOnStrip;
  touchX = null;
  touchOnStrip = false;
  if (onStrip) return;
  if (overlayOpen()) return;
  if (Math.abs(dx) < 48) return;
  // Last page: swipe left (toward the next page) to bind the book.
  if (dx < 0 && currentIndex.value === chapters.length - 1) {
    onChapterContact(currentIndex.value);
    return;
  }
  if (dx < 0) next();
  else prev();
}

</script>

<template>
  <div
    class="manuscript-desk"
    :class="{ 'is-finale': isFinale }"
    :style="pencilVars"
    @keydown="onKey"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
    tabindex="0"
  >
    <!-- Desk props (candle, pencil) live on a zero-height sticky stage:
         planted on the visible desk while pages scroll, never on the
         page itself or the screen. App provides them. -->
    <div class="desk-stage">
      <slot name="desk-props" />
    </div>

    <!-- Left lane: the read pile, a messy stack. Click to scatter / restack. -->
    <div class="read-pile" aria-label="Finished pages" @click="togglePile">
      <!-- The cover: stamped MANUSCRIPT until bound, then the finished book. -->
      <button
        type="button"
        class="pile-page pile-cover"
        :class="{ 'is-bound': manuscriptBound }"
        :style="pileCardStyle(-1)"
        aria-label="Open finished pages"
        tabindex="-1"
      >
        <span v-if="!manuscriptBound" class="pile-stamp" aria-hidden="true">Manuscript</span>
        <span v-else class="pile-cover-title" aria-hidden="true">Gray<br />Solutions</span>
      </button>
      <button
        v-for="i in pile"
        :key="i"
        type="button"
        class="pile-page"
        :data-pile-index="i"
        :style="pileCardStyle(i)"
        :aria-label="`Open finished pages`"
        tabindex="-1"
      >
        <span class="pile-num" aria-hidden="true">{{ chapters[i].num }}</span>
        <span class="pile-tab-mark" aria-hidden="true">{{ chapters[i].num }}</span>
      </button>
    </div>

    <!-- Pile scatter: finished pages float over the open page. -->
    <div v-if="pileOpen" class="pile-scatter" aria-label="Finished pages">
      <div class="pile-scatter-grid">
        <button
          type="button"
          class="pile-scatter-card"
          :class="{ 'is-bound': manuscriptBound }"
          :style="{ '--sc-rot': scatterRot(pile.length) + 'deg', '--sc-delay': (pile.length * 0.7) + 's' }"
          :aria-label="manuscriptBound ? 'Back to the book cover' : 'Back to the manuscript cover'"
          @click="pickCoverFromScatter"
        >
          <span v-if="!manuscriptBound" class="pile-stamp" aria-hidden="true">Manuscript</span>
          <span v-else class="pile-cover-title" aria-hidden="true">Gray<br />Solutions</span>
          <span class="pile-grid-label" aria-hidden="true">{{ manuscriptBound ? 'Book cover' : 'Manuscript cover' }}</span>
        </button>
        <button
          v-for="(i, pos) in pile"
          :key="i"
          type="button"
          class="pile-scatter-card"
          :style="{ '--sc-rot': scatterRot(pos) + 'deg', '--sc-delay': (pos * 0.7) + 's' }"
          :aria-label="`Preview ${chapters[i].label}`"
          @click="pickFromScatter(i)"
        >
          <span class="pile-num" aria-hidden="true">{{ chapters[i].num }}</span>
          <span class="pile-grid-label" aria-hidden="true">{{ chapters[i].label }}</span>
          <span class="pile-tab-mark" aria-hidden="true">{{ chapters[i].num }}</span>
        </button>
      </div>
    </div>

    <!-- The stack: each page is a transparent wrap, paper inside with a
         right margin, tab attached in that margin. -->
    <div
      v-for="(ch, i) in chapters"
      :key="ch.num"
      class="page-wrap"
        :data-page-index="i"
        :class="{
          'is-current': i === currentIndex,
          'is-piled': pileSet.has(i),
          'is-buried': i > currentIndex,
        }"
      >
        <div class="page-paper" :inert="i !== currentIndex">
          <component
            :is="ch.component"
            :active="i === currentIndex"
            @go="goTo"
            @about="emit('back-to-cover-section', 'about')"
            @contact="onChapterContact(i)"
          />
        </div>
        <button
          type="button"
          class="page-tab"
          :class="{ active: i === currentIndex, 'is-piled': pileSet.has(i) }"
          :style="{ '--tab-row': i }"
          :aria-label="`Go to ${ch.label}`"
          :aria-current="i === currentIndex ? 'page' : undefined"
          @click="onTabClick(i)"
        >
          {{ ch.num }}
        </button>
        <!-- Page turn tap zones: only on the current chapter. -->
        <template v-if="i === currentIndex">
          <button
            type="button"
            class="page-tap page-tap-prev"
            aria-label="Previous page"
            @click="prev()"
          />
          <button
            type="button"
            class="page-tap page-tap-next"
            aria-label="Next page"
            @click="next()"
          />
        </template>
      </div>

    <!-- Chapter card: tabs to unread chapters preview here first. -->
    <ChapterModal
      v-if="modalIndex !== null"
      :chapter="chapters[modalIndex]"
      :current="modalIndex === currentIndex"
      @close="modalIndex = null"
      @go="goFromModal"
    />
  </div>
</template>
