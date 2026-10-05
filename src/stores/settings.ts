import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

/* ---- contrast helpers for derived muted colors ---- */
type RGB = [number, number, number];
function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function relLuminance([r, g, b]: RGB): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrastRatio(a: string, b: string): number {
  const l1 = relLuminance(hexToRgb(a));
  const l2 = relLuminance(hexToRgb(b));
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const m = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return '#' + m.map((v) => v.toString(16).padStart(2, '0')).join('');
}
/** Push `ink` toward `bg` as far as possible while keeping `target`
    contrast — the most-muted-but-still-readable mix. If even the full
    ink can't hit the target, returns ink unchanged. */
function fitForContrast(ink: string, bg: string, target: number): string {
  if (contrastRatio(ink, bg) < target) return ink;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(mixHex(ink, bg, mid), bg) >= target) lo = mid;
    else hi = mid;
  }
  return mixHex(ink, bg, lo);
}
/** Theme bg/ink when the pickers are untouched (null = theme decides). */
const THEME_COLORS = {
  light: { bg: '#faf6ec', ink: '#1a1510' },
  dark: { bg: '#0a0d16', ink: '#f2ecdf' },
} as const;

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

  /** True when any setting differs from its default — drives the
      floating settings shortcut on the main screen. */
  const isModified = computed(() =>
    siteName.value !== 'Gray Solutions' ||
    bgColor.value !== null ||
    textColor.value !== null ||
    mode.value !== 'auto' ||
    accent.value !== null ||
    mirror.value ||
    invert.value ||
    noCss.value ||
    sandwich.value,
  );

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
  /** Recompute the subdued vars from the effective bg/ink so muted text,
      placeholders and faint borders stay readable under picker colors.
      Both pickers null -> remove the overrides and let the theme decide
      (this also keeps Reset behavior intact). */
  function applyDerivedMuted() {
    const root = document.documentElement;
    if (!bgColor.value && !textColor.value) {
      for (const v of ['--muted', '--faint', '--line', '--line-soft']) root.style.removeProperty(v);
      return;
    }
    const theme = root.dataset.theme === 'light' ? 'light' : 'dark';
    const bg = bgColor.value ?? THEME_COLORS[theme].bg;
    const ink = textColor.value ?? THEME_COLORS[theme].ink;
    const [r, g, b] = hexToRgb(ink);
    root.style.setProperty('--muted', fitForContrast(ink, bg, 4.5));
    root.style.setProperty('--faint', fitForContrast(ink, bg, 3));
    root.style.setProperty('--line', `rgba(${r}, ${g}, ${b}, 0.12)`);
    root.style.setProperty('--line-soft', `rgba(${r}, ${g}, ${b}, 0.07)`);
  }
  watch(bgColor, (c) => {
    if (c) document.documentElement.style.setProperty('--bg', c);
    else document.documentElement.style.removeProperty('--bg');
    applyDerivedMuted();
  }, { immediate: true });
  watch(textColor, (c) => {
    if (c) document.documentElement.style.setProperty('--ink', c);
    else document.documentElement.style.removeProperty('--ink');
    applyDerivedMuted();
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
    if (m === 'auto') {
      applyDerivedMuted();
      return;
    }
    const root = document.documentElement;
    root.classList.add('theme-fade');
    root.dataset.theme = m;
    applyDerivedMuted();
    window.setTimeout(() => root.classList.remove('theme-fade'), 650);
  }, { immediate: true });

  return {
    siteName, logoMark, bgColor, textColor, mode, accent, mirror, invert, noCss, sandwich,
    setSiteName, setBgColor, setTextColor, setMode, setAccent,
    toggleMirror, toggleInvert, toggleNoCss, toggleSandwich, resetAll, isModified,
  };
});
