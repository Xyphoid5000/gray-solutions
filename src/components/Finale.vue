<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { manuscriptBound } from '../lib/manuscript';

const props = defineProps<{ active?: boolean }>();

const emit = defineEmits<{
  about: [];
  contact: [];
}>();

const LINKS = [
  {
    label: 'GitHub',
    href: 'https://github.com/Xyphoid5000',
    external: true,
  },
  {
    label: 'Email',
    href: 'mailto:c90gray@gmail.com?subject=Let%27s%20write%20my%20story',
    external: false,
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/chris-gray-b0b50b1b4',
    external: true,
  },
];

/**
 * The whole page is the manuscript being finished live — every line
 * types out in sequence with one traveling cursor, no separations.
 */
const KICKER = 'About the author';
const TITLE = "Hi, I'm Chris and I write stories.";
const SUB = "Let's start creating yours.";
const BODY =
  "Got a business with a story worth telling? Tell me where you are and where you want to be — we'll write the next chapter together.";

const kickerText = ref('');
const titleText = ref('');
const subText = ref('');
const bodyText = ref('');
/** Which block the cursor sits in: 0 kicker, 1 title, 2 sub, 3 body. */
const activeField = ref(0);
const typingDone = ref(false);
let typeTimer: number | null = null;

/** Show the finished page whole — used in the bound book, where the
    story is already written, and for reduced motion. */
function showFullText() {
  kickerText.value = KICKER;
  titleText.value = TITLE;
  subText.value = SUB;
  bodyText.value = BODY;
  activeField.value = -1;
  typingDone.value = true;
}

/** The manuscript being finished live — types out only while the book
    is still a manuscript. In the bound book the page just sits there,
    already written. */
function startTyping() {
  if (typeTimer) window.clearTimeout(typeTimer);
  typeTimer = null;
  kickerText.value = '';
  titleText.value = '';
  subText.value = '';
  bodyText.value = '';
  activeField.value = 0;
  typingDone.value = false;
  if (manuscriptBound.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    showFullText();
    return;
  }
  const steps = [
    { set: (c: string) => (kickerText.value += c), text: KICKER },
    { set: (c: string) => (titleText.value += c), text: TITLE },
    { set: (c: string) => (subText.value += c), text: SUB },
    { set: (c: string) => (bodyText.value += c), text: BODY },
  ];
  let si = 0;
  let ci = 0;
  const type = () => {
    if (si >= steps.length) {
      typingDone.value = true;
      return;
    }
    const step = steps[si];
    if (ci < step.text.length) {
      const ch = step.text[ci];
      step.set(ch);
      ci++;
      // Slightly longer pause on punctuation / spaces.
      const delay = ch === ',' || ch === '.' ? 200 : ch === ' ' ? 65 : 40;
      typeTimer = window.setTimeout(type, delay + Math.random() * 28);
    } else {
      // Next block — a breath between lines.
      si++;
      ci = 0;
      activeField.value = si;
      typeTimer = window.setTimeout(type, 340);
    }
  };
  // Let the page settle before the first keystroke.
  typeTimer = window.setTimeout(type, 600);
}

// The page only types when it becomes the open page — never while it
// sits buried in the stack, and never in the bound book.
watch(
  () => props.active,
  (isActive) => {
    if (isActive) startTyping();
    else if (typeTimer) {
      window.clearTimeout(typeTimer);
      typeTimer = null;
    }
  },
);

onMounted(() => {
  if (props.active) startTyping();
});

onUnmounted(() => {
  if (typeTimer) window.clearTimeout(typeTimer);
});
</script>

<template>
  <section
    class="prologue finale"
    :class="{ 'typing-done': typingDone }"
    aria-label="About the author"
  >
    <div class="wrap">
      <p class="kicker">
        <span class="k-num">&#10022;</span>
        <span class="typed-text">{{ kickerText }}</span
        ><span
          v-if="active && activeField === 0 && !typingDone"
          class="type-cursor"
          aria-hidden="true"
        ></span>
      </p>
      <h2 class="h-display">
        <span class="typed-text">{{ titleText }}</span
        ><span
          v-if="active && activeField === 1 && !typingDone"
          class="type-cursor"
          aria-hidden="true"
        ></span>
      </h2>
      <p class="ui-late">
        <button class="link-more" @click="emit('about')">
          More about me <span class="arrow" aria-hidden="true">&rarr;</span>
        </button>
      </p>
      <div class="fin">
        <h3>
          <span class="typed-text">{{ subText }}</span
          ><span
            v-if="active && activeField === 2 && !typingDone"
            class="type-cursor"
            aria-hidden="true"
          ></span>
        </h3>
        <p>
          <span class="typed-text">{{ bodyText }}</span
          ><span
            v-if="active && activeField === 3"
            class="type-cursor"
            :class="{ done: typingDone }"
            aria-hidden="true"
          ></span>
        </p>
        <div class="fin-actions ui-late">
          <button class="btn btn-solid" @click="emit('contact')">
            Start your story <span class="arrow" aria-hidden="true">&rarr;</span>
          </button>
          <nav class="fin-links" aria-label="Elsewhere">
            <a
              v-for="l in LINKS"
              :key="l.label"
              :href="l.href"
              :target="l.external ? '_blank' : undefined"
              :rel="l.external ? 'noopener' : undefined"
              >{{ l.label }}</a
            >
          </nav>
        </div>
      </div>
    </div>
  </section>
</template>
