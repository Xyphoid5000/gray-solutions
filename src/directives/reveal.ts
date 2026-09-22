import type { Directive } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * v-reveal — restrained scroll-in animation.
 * Adds .reveal (opacity 0, translated down); when the element enters the
 * viewport, GSAP eases it to visible once. Optional binding value = delay
 * in seconds for staggering. Reduced-motion users see content immediately.
 */
export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.classList.add('reveal');
    if (reducedMotion()) {
      el.classList.add('reveal-visible');
      return;
    }
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      delay: binding.value ?? 0,
      scrollTrigger: { trigger: el, start: 'top 87%', once: true },
      onComplete: () => {
        gsap.set(el, { clearProps: 'opacity,transform' });
        el.classList.add('reveal-visible');
      },
    });
  },
};
