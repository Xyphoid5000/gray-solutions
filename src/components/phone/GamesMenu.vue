<script setup lang="ts">
/** Games menu on the desk phone: pick one of the three bonus games. */
const emit = defineEmits<{
  play: [game: 'brick' | 'flappy' | 'invaders'];
  back: [];
}>();

const games = [
  { id: 'brick' as const, name: 'Brick Breaker', glyph: '▦' },
  { id: 'flappy' as const, name: 'Flappy Bird', glyph: '➶' },
  { id: 'invaders' as const, name: 'Space Invaders', glyph: '👾' },
];
</script>

<template>
  <div class="games-menu">
    <div class="games-head">
      <button type="button" class="games-back" @click="emit('back')" aria-label="Back">‹</button>
      <span>Games</span>
    </div>
    <div class="games-list">
      <button
        v-for="g in games"
        :key="g.id"
        type="button"
        class="game-row"
        @click="emit('play', g.id)"
      >
        <span class="game-glyph" aria-hidden="true">{{ g.glyph }}</span>
        <span class="game-name">{{ g.name }}</span>
        <span class="game-go" aria-hidden="true">›</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.games-menu {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.games-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(128, 128, 128, 0.25);
}
.games-back {
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: inherit;
  padding: 0.2rem 0.5rem;
}
.games-list {
  display: flex;
  flex-direction: column;
  padding: 0.8rem;
  gap: 0.6rem;
}
.game-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.9rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(128, 128, 128, 0.25);
  background: rgba(128, 128, 128, 0.08);
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
}
.game-row:active {
  transform: scale(0.98);
}
.game-glyph {
  font-size: 1.5rem;
  width: 2rem;
  text-align: center;
}
.game-name {
  flex: 1;
  font-weight: 500;
}
.game-go {
  font-size: 1.2rem;
  opacity: 0.5;
}
</style>
