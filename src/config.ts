/**
 * Central contact / identity configuration.
 * Swap values here when details change — everything else reads from this file.
 */
export const siteConfig = {
  name: 'Gray Solutions',
  tagline: 'Every good story needs great structure.',
  // TEMPORARY: Chris is creating a dedicated business address; use it here when ready.
  email: 'c90gray@gmail.com',
  linkedIn: 'https://www.linkedin.com/in/c90gray',
  github: 'https://github.com/Xyphoid5000',
  // TODO (Chris): confirm location — best guess from context.
  location: 'Cleveland, Ohio',
} as const;

export const palette = {
  bg: '#0a0d12',
  bgSoft: '#0e131b',
  panel: '#111722',
  silver: '#c7ccd4',
  silverDim: '#8b93a1',
  blue: '#2f9bff',
  blueDeep: '#1f6fd0',
  line: 'rgba(199, 204, 212, 0.12)',
} as const;
