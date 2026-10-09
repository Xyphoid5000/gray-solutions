import { computed, onUnmounted, ref } from 'vue';

/** A live clock that ticks every 10 seconds. The timer runs until the
    component using it unmounts. */
export function useNow() {
  const now = ref(new Date());
  const timer = window.setInterval(() => {
    now.value = new Date();
  }, 10000);
  onUnmounted(() => clearInterval(timer));

  const time = computed(() =>
    now.value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
  return { now, time };
}
