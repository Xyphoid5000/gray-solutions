<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
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

let ctx: gsap.Context | null = null;

onMounted(() => {
  ctx = gsap.context(() => {
    gsap.fromTo(
      '.prologue .h-line-inner',
      { yPercent: 115 },
      {
        yPercent: 0,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.1,
        delay: 0.15,
      },
    );
    gsap.utils.toArray<HTMLElement>('.finale [v-reveal], .finale .fin').forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        },
      );
    });
  }, document.querySelector('.prologue') as HTMLElement);
});

onUnmounted(() => {
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
      <h2 class="h-display">
        <span class="h-line"
          ><span class="h-line-inner"
            >Hi, I&rsquo;m Chris and I write stories.</span
          ></span
        >
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
