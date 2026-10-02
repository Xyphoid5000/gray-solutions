import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

/**
 * Bonus settings app (desk phone): playful site-wide overrides.
 * Everything here is client-side cosmetic — nothing touches the
 * backend or compromises the site. Session-scoped like the rest
 * of the bonus state; a refresh restores the storybook defaults.
 */
export const useSettingsStore = defineStore('settings', () => {
  /** Site name — prominent brand spots read this instead of the literal. */
  const siteName = ref('Gray Solutions');
  /** Visual theme. Storybook is the default; the others are remixes. */
  const theme = ref<'storybook' | 'midnight' | 'terminal'>('storybook');
  /** Light/dark override. Auto leaves the room lighting in charge. */
  const mode = ref<'auto' | 'light' | 'dark'>('auto');
  /** Accent color — drives --ember across the site. */
  const accent = ref('#d08a4e');
  /** Mirror the whole site horizontally. Beautifully unreadable. */
  const mirror = ref(false);
  /** Kill every stylesheet: raw unstyled HTML. */
  const noCss = ref(false);
  /** Bookshelf renders as a sandwich; each book is a topping. */
  const sandwich = ref(false);

  function setSiteName(v: string) {
    const clean = v.trim().slice(0, 40);
    siteName.value = clean || 'Gray Solutions';
  }
  function setTheme(v: 'storybook' | 'midnight' | 'terminal') {
    theme.value = v;
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
  function toggleNoCss() {
    setNoCss(!noCss.value);
  }
  function toggleSandwich() {
    sandwich.value = !sandwich.value;
  }
  function resetAll() {
    siteName.value = 'Gray Solutions';
    theme.value = 'storybook';
    mode.value = 'auto';
    accent.value = '#d08a4e';
    mirror.value = false;
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

  // Root-level effects. Mirror + theme ride as attributes so plain
  // CSS can do the work; accent is a variable swap.
  watch(theme, (t) => {
    document.documentElement.dataset.storytheme = t;
  }, { immediate: true });
  watch(mirror, (m) => {
    document.documentElement.dataset.mirror = m ? 'on' : 'off';
  }, { immediate: true });
  watch(accent, (c) => {
    document.documentElement.style.setProperty('--ember', c);
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
    siteName, theme, mode, accent, mirror, noCss, sandwich,
    setSiteName, setTheme, setMode, setAccent,
    toggleMirror, toggleNoCss, toggleSandwich, resetAll,
  };
});
