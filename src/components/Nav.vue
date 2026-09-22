<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import LogoMark from './LogoMark.vue';
import Wordmark from './Wordmark.vue';

const scrolled = ref(false);
const menuOpen = ref(false);

const links = [
  { label: 'Work', href: '#work' },
  { label: 'Services', href: '#services' },
  { label: 'Process', href: '#process' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

const onScroll = () => {
  scrolled.value = window.scrollY > 24;
};

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
});
</script>

<template>
  <header class="nav" :class="{ 'nav-scrolled': scrolled }">
    <div class="container nav-inner">
      <a href="#top" class="nav-brand" aria-label="Gray Solutions home">
        <LogoMark class="nav-mark" />
        <Wordmark size="md" />
      </a>

      <nav class="nav-links" aria-label="Primary">
        <a v-for="l in links" :key="l.href" :href="l.href">{{ l.label }}</a>
      </nav>

      <a href="#contact" class="btn btn-primary nav-cta">Start your story</a>

      <button
        class="nav-toggle"
        type="button"
        :aria-expanded="menuOpen"
        aria-label="Toggle menu"
        @click="menuOpen = !menuOpen"
      >
        <span></span><span></span><span></span>
      </button>
    </div>

    <nav v-if="menuOpen" class="nav-mobile" aria-label="Mobile">
      <a v-for="l in links" :key="l.href" :href="l.href" @click="menuOpen = false">
        {{ l.label }}
      </a>
      <a href="#contact" class="btn btn-primary" @click="menuOpen = false">Start your story</a>
    </nav>
  </header>
</template>

<style scoped>
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  transition: background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease;
  border-bottom: 1px solid transparent;
}

.nav-scrolled {
  background: rgba(10, 13, 18, 0.78);
  backdrop-filter: blur(14px);
  border-bottom-color: var(--line);
}

.nav-inner {
  display: flex;
  align-items: center;
  gap: 2rem;
  height: 4.5rem;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-right: auto;
}

.nav-brand:hover {
  text-decoration: none;
}

.nav-mark {
  width: 2.4rem;
  height: 2.4rem;
}

.nav-links {
  display: flex;
  gap: 1.8rem;
}

.nav-links a {
  color: var(--silver-dim);
  font-size: 0.92rem;
  font-weight: 500;
  transition: color 0.2s ease;
}

.nav-links a:hover {
  color: #fff;
  text-decoration: none;
}

.nav-cta {
  padding: 0.6rem 1.3rem;
  font-size: 0.88rem;
}

.nav-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
}

.nav-toggle span {
  width: 22px;
  height: 2px;
  background: var(--silver);
  border-radius: 2px;
}

.nav-mobile {
  display: none;
}

@media (max-width: 860px) {
  .nav-links,
  .nav-cta {
    display: none;
  }

  .nav-toggle {
    display: flex;
  }

  .nav-mobile {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 1rem 4vw 1.4rem;
    background: rgba(10, 13, 18, 0.96);
    border-bottom: 1px solid var(--line);
  }

  .nav-mobile a:not(.btn) {
    color: var(--silver);
    font-family: var(--font-display);
    font-size: 1.05rem;
    padding: 0.55rem 0;
  }

  .nav-mobile .btn {
    margin-top: 0.6rem;
    justify-content: center;
  }
}
</style>
