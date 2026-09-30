<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { gsap } from 'gsap';
import Bookshelf from './Bookshelf.vue';
import BookView from './BookView.vue';
import DeskClutter from './DeskClutter.vue';
import DeskPencil from './DeskPencil.vue';
import DeskCandle from './DeskCandle.vue';
import DeskPhone from './DeskPhone.vue';
import FirstDraft from './FirstDraft.vue';
import RemoteControl from './RemoteControl.vue';

const emit = defineEmits(['done']);

withDefaults(
  defineProps<{
    bonusContent?: boolean;
  }>(),
  { bonusContent: false },
);

const roomRef = ref<HTMLElement | null>(null);
const pagesRef = ref<HTMLElement | null>(null);
const showBook = ref(false);

onMounted(() => {
  const room = roomRef.value;
  const pages = pagesRef.value;
  if (!room || !pages) {
    emit('done');
    return;
  }
  const vh = window.innerHeight;
  gsap.set(room, { y: 0 });
  gsap.set(pages.children, { y: -vh * 0.6, opacity: 0, rotation: 0 });

  const tl = gsap.timeline({
    onComplete: () => emit('done'),
  });
  // Pages fall through and off the bottom.
  tl.to(
    pages.children,
    {
      y: vh * 1.2,
      opacity: 1,
      rotation: () => gsap.utils.random(-8, 8),
      duration: 1.8,
      ease: 'power2.in',
      stagger: 0.12,
    },
    0.2,
  );
  tl.to(pages.children, { opacity: 0, duration: 0.4 }, 1.6);
  // BookView appears on the desk BEFORE the shift.
  tl.call(() => { showBook.value = true; }, [], 1.8);
  // The whole room shifts up: shelf exits top, desk (with BookView
  // already on it) rises into view.
  tl.to(room, { y: -vh, duration: 2.4, ease: 'power2.inOut' }, 2.0);
  tl.to({}, { duration: 0.5 });
});
</script>

<template>
  <div class="open-transition" aria-hidden="true">
    <div ref="roomRef" class="ot-room">
      <div class="ot-shelf">
        <Bookshelf backdrop />
      </div>
      <div class="ot-desk">
        <div v-if="showBook" class="ot-book">
          <BookView>
            <template #desk-props>
              <RemoteControl v-if="bonusContent" :led-on="false" color="#ff0000" />
              <DeskCandle v-if="bonusContent" :lit="true" :smoking="false" />
              <DeskPencil />
              <DeskClutter />
              <FirstDraft v-if="bonusContent" />
              <DeskPhone v-if="bonusContent" />
            </template>
          </BookView>
        </div>
      </div>
    </div>
    <div ref="pagesRef" class="ot-pages">
      <div class="ot-page"><span>Manuscript</span></div>
      <div class="ot-page"></div>
      <div class="ot-page"></div>
      <div class="ot-page"></div>
    </div>
  </div>
</template>

<style scoped>
.open-transition {
  position: fixed;
  inset: 0;
  z-index: 60;
  overflow: hidden;
  background: #0d0a06;
  pointer-events: none;
}
.ot-room {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 200vh;
  will-change: transform;
}
.ot-shelf,
.ot-desk {
  height: 100vh;
  position: relative;
  overflow: hidden;
}
.ot-shelf {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d0a06;
}
.ot-desk {
  background: #0d0a06;
}
.ot-book {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.ot-pages {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 5;
}
.ot-page {
  position: absolute;
  width: min(280px, 70vw);
  aspect-ratio: 8.5 / 11;
  background: var(--page, #f2ecdf);
  border: 1px solid rgba(120, 90, 60, 0.35);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
