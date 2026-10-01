import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/**
 * Device capabilities: touchscreen or not, small screen or big screen.
 *
 * The foundation for touch-vs-desktop behavior splits (scroll animations,
 * scroll ability, etc.). Additive only — nothing reads this store yet, so
 * mobile behavior is unchanged until components opt in.
 *
 * Note: touchscreen laptops (Surface, etc.) report touch points, so they
 * read as touch even with a mouse attached. That's the honest signal for
 * "this device has a touchscreen".
 */
export const useDeviceStore = defineStore('device', () => {
  /** True when the device has a touch-capable input. */
  const isTouch = ref(false);
  /** True when the viewport is at or below the mobile CSS breakpoint. */
  const isSmallScreen = ref(false);
  /** Convenience inverse of isSmallScreen. */
  const isBigScreen = computed(() => !isSmallScreen.value);
  /** Classic desktop setup: big screen, no touch. */
  const isDesktop = computed(() => !isTouch.value && isBigScreen.value);

  const coarseQuery = window.matchMedia('(pointer: coarse)');
  const widthQuery = window.matchMedia('(max-width: 640px)');

  function update() {
    isTouch.value = coarseQuery.matches || navigator.maxTouchPoints > 0;
    isSmallScreen.value = widthQuery.matches;
  }

  // Evaluate once now; the listeners keep it live across resizes,
  // orientation changes, and devtools device-mode toggles.
  update();
  coarseQuery.addEventListener('change', update);
  widthQuery.addEventListener('change', update);

  return { isTouch, isSmallScreen, isBigScreen, isDesktop };
});
