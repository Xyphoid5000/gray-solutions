import { ref } from 'vue';

/** Persistent high score per game, stored in localStorage. */
export function useHighScore(gameId: string) {
  const key = `gs-highscore-${gameId}`;
  const high = ref(0);
  try {
    high.value = parseInt(localStorage.getItem(key) || '0', 10) || 0;
  } catch {
    // storage unavailable — play on without persistence
  }

  /** Save score if it's a new best. Returns true when beaten. */
  function maybeSave(score: number): boolean {
    if (score > high.value) {
      high.value = score;
      try {
        localStorage.setItem(key, String(score));
      } catch {
        // ignore
      }
      return true;
    }
    return false;
  }

  return { high, maybeSave };
}
