<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { gsap } from 'gsap';
import PullCord from './PullCord.vue';

const props = defineProps<{ bonusContent?: boolean }>();

const emit = defineEmits<{
  contact: [];
  home: [];
}>();

/** The cord lives here but only while bonus content is on. It mounts
    tucked up out of sight; `dropCord` lets it fall from behind the
    header, and `retractCord` sends it back up before it unmounts. The
    drop plays on the wrapper so it never fights the cord's own sway. */
const cordWrap = ref<HTMLElement | null>(null);
let cordResting = false;
const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

watch(
  () => props.bonusContent,
  (on) => {
    if (!on) {
      cordResting = false;
      return;
    }
    nextTick(() => {
      const el = cordWrap.value;
      if (!el || cordResting) return;
      gsap.set(el, { y: -260, visibility: 'hidden' });
    });
  },
  { immediate: true },
);

/** Let the cord fall from behind the header, bounce, and settle. */
function dropCord() {
  const el = cordWrap.value;
  if (!el || cordResting) return;
  cordResting = true;
  if (reducedMotion()) {
    gsap.set(el, { y: 0, visibility: 'visible' });
    return;
  }
  gsap.set(el, { visibility: 'visible' });
  gsap.fromTo(
    el,
    { y: -260 },
    { y: 0, duration: 0.9, ease: 'bounce.out' },
  );
}

/** Slide the cord back up behind the header, then hand back control. */
function retractCord(done: () => void) {
  const el = cordWrap.value;
  if (!el || !cordResting) {
    done();
    return;
  }
  cordResting = false;
  if (reducedMotion()) {
    done();
    return;
  }
  gsap.to(el, {
    y: -260,
    duration: 0.45,
    ease: 'power2.in',
    onComplete: () => {
      gsap.set(el, { visibility: 'hidden' });
      done();
    },
  });
}

defineExpose({ dropCord, retractCord });
</script>

<template>
  <header class="site-nav site-nav-min">
    <div class="nav-inner">
      <a
        class="brand"
        href="#/"
        @click.prevent="emit('home')"
        aria-label="Gray Solutions — back to the cover"
      >
        <span class="brand-mark" aria-hidden="true">G.</span>
        <span>Gray Solutions<em>.</em></span>
      </a>
      <button class="nav-contact" @click="emit('contact')">
        Contact me
      </button>
    </div>
    <div v-if="bonusContent" ref="cordWrap" class="cord-drop-wrap">
      <PullCord />
    </div>
  </header>
</template>
