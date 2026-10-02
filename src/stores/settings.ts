import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

/**
 * Bonus settings app (desk phone): playful site-wide overrides.
 * Everything here is client-side cosmetic — nothing touches the
 * backend or compromises the site. Session-scoped like the rest
 * of the bonus state; a refresh restores the defaults.
 */
export const useSettingsStore = defineStore('settings', () => {
  /** Site name — prominent brand spots read this instead of the literal. */
  const siteName = ref('Gray Solutions');
  /** Page background color override — null means the theme decides. */
  const bgColor = ref<string | null>(null);
  /** Main text color override — null means the theme decides. */
  const textColor = ref<string | null>(null);
  /** Light/dark override. Auto leaves the room lighting in charge. */
  const mode = ref<'auto' | 'light' | 'dark'>('auto');
  /** Accent color override — null means the theme decides. */
  const accent = ref<string | null>(null);
  /** Mirror the whole site horizontally. Beautifully unreadable. */
  const mirror = ref(false);
  /** Invert every color on the site. */
  const invert = ref(false);
  /** Kill every stylesheet: raw unstyled HTML. */
  const noCss = ref(false);
  /** Bookshelf renders as a sandwich; each book is a topping. */
  const sandwich = ref(false)

  function setSiteName(v: string) {
    const clean = v.trim().slice(0, 40);
    siteName.value = clean || 'Gray Solutions';
  }
  /** The logo mark follows the site name's first letter. */
  const logoMark = computed(() => {
    const ch = siteName.value.trim().charAt(0);
    return (ch ? ch.toUpperCase() : 'G') + '.';
  });
  function setBgColor(v: string) {
    bgColor.value = v;
  }
  function setTextColor(v: string) {
    textColor.value = v;
  }
  function setMode(v: 'auto' | 'light' | 'dark') {
    mode.value = v;
  }
  function setAccent(v: string) {
    accent.value = v;
  }
  function toggleMirror() {
    mirror.value = !mirror.value;
  }
  function toggleInvert() {
    invert.value = !invert.value;
  }
  function toggleNoCss() {
    setNoCss(!noCss.value);
  }
  function toggleSandwich() {
    sandwich.value = !sandwich.value;
  }
  function resetAll() {
    siteName.value = 'Gray Solutions';
    bgColor.value = null;
    textColor.value = null;
    accent.value = null;
    mode.value = 'auto';
    mirror.value = false;
    invert.value = false;
    setNoCss(false);
    sandwich.value = false;
  }

  /** Disabling stylesheets directly — the toggle needs the real DOM. */
  function setNoCss(v: boolean) {
    noCss.value = v;
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        (sheet as CSSStyleSheet).disabled = v;
      } catch {
        /* cross-origin sheets ignore us; fine */
      }
    }
  }

  // Root-level effects. Mirror rides as an attribute so plain CSS can
  // do the work; colors are variable swaps.
  watch(bgColor, (c) => {
    if (c) document.documentElement.style.setProperty('--bg', c);
    else document.documentElement.style.removeProperty('--bg');
  }, { immediate: true });
  watch(textColor, (c) => {
    if (c) document.documentElement.style.setProperty('--ink', c);
    else document.documentElement.style.removeProperty('--ink');
  }, { immediate: true });
  watch(mirror, (m) => {
    document.documentElement.dataset.mirror = m ? 'on' : 'off';
  }, { immediate: true });
  watch(invert, (v) => {
    document.documentElement.dataset.invert = v ? 'on' : 'off';
  }, { immediate: true });
  watch(accent, (c) => {
    const root = document.documentElement;
    if (c) {
      root.style.setProperty('--ember', c);
      // Derive the deep/bright siblings from the new accent so every
      // ember-tinted surface tracks the picker. Percentages chosen so the
      // default accents reproduce the theme's hardcoded pairs approximately
      // (dark #d08a4e -> deep ~#9a663a / bright ~#d79c69;
      //  light #b06a2a -> deep ~#824e1f / bright ~#bc804a).
      root.style.setProperty('--ember-deep', `color-mix(in srgb, ${c} 74%, black)`);
      root.style.setProperty('--ember-bright', `color-mix(in srgb, ${c} 85%, white)`);
    } else {
      root.style.removeProperty('--ember');
      root.style.removeProperty('--ember-deep');
      root.style.removeProperty('--ember-bright');
    }
  }, { immediate: true });
  watch(siteName, (n) => {
    document.title = `${n} — Websites That Tell Stories`;
  }, { immediate: true });

  // Manual light/dark override. Auto leaves the room lighting in
  // charge; a manual pick applies immediately (and stays put — the
  // lighting rituals route through setThemePlain, which honors it).
  watch(mode, (m) => {
    if (m === 'auto') return;
    const root = document.documentElement;
    root.classList.add('theme-fade');
    root.dataset.theme = m;
    window.setTimeout(() => root.classList.remove('theme-fade'), 650);
  }, { immediate: true });

  return {
    siteName, logoMark, bgColor, textColor, mode, accent, mirror, invert, noCss, sandwich,
    setSiteName, setBgColor, setTextColor, setMode, setAccent,
    toggleMirror, toggleInvert, toggleNoCss, toggleSandwich, resetAll,
  };
});
