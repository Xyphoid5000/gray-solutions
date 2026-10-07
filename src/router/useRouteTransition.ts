import { computed, ref } from 'vue';
import { START_LOCATION, useRoute, useRouter } from 'vue-router';
import { motionReduced } from '../utils/a11y';
import { contactSubmitted } from '../lib/contact';

/** Locks/unlocks page scroll (used during transitions and overlays). */
export function noScroll(on: boolean) {
  document.documentElement.classList.toggle('gs-no-scroll', on);
}

/** Route transition + navigation helpers for the manuscript site.
    The manuscript experience owns `/`; sub-pages (/contact, /about,
    /projects, …) render in the RouterView instead. */
export function useRouteTransition() {
  const router = useRouter();
  const route = useRoute();
  const isHome = computed(() => route.path === '/');

  /** A "contact me" road: the form while it exists, the socials (on the
      About page) once it's been submitted and retired. */
  function goContactRoad() {
    if (contactSubmitted.value) {
      router.push({ path: '/about', hash: '#socials' });
      return;
    }
    if (route.path !== '/contact') router.push('/contact');
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Route transition: a sheet of manuscript paper lays down in 3D and
      types out the incoming route's name as a chapter title; the route
      swaps underneath the sheet, which then lifts off on the new page.
      Skipped on first load and on same-page hash scrolls. */
  const routeTransition = ref({
    active: false,
    lifting: false,
    typed: '',
    done: false,
    letter: '',
    kicker: '',
  });
  let transitionGen = 0;
  const wait = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));
  /** Set before a navigation that should skip the paper transition (the
      binding cinematic hands off to contact with its own ending). */
  let skipTransitionOnce = false;
  function skipTransition() {
    skipTransitionOnce = true;
  }

  /** Chapter pages get their chapter number as the lead character; other
      routes get their initial. */
  function routeTitle(name: unknown): { label: string; letter: string } {
    switch (name) {
      case 'contact': return { label: 'Contact', letter: 'C' };
      case 'about': return { label: 'About', letter: 'A' };
      case 'projects': return { label: 'The Proof', letter: '3' };
      case 'premise': return { label: 'The Premise', letter: '1' };
      case 'craft': return { label: 'The Craft', letter: '2' };
      case 'arc': return { label: 'The Arc', letter: '4' };
      case 'pricing': return { label: 'Pricing', letter: '$' };
      default: return { label: 'Home', letter: 'H' };
    }
  }

  router.beforeEach(async (to, from) => {
    if (skipTransitionOnce) {
      skipTransitionOnce = false;
      return true;
    }
    if (from === START_LOCATION || to.path === from.path) return true;
    const gen = ++transitionGen;
    const calm = motionReduced();
    const { label, letter } = routeTitle(to.name);
    noScroll(true);
    routeTransition.value = {
      active: true,
      lifting: false,
      typed: '',
      done: false,
      letter,
      kicker: 'Turning the page',
    };
    // Let the sheet lay down before the first keystroke.
    await wait(calm ? 60 : 700);
    if (calm) {
      routeTransition.value.typed = label;
    } else {
      // Finale-style typewriter: character by character, breath on spaces.
      for (const ch of label) {
        if (gen !== transitionGen) return true; // superseded — let it go
        routeTransition.value.typed += ch;
        await wait((ch === ' ' ? 65 : 40) + Math.random() * 28);
      }
    }
    if (gen !== transitionGen) return true;
    routeTransition.value.done = true;
    // The sheet is down and the name is typed — let the route change
    // underneath it. The lift-off happens in afterEach, on the new page.
    return true;
  });
  router.afterEach(async () => {
    const gen = transitionGen;
    const calm = motionReduced();
    // A beat on the new page beneath the sheet, then lift it off.
    await wait(calm ? 60 : 400);
    if (gen !== transitionGen) return;
    routeTransition.value.lifting = true;
    await wait(calm ? 60 : 620);
    if (gen !== transitionGen) return;
    routeTransition.value.active = false;
    noScroll(false);
  });

  return { isHome, routeTransition, goContactRoad, skipTransition };
}
