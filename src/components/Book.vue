<script setup lang="ts">
/**
 * Book.vue — a reusable 3D book.
 * Renders a true 3D book (spine, front/back covers, page edges) that sits
 * on the shelf spine-out and pulls out, turns, and floats when tapped.
 *
 * Props: title, color, synopsis (back-cover text), dimensions.
 */
defineProps<{
  title: string;
  color: string;
  synopsis?: string;
  width?: number;   // spine thickness in px
  height?: number;  // book height in px
  interactive?: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle'): void;
}>();
</script>

<template>
  <button
    type="button"
    class="book3d"
    :class="{ 'is-interactive': interactive }"
    :style="{
      '--bw': (width ?? 46) + 'px',
      '--bh': (height ?? 220) + 'px',
      '--bc': color,
    }"
    :aria-label="title"
    @click="interactive && emit('toggle')"
  >
    <span class="book3d-inner" aria-hidden="true">
      <!-- Spine: what you see on the shelf. -->
      <span class="book3d-spine">
        <span class="book3d-spine-label">{{ title }}</span>
      </span>
      <!-- Front cover. -->
      <span class="book3d-front">
        <span class="book3d-front-title">{{ title }}</span>
      </span>
      <!-- Back cover with synopsis. -->
      <span class="book3d-back">
        <span class="book3d-back-text">{{ synopsis }}</span>
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
}
.book3d.is-interactive {
  cursor: pointer;
}
/* The 3D book itself. */
.book3d-inner {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}
/* Pulled out: lift, turn to show front cover, come toward viewer. */
.book3d.is-pulled .book3d-inner {
  transform: translateY(-70px) translateZ(180px) rotateY(-68deg) scale(1.15);
}
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
  align-items: center;
  justify-content: center;
  padding: 1.2rem;
  text-align: center;
}
.book3d-front-title {
  font-family: var(--serif);
  font-size: 1.3rem;
  font-weight: 600;
  color: rgba(232, 205, 150, 0.95);
  line-height: 1.3;
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
