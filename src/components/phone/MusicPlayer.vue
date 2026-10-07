<script setup lang="ts">
/** Graydio on the desk phone: Chris's SoundCloud tracks, site-wide. */
import { useMusicStore } from '../../stores/music';

const emit = defineEmits<{ back: [] }>();
const music = useMusicStore();
</script>

<template>
  <div class="graydio">
    <div class="graydio-head">
      <button type="button" class="graydio-back" @click="emit('back')" aria-label="Back">‹</button>
      <span>Graydio</span>
    </div>

    <div class="now-playing">
      <div class="np-disc" :class="{ spinning: music.isPlaying }" aria-hidden="true">💿</div>
      <p class="np-title">{{ music.currentTrack().title }}</p>
      <p class="np-artist">Xyphoid</p>
    </div>

    <div class="controls">
      <button type="button" class="ctrl" @click="music.prev()" aria-label="Previous">⏮</button>
      <button type="button" class="ctrl ctrl-play" @click="music.toggle()" :aria-label="music.isPlaying ? 'Pause' : 'Play'">
        {{ music.isPlaying ? '⏸' : '▶' }}
      </button>
      <button type="button" class="ctrl" @click="music.next()" aria-label="Next">⏭</button>
    </div>

    <div class="track-list">
      <button
        v-for="(t, i) in music.tracks"
        :key="t.url"
        type="button"
        class="track-row"
        :class="{ active: i === music.currentIndex }"
        @click="music.playIndex(i)"
      >
        <span class="track-num">{{ i + 1 }}</span>
        <span class="track-title">{{ t.title }}</span>
        <span v-if="i === music.currentIndex && music.isPlaying" class="eq" aria-hidden="true">♫</span>
      </button>
    </div>

    <p class="graydio-note">Plays throughout the site — close the phone, it keeps going.</p>
  </div>
</template>

<style scoped>
.graydio {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.graydio-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(128, 128, 128, 0.25);
}
.graydio-back {
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  color: inherit;
  padding: 0.2rem 0.5rem;
}
.now-playing {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.2rem 1rem 0.8rem;
  gap: 0.2rem;
}
.np-disc {
  font-size: 3rem;
  line-height: 1;
}
.np-disc.spinning {
  animation: spin 3s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.np-title {
  font-weight: 600;
  margin: 0.4rem 0 0;
  text-align: center;
}
.np-artist {
  opacity: 0.6;
  font-size: 0.85rem;
  margin: 0;
}
.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.2rem;
  padding: 0.6rem;
}
.ctrl {
  background: none;
  border: none;
  font-size: 1.6rem;
  cursor: pointer;
  color: inherit;
  padding: 0.4rem;
}
.ctrl-play {
  font-size: 2.2rem;
}
.track-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.4rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.track-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.7rem;
  border-radius: 0.5rem;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;
}
.track-row.active {
  background: rgba(128, 128, 128, 0.15);
  font-weight: 600;
}
.track-num {
  opacity: 0.5;
  font-size: 0.8rem;
  width: 1.2rem;
}
.track-title {
  flex: 1;
}
.eq {
  color: #2ecc71;
}
.graydio-note {
  text-align: center;
  font-size: 0.7rem;
  opacity: 0.5;
  padding: 0.5rem;
  margin: 0;
}
</style>
