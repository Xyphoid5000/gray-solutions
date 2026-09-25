<script setup lang="ts">
/**
 * The lost page: a manuscript sheet that only surfaces under blacklight.
 * The visible text is dim nonsense; the real message is written in
 * UV ink — invisible until the candle goes out.
 */
defineProps<{
  visible: boolean;
}>();

const NONSENSE = [
  'the margin notes ate the index and the index forgave them,',
  'a paperclip dreamed of being a staple and woke up tired,',
  'chapter twelve is hiding in the gutter between pages nine and ten,',
  'the ink ran out halfway through a very important —',
  'do not fold, spindle, or interrogate this paragraph,',
  'the footnotes filed a complaint with the header and won,',
  'somewhere a semicolon is holding this whole sentence together;',
  'the draft you are looking for was never written, only intended,',
];
</script>

<template>
  <Transition name="lost-page">
    <aside
      v-if="visible"
      class="lost-page"
      aria-label="A lost manuscript page"
    >
      <div class="lost-sheet">
        <p class="lost-kicker">recovered from the desk drawer</p>
        <div class="lost-nonsense" aria-hidden="true">
          <p v-for="(line, i) in NONSENSE" :key="i">{{ line }}</p>
        </div>
        <p class="lost-secret">
          Ah — you found my lost page. I love tucking little extras into
          corners for people who poke around. I do the same for my
          clients&rsquo; sites, by the way.
        </p>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.lost-page {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  pointer-events: none;
}
.lost-sheet {
  position: relative;
  width: min(420px, 92vw);
  max-height: 80svh;
  overflow: hidden;
  background: #0d0a18;
  border: 1px solid rgba(150, 110, 255, 0.25);
  box-shadow:
    0 0 60px rgba(120, 80, 255, 0.18),
    0 18px 50px rgba(0, 0, 0, 0.6);
  padding: 2rem 1.8rem;
  transform: rotate(-1.5deg);
  display: grid;
  grid-template-rows: auto 1fr;
}
.lost-kicker {
  grid-row: 1;
  font-size: 0.7rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(170, 140, 255, 0.4);
  margin: 0 0 1.2rem;
}
.lost-nonsense,
.lost-secret {
  grid-row: 2;
  grid-column: 1;
}
.lost-nonsense {
  align-self: start;
}
.lost-nonsense p {
  font-family: var(--serif);
  font-size: 0.95rem;
  line-height: 1.7;
  color: rgba(160, 150, 200, 0.28);
  margin: 0 0 0.4rem;
}
.lost-secret {
  align-self: center;
  margin: 0;
  padding: 1.2rem;
  background: rgba(13, 10, 24, 0.72);
  border: 1px solid rgba(150, 110, 255, 0.35);
  font-family: var(--serif);
  font-size: 1.15rem;
  line-height: 1.65;
  text-align: center;
  color: #e2ccff;
  text-shadow:
    0 0 12px rgba(170, 110, 255, 0.9),
    0 0 34px rgba(140, 90, 255, 0.6);
  box-shadow: 0 0 44px rgba(130, 90, 255, 0.28);
}
.lost-page-enter-active,
.lost-page-leave-active {
  transition: opacity 0.6s ease;
}
.lost-page-enter-from,
.lost-page-leave-to {
  opacity: 0;
}
</style>
