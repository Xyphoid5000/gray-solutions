import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Bonus content: the on/off toggle plus the LED strip and candle state.
 * The candle, LEDs, phone, and related toys only exist when bonus is on.
 */
export const useBonusStore = defineStore('bonus', () => {
  /** Bonus content master switch. Defaults off. */
  const enabled = ref(false);

  /** LED strip state. */
  const ledOn = ref(false);
  /** Accent mode: LEDs on as a hint of color while the main light is still up. */
  const ledAccent = ref(false);
  /** Current LED color — blue is Chris's. Drives the wash via --led. */
  const ledColor = ref('#2f6bff');

  /** The desk candle: lit only when nothing else is. Persists on the desk. */
  const candleLit = ref(false);
  const candleSmoking = ref(false);
  /** Breeze gust sweeping the desk (pages flutter, candle blows out). */
  const breezeOn = ref(false);
  /** How many times the candle has been blown out. */
  const blowoutCount = ref(0);
  /** True after the match guy quits and takes the candle. */
  const candleGone = ref(false);

  /** Light sources driving the room. Starts with just the main light. */
  const lightSources = ref<string[]>(['main']);

  /** Desk phone: once the PIN is entered it stays unlocked, and the
      held phone UI can be opened from anywhere (desk or corner button). */
  const phoneUnlocked = ref(false);
  const phoneHeld = ref(false);

  function setEnabled(v: boolean) {
    enabled.value = v;
  }

  function setLed(on: boolean, color?: string) {
    ledOn.value = on;
    if (color) ledColor.value = color;
  }

  function setLedColor(color: string) {
    ledColor.value = color;
  }

  function setCandle(lit: boolean, smoking = false) {
    candleLit.value = lit;
    candleSmoking.value = smoking;
  }

  function incrementBlowout() {
    blowoutCount.value++;
  }

  return {
    enabled,
    ledOn,
    ledAccent,
    ledColor,
    candleLit,
    candleSmoking,
    breezeOn,
    blowoutCount,
    candleGone,
    lightSources,
    phoneUnlocked,
    phoneHeld,
    setEnabled,
    setLed,
    setLedColor,
    setCandle,
    incrementBlowout,
  };
});
