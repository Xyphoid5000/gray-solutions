<script setup lang="ts">
/**
 * Book.vue — a reusable 3D book.
 * Renders a true 3D book (spine, front/back covers, page edges) that sits
 * on the shelf spine-out and pulls out, turns, and floats when tapped.
 * When pulled out, drag to spin it like the manuscript.
 *
 * Props: title, color, synopsis (back-cover text), dimensions.
 */
import { ref, computed } from 'vue';
import { useBonusStore } from '../stores/bonus';

const props = defineProps<{
  title: string;
  color: string;
  synopsis?: string;
  width?: number;   // spine thickness in px
  height?: number;  // book height in px
  interactive?: boolean;
  pulled?: boolean;
  mark?: string;      // front-cover mark (e.g. "G.")
  tagline?: string;   // front-cover tagline
  author?: string;    // front-cover author
  showBonusToggle?: boolean;  // back cover shows bonus toggle instead of synopsis
}>();

const emit = defineEmits<{
  (e: 'toggle'): void;
}>();

const bonus = useBonusStore();

/* Drag-to-spin when pulled, like the manuscript. */
const dragRotY = ref(0);
const dragRotX = ref(0);
const dragging = ref(false);
let dragPointerId: number | null = null;
let dragStartX = 0;
let dragStartY = 0;
let dragLastX = 0;
let dragLastY = 0;
let dragMoved = false;

const innerTransform = computed(() => {
  if (!props.pulled) return '';
  return `translateY(-70px) translateZ(180px) rotateY(${-68 + dragRotY.value}deg) rotateX(${dragRotX.value}deg) scale(1.15)`;
});

function onPointerDown(e: PointerEvent) {
  if (!props.interactive) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  dragPointerId = e.pointerId;
  dragStartX = dragLastX = e.clientX;
  dragStartY = dragLastY = e.clientY;
  dragMoved = false;
  dragging.value = false;
}

function onPointerMove(e: PointerEvent) {
  if (e.pointerId !== dragPointerId) return;
  // Spinning only applies once the book is pulled out.
  if (!props.pulled) {
    if (Math.abs(e.clientX - dragStartX) + Math.abs(e.clientY - dragStartY) > 10) {
      dragMoved = true;
    }
    return;
  }
  const dx = e.clientX - dragLastX;
  const dy = e.clientY - dragLastY;
  dragLastX = e.clientX;
  dragLastY = e.clientY;
  if (Math.abs(e.clientX - dragStartX) + Math.abs(e.clientY - dragStartY) > 10) {
    dragMoved = true;
    dragging.value = true;
  }
  if (dragMoved) {
    dragRotY.value += dx * 0.5;
    dragRotX.value = Math.max(-30, Math.min(30, dragRotX.value + dy * 0.3));
  }
}

function onPointerUp(e: PointerEvent) {
  if (e.pointerId !== dragPointerId) return;
  dragPointerId = null;
  dragging.value = false;
  // If it was a tap (not a drag), toggle. Drags leave the book where
  // the user left it, like the manuscript.
  if (!dragMoved && props.interactive) {
    emit('toggle');
  }
}

function onClick(e: Event) {
  // Click is handled by pointerup (to distinguish drag from tap).
  e.preventDefault();
}
</script>

<template>
  <button
    type="button"
    class="book3d"
    :class="{ 'is-interactive': interactive, 'is-pulled': pulled, 'is-dragging': dragging }"
    :style="{
      '--bw': (width ?? 46) + 'px',
      '--bh': (height ?? 220) + 'px',
      '--bc': color,
    }"
    :aria-label="title"
    @click="onClick"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <span
      class="book3d-inner"
      aria-hidden="true"
      :style="pulled ? { transform: innerTransform } : {}"
    >
      <!-- Spine: what you see on the shelf. -->
      <span class="book3d-spine">
        <span class="book3d-spine-label">{{ title }}</span>
      </span>
      <!-- Front cover. -->
      <span class="book3d-front">
        <span v-if="mark" class="book3d-front-mark">{{ mark }}</span>
        <span class="book3d-front-title">{{ title }}</span>
        <span v-if="tagline" class="book3d-front-tag">{{ tagline }}</span>
        <span v-if="author" class="book3d-front-author">{{ author }}</span>
      </span>
      <!-- Back cover: synopsis, or bonus toggle for Gray Solutions. -->
      <span class="book3d-back">
        <span v-if="showBonusToggle" class="book3d-bonus">
          <span class="book3d-bonus-label">Bonus content</span>
          <button
            type="button"
            class="book3d-bonus-switch"
            :class="{ 'is-on': bonus.enabled }"
            :aria-pressed="bonus.enabled"
            aria-label="Toggle bonus content"
            @click.stop="bonus.enabled = !bonus.enabled"
            @pointerdown.stop
          >
            <span class="book3d-bonus-knob"></span>
          </button>
        </span>
        <span v-else class="book3d-back-text">{{ synopsis }}</span>
      </span>
      <!-- Page edges. -->
      <span class="book3d-pages"></span>
      <span class="book3d-top"></span>
    </span>
  </button>
</template>

