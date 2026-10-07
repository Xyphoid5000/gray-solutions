<script setup lang="ts">
/** Games menu on the desk phone: pick one of the four games. */
const emit = defineEmits<{
  play: [game: 'snake' | 'brick' | 'flappy' | 'invaders'];
  back: [];
}>();

const games = [
  { id: 'snake' as const, name: 'Snake', glyph: '🐍', tile: 'tile-snake' },
  { id: 'brick' as const, name: 'Brick Breaker', glyph: '🧱', tile: 'tile-brick' },
  { id: 'flappy' as const, name: 'Flappy Bird', glyph: '🐦', tile: 'tile-flappy' },
  { id: 'invaders' as const, name: 'Space Invaders', glyph: '👾', tile: 'tile-invaders' },
];
</script>

<template>
  <div class="games-menu">
    <div class="games-head">
      <button type="button" class="games-back" @click="emit('back')" aria-label="Back">‹</button>
      <span>Games</span>
    </div>
    <div class="games-grid">
      <button
        v-for="g in games"
        :key="g.id"
        type="button"
        class="game-icon"
        @click="emit('play', g.id)"
      >
        <span class="game-tile" :class="g.tile" aria-hidden="true">{{ g.glyph }}</span>
        {{ g.name }}
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
.games-grid {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 1.4rem;
  padding: 1rem;
}
.game-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  background: none;
  border: 0;
  color: #c6cdd9;
  font-size: 0.75rem;
  cursor: pointer;
  width: 4.5rem;
}
.game-icon:active {
  transform: scale(0.95);
}
.game-tile {
  width: 58px;
  height: 58px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}
.tile-snake {
  background: linear-gradient(135deg, #1d3a24, #2f6b3a);
}
.tile-brick {
  background: linear-gradient(135deg, #1a2a4a, #2f6b9e);
}
.tile-flappy {
  background: linear-gradient(135deg, #4a2e12, #c07d2b);
}
.tile-invaders {
  background: linear-gradient(135deg, #2a1a3a, #6b2f9e);
}
</style>
