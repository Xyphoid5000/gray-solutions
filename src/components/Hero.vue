<script setup lang="ts">
const emit = defineEmits<{ replay: [] }>();
</script>

<template>
  <section id="top" class="hero">
    <div class="hero-glow" aria-hidden="true"></div>
    <div class="container hero-inner">
      <div v-reveal class="hero-logo">
        <img src="/logo-lockup.jpg" alt="Gray Solutions" class="hero-mark" />
      </div>
      <p v-reveal="0.2" class="hero-copy">
        Every good story needs great structure. Something that generates
        smiles. Something that solves problems. Something that stands apart.
        That&rsquo;s Gray Solutions. I build software and digital experiences
        that turn ideas into something real.
      </p>
      <div v-reveal="0.3" class="hero-actions">
        <a href="#contact" class="btn btn-primary">
          Start your story
          <span aria-hidden="true">&rarr;</span>
        </a>
        <a href="#work" class="btn btn-ghost">See the work</a>
      </div>
      <button v-reveal="0.4" type="button" class="hero-replay" @click="emit('replay')">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
        Replay the intro
      </button>
    </div>
    <a href="#about" class="hero-scroll" aria-label="Scroll to about">
      <span></span>
    </a>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 7rem 0 4rem;
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 60% 40% at 50% 0%, rgba(47, 155, 255, 0.09), transparent 70%),
    radial-gradient(ellipse 45% 35% at 50% 100%, rgba(47, 155, 255, 0.05), transparent 70%);
}

.hero-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-logo {
  margin-bottom: 1.6rem;
}

.hero-mark {
  width: clamp(240px, 34vw, 340px);
  height: auto;
  border-radius: 1.25rem;
  filter: drop-shadow(0 18px 50px rgba(47, 155, 255, 0.18));
}

.hero-copy {
  max-width: 42rem;
  font-size: clamp(1.02rem, 2.2vw, 1.22rem);
  margin: 1.8rem 0 2.4rem;
  color: var(--silver-dim);
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.hero-replay {
  margin-top: 2.6rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: var(--silver-dim);
  font-family: var(--font-display);
  font-size: 0.82rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  opacity: 0.65;
  transition: opacity 0.2s ease, color 0.2s ease;
}

.hero-replay:hover {
  opacity: 1;
  color: var(--blue);
}

.hero-scroll {
  position: absolute;
  bottom: 1.6rem;
  left: 50%;
  transform: translateX(-50%);
  width: 26px;
  height: 42px;
  border: 1.5px solid rgba(199, 204, 212, 0.3);
  border-radius: 999px;
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.hero-scroll span {
  width: 4px;
  height: 8px;
  border-radius: 4px;
  background: var(--blue);
  animation: scroll-dot 1.8s ease-in-out infinite;
}

@keyframes scroll-dot {
  0%, 100% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(10px); opacity: 0.25; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-scroll span {
    animation: none;
  }
}
</style>
