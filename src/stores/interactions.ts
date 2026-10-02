import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Bonus content interactions: the match hand, the match guy gag,
 * light rituals, and related toy state. Separate from the bonus
 * on/off + LED/candle basics in the bonus store.
 */
export const useInteractionsStore = defineStore('interactions', () => {
  /** Light rituals: pitch-black beat, match hand, breeze. */
  const pitchBlack = ref(false);
  /** The match guy's doorway: a door-shaped hole through the
      pitch-black overlay, revealing the lit page beneath. */
  const doorOpen = ref(false);
  const matchMounted = ref(false);
  const matchAtWick = ref(false);
  const matchXY = ref({ x: 60, y: 400 });
  const ritualRunning = ref(false);

  /** The match guy gag. */
  const gagRunning = ref(false);
  const guyMounted = ref(false);
  const guyX = ref(-160);
  const guyMode = ref<'flashlight' | 'match' | 'carry' | 'empty'>('flashlight');
  const guyFacing = ref<1 | -1>(1);
  const guyLine = ref<string | null>(null);
  /** The guy is exiting through the invisible doorway (large screens):
      he keeps walking while fading out. */
  const guyFading = ref(false);

  function setRitual(running: boolean) {
    ritualRunning.value = running;
  }

  function setMatch(mounted: boolean, atWick = false) {
    matchMounted.value = mounted;
    matchAtWick.value = atWick;
  }

  function setGag(running: boolean) {
    gagRunning.value = running;
  }

  return {
    pitchBlack,
    doorOpen,
    matchMounted,
    matchAtWick,
    matchXY,
    ritualRunning,
    gagRunning,
    guyMounted,
    guyX,
    guyMode,
    guyFacing,
    guyLine,
    guyFading,
    setRitual,
    setMatch,
    setGag,
  };
});
