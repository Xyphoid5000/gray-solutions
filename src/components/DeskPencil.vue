<script setup lang="ts">
/** A pencil on the desk — the writer's tool, next to the manuscript. */
</script>

<template>
  <div class="desk-pencil" aria-hidden="true">
    <svg viewBox="0 0 120 16" aria-hidden="true">
      <!-- body -->
      <rect x="18" y="3" width="84" height="10" rx="2" class="p-body" />
      <!-- paint stripes -->
      <rect x="18" y="5" width="84" height="2" class="p-stripe" />
      <rect x="18" y="9" width="84" height="2" class="p-stripe" />
      <!-- ferrule -->
      <rect x="8" y="3" width="10" height="10" class="p-ferrule" />
      <!-- eraser -->
      <rect x="0" y="4" width="8" height="8" rx="2" class="p-eraser" />
      <!-- wood -->
      <polygon points="102,3 118,8 102,13" class="p-wood" />
      <!-- lead -->
      <polygon points="112,6.5 118,8 112,9.5" class="p-lead" />
    </svg>
  </div>
</template>

<style scoped>
.desk-pencil {
  position: absolute;
  /* On the desk, right of the page. Anchored to the desk itself so it
     can never drift off it. */
  z-index: 840;
  width: 150px;
  pointer-events: none;
  opacity: 0.9;
  transform:
    translate(var(--pencil-dx, 0px), var(--pencil-dy, 0px))
    rotate(calc(-14deg + var(--pencil-rot, 0deg)));
  transition:
    transform 0.6s ease,
    opacity 0.4s ease,
    visibility 0.4s;
  /* Desktop: on the desk, right of the page, below the candle. */
  right: 56px;
  top: 58svh;
}
.desk-pencil svg {
  width: 100%;
  display: block;
  overflow: visible;
  filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.25));
}
.p-body {
  fill: #d9a441;
}
.p-stripe {
  fill: #b9832f;
  opacity: 0.6;
}
.p-ferrule {
  fill: #9aa0a8;
}
.p-eraser {
  fill: #d98a94;
}
.p-wood {
  fill: #e3c49a;
}
.p-lead {
  fill: #3a3a3a;
}
@media (max-width: 640px) {
  .desk-pencil {
    width: 110px;
    right: 36px;
    top: 80svh;
    bottom: auto;
    transform:
      translate(var(--pencil-dx, 0px), var(--pencil-dy, 0px))
      rotate(calc(-18deg + var(--pencil-rot, 0deg)));
  }
}
</style>