<style scoped>
.book3d {
  --bw: 46px;   /* spine thickness */
  --bh: 220px;  /* book height */
  --bd: 150px;  /* book depth (cover width) */
  --bc: #333;   /* cover color */
  position: relative;
  width: var(--bw);
  height: var(--bh);
  padding: 0;
  border: 0;
  background: none;
  perspective: 900px;
  cursor: default;
  /* Horizontal drags spin the book; vertical drags scroll the page. */
  touch-action: pan-y;
}
.book3d.is-interactive {
  cursor: pointer;
}
/* Pulled out: break out of the shelf row, center, and come forward. */
.book3d.is-pulled {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 10;
}
/* The 3D book itself. */
.book3d-inner {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}
/* While dragging, the transform is driven by the pointer — no transition. */
.book3d.is-dragging .book3d-inner {
  transition: none;
}
/* Pulled out: transform is set inline (drag-to-spin). Base pose is
   translateY(-70px) translateZ(180px) rotateY(-68deg) scale(1.15). */
/* All faces. */
.book3d-spine,
.book3d-front,
.book3d-back,
.book3d-pages,
.book3d-top {
  position: absolute;
  backface-visibility: hidden;
  box-sizing: border-box;
}
/* Spine: faces the viewer on the shelf. */
.book3d-spine {
  inset: 0;
  transform: translateZ(calc(var(--bd) / 2));
  background: linear-gradient(90deg, rgba(0,0,0,0.35), rgba(255,255,255,0.08) 20%, rgba(0,0,0,0.35)), var(--bc);
  border: 1px solid rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.book3d-spine-label {
  writing-mode: vertical-rl;
  font-family: var(--serif);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: rgba(232, 205, 150, 0.9);
  text-transform: uppercase;
  white-space: nowrap;
  max-height: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Front cover: to the right of the spine. */
.book3d-front {
  width: var(--bd);
  height: var(--bh);
  left: 50%;
  margin-left: calc(var(--bd) / -2);
  transform: rotateY(90deg) translateZ(calc(var(--bw) / 2));
  background: linear-gradient(145deg, rgba(0,0,0,0.25), rgba(0,0,0,0.45)), var(--bc);
  border: 1px solid rgba(232, 205, 150, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.2rem;
  text-align: center;
}
.book3d-front-mark {
  font-family: var(--serif);
  font-size: 2.2rem;
  font-weight: 700;
  color: rgba(232, 205, 150, 0.95);
  line-height: 1;
}
.book3d-front-title {
  font-family: var(--serif);
  font-size: 1.3rem;
  font-weight: 600;
  color: rgba(232, 205, 150, 0.95);
  line-height: 1.3;
}
.book3d-front-tag {
  font-family: var(--serif);
  font-style: italic;
  font-size: 0.85rem;
  color: rgba(232, 205, 150, 0.7);
  line-height: 1.4;
}
.book3d-front-author {
  font-family: var(--serif);
  font-size: 0.8rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(232, 205, 150, 0.6);
}
/* Back cover: to the left of the spine. */
.book3d-back {
  width: var(--bd);
  height: var(--bh);
  left: 50%;
  margin-left: calc(var(--bd) / -2);
  transform: rotateY(-90deg) translateZ(calc(var(--bw) / 2));
  background: linear-gradient(145deg, rgba(0,0,0,0.35), rgba(0,0,0,0.55)), var(--bc);
  border: 1px solid rgba(232, 205, 150, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.2rem;
  text-align: center;
}
.book3d-back-text {
  font-family: var(--serif);
  font-style: italic;
  font-size: 0.9rem;
  color: rgba(232, 205, 150, 0.85);
  line-height: 1.5;
}
/* Bonus toggle on the Gray Solutions back cover. */
.book3d-bonus {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}
.book3d-bonus-label {
  font-family: var(--serif);
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(232, 205, 150, 0.85);
}
.book3d-bonus-switch {
  width: 56px;
  height: 30px;
  border-radius: 15px;
  border: 1px solid rgba(232, 205, 150, 0.4);
  background: rgba(0, 0, 0, 0.5);
  position: relative;
  cursor: pointer;
  padding: 0;
  transition: background 0.25s ease;
}
.book3d-bonus-switch.is-on {
  background: rgba(47, 107, 255, 0.6);
}
.book3d-bonus-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(232, 205, 150, 0.9);
  transition: transform 0.25s ease;
}
.book3d-bonus-switch.is-on .book3d-bonus-knob {
  transform: translateX(26px);
}
/* Page block: the fore-edge (opposite the spine). */
.book3d-pages {
  width: var(--bw);
  height: var(--bh);
  left: 0;
  top: 0;
  transform: rotateY(180deg) translateZ(calc(var(--bd) / 2));
  background: repeating-linear-gradient(
    90deg,
    #e8dcc0 0px,
    #e8dcc0 2px,
    #d4c4a0 3px
  );
  border: 1px solid rgba(0, 0, 0, 0.3);
}
/* Top edge. */
.book3d-top {
  width: var(--bw);
  height: var(--bd);
  left: 0;
  top: 50%;
  margin-top: calc(var(--bd) / -2);
  transform: rotateX(90deg) translateZ(calc(var(--bh) / 2));
  background: #e8dcc0;
  border: 1px solid rgba(0, 0, 0, 0.3);
}
/* Gentle float when pulled. */
.book3d.is-pulled .book3d-inner {
  animation: book-float 3.2s ease-in-out infinite 0.9s;
}
@keyframes book-float {
  0%, 100% { margin-top: 0; }
  50% { margin-top: -14px; }
}
</style>
