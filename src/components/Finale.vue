<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { gsap } from 'gsap';

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

/** The manuscript is being finished right now — type it live. */
const typed = ref('');
const typingDone = ref(false);
const FULL_TEXT = "Hi, I'm Chris and I write stories.";
let typeTimer: number | null = null;
let ctx: gsap.Context | null = null;

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    typed.value = FULL_TEXT;
    typingDone.value = true;
    return;
  }
  // Typewriter: a character every ~45ms, with natural pauses.
  let i = 0;
  const type = () => {
    if (i < FULL_TEXT.length) {
      typed.value += FULL_TEXT[i];
      i++;
      // Slightly longer pause on punctuation / spaces.
      const ch = FULL_TEXT[i - 1];
      const delay = ch === ',' || ch === '.' ? 220 : ch === ' ' ? 70 : 42;
      typeTimer = window.setTimeout(type, delay + Math.random() * 30);
    } else {
      typingDone.value = true;
    }
  };
  // Let the page settle before the first keystroke.
  typeTimer = window.setTimeout(type, 600);

  ctx = gsap.context(() => {
    // The rest of the page fades in after the typing finishes.
    gsap.fromTo(
      '.finale .fin, .finale .link-more',
      { opacity: 0, y: 26 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        delay: 2.8,
        stagger: 0.15,
      },
    );
  }, document.querySelector('.prologue') as HTMLElement);
});

onUnmounted(() => {
  if (typeTimer) window.clearTimeout(typeTimer);
  ctx?.revert();
  ctx = null;
});
</script>

<template>
  <section class="prologue book-page finale" aria-label="About the author">
    <div class="wrap">
      <p class="kicker">
        <span class="k-num">&#10022;</span> About the author
      </p>
      <h2 class="h-display typewriter">
        <span class="typed-text">{{ typed }}</span
        ><span
          class="type-cursor"
          :class="{ done: typingDone }"
          aria-hidden="true"
        ></span>
      </h2>
      <p>
        <button class="link-more" @click="emit('about')">
          More about me <span class="arrow" aria-hidden="true">&rarr;</span>
        </button>
      </p>
      <div class="fin">
        <h3>Let&rsquo;s start creating yours.</h3>
        <p>
          Got a business with a story worth telling? Tell me where you are
          and where you want to be — we&rsquo;ll write the next chapter
          together.
        </p>
        <div class="fin-actions">
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
