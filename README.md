# Gray Solutions

The home of **Gray Solutions** — Chris Gray's studio for custom websites and
digital experiences. A dark, cinematic single-page site: a Three.js + GSAP
intro sequence ("you've been standing on the logo the entire time") that snaps
flat into a fast, premium homepage.

## Stack

- **Vue 3** + **TypeScript** + **Vite** — the daily-driver stack
- **GSAP** (+ ScrollTrigger) — all story/choreography, on-page reveals
- **Three.js** — the intro's 3D world (lazy-loaded on demand)
- **Space Grotesk** (display) + **Inter** (body) via Google Fonts

## Quickstart

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build (dist/)
npm run preview  # serve the production build locally
```

## Project layout

```
src/
  main.ts                 # app entry, registers the v-reveal directive
  App.vue                 # intro overlay + page composition
  config.ts               # ★ contact details, socials, location — edit here
  style.css               # theme tokens, buttons, section scaffolding
  three/
    intro.ts              # the cinematic intro (Three.js world + GSAP story)
  directives/
    reveal.ts             # v-reveal: restrained scroll-in animation
  components/
    IntroSequence.vue     # intro overlay: canvas, skip, flash, fallbacks
    LogoMark.vue          # ★ the GS monogram (original vector interpretation)
    Wordmark.vue          # GRAY / SOLUTIONS wordmark
    Nav.vue / Hero.vue / About.vue / Services.vue
    Work.vue / Process.vue / Contact.vue / Footer.vue
public/
  favicon.svg             # ★ badge version of the monogram
```

## How the intro works

The division of labor is deliberate:

- **Three.js owns the WORLD** — `src/three/intro.ts` builds the scene: the
  infinite bridge (secretly the logo's connector), starfield + glints,
  atmospheric haze, the G (torus-arc segments + arrow crossbar), the S
  (emissive tube that draws itself), canvas-sprite text phrases, fog, lighting.
- **GSAP owns the STORY** — one timeline choreographs the camera, phrase
  fly-bys, the G's piece-by-piece reveal, tunnel-wall projections, the S
  draw-in, the color progression (gray → blue), the perspective-shift finale,
  the energy release, and the snap-flat crossfade into the hero.

The intro never traps the visitor:

- **Skip intro** button, always visible
- `prefers-reduced-motion` → straight to the site
- WebGL unavailable / init failure → straight to the site
- 32-second watchdog forces completion no matter what
- `?skip-intro` query param skips it (handy during development)
- Rendering pauses when the tab is hidden; the scene is fully disposed on unmount
- `devicePixelRatio` capped at 2 (1.5 on small screens)

The three.js bundle is code-split (`intro-*.js`) and only downloaded when the
intro actually runs.

## Customizing

- **Contact details** — `src/config.ts`: email (currently a temporary
  `c90gray@gmail.com` until the dedicated address exists), LinkedIn, GitHub,
  location.
- **Logo** — `src/components/LogoMark.vue` is a hand-drawn geometric GS
  monogram (silver G + blue S + pixel accent), an original interpretation of
  the preferred brand mark. `public/favicon.svg` is the badge variant. To use
  final brand artwork, replace the SVG geometry in `LogoMark.vue`.
- **Copy** — philosophy text lives in `Hero.vue`; case study in `Work.vue`.

## Deployment

Any static host works (`dist/` after `npm run build`): GitHub Pages, Netlify,
Vercel, Cloudflare Pages. No server-side code, no environment variables.

## Notes / decisions

- No pricing numbers anywhere on the site (deliberate) — Services closes with
  *"Every project is one of one. Tell me about yours."*
- The Burning River case study links to the public GitHub repo; no live URL
  was available, so no "visit site" link is shown. Add one in `Work.vue` when
  there's a URL to point at.
- The intro is the spectacle; the page itself is intentionally restrained —
  one fade-up per section, no scroll-jacking.
