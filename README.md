# Gray Solutions

The home of **Gray Solutions** — Chris Gray's studio for custom websites and
digital experiences. A dark, cinematic single-page site: a scroll-driven
Three.js + GSAP intro ("you've been standing on the logo the entire time,"
told backwards) that lands on a fast, premium homepage.

## Stack

- **Vue 3** + **TypeScript** + **Vite** — the daily-driver stack
- **GSAP** (+ ScrollTrigger) — all story/choreography, on-page reveals
- **Three.js** — the intro's 3D world (lazy-loaded on demand)
- **Lenis** — buttery inertial smooth scrolling; the scrubbed intro's feel
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
  App.vue                 # Lenis + ScrollTrigger wiring, page composition
  config.ts               # ★ contact details, socials, location — edit here
  style.css               # theme tokens, buttons, section scaffolding
  lib/
    scroll.ts             # shared Lenis handle (smooth scrollTo helpers)
  three/
    intro.ts              # the 3D world + the paused, scroll-scrubbed timeline
  directives/
    reveal.ts             # v-reveal: restrained scroll-in animation
  components/
    IntroSequence.vue     # the 700vh scroll region: fixed canvas, phrase
                          #   blocks, progress bar, flash + veil
    Wordmark.vue          # GRAY / SOLUTIONS wordmark
    Nav.vue / Hero.vue / About.vue / Services.vue
    Work.vue / Process.vue / Contact.vue / Footer.vue
public/
  logo-lockup.jpg         # ★ Chris's actual logo (hero)
  logo-badge.jpg          # ★ badge crop (nav, footer)
  favicon.jpg             # ★ badge crop, 180px
```

## How the intro works

The intro is **scroll-driven and fully scrubbable** — there is no autoplay
timeline and nothing to "finish". One fixed full-viewport WebGL canvas sits
behind a ~700vh scroll region; a single scroll-progress value (0→1) drives
everything, so scrolling up rewinds the camera exactly.

The division of labor is deliberate:

- **Three.js owns the WORLD** — `src/three/intro.ts` builds the scene: the
  infinite bar (secretly the logo's connector), starfield + glints,
  atmospheric haze, the silver G (torus arc + crossbar), the emissive blue S
  (tube that draws itself), the connector, fog, lighting.
- **GSAP owns the STORY** — one *paused* timeline, scrubbed via
  `setProgress(p)`. Phase 1 (0→0.4): slow forward drift along the bar.
  Phase 2 (0.4→0.7): the pullback begins, G and S emerge from the dark.
  Phase 3 (0.7→1): a FAST accelerating pullback — the camera tweens use
  `power3.in` easing so the motion rushes outward as scroll progress
  increases ("scroll out a lot faster"), then a restrained flash + particle
  burst as the full logo is revealed. The burst is deterministic (a pure
  function of timeline state), so it rewinds cleanly too.
- **The DOM owns the STORYTELLING LAYER** — `IntroSequence.vue` renders the
  story phrases ("Every Good Story", "Great Structure", "Generate Smiles",
  "Solve Problems") as giant type in tall blocks. Each line starts dim and
  illuminates as it crosses the viewport center, then dims as it leaves —
  all scrubbed by scroll. A thin electric-blue progress bar (the only
  progress indicator) tracks the journey at the top of the viewport.
- **Lenis owns the FEEL** — inertial smooth scrolling wired into GSAP's
  ticker (`lenis.on('scroll', ScrollTrigger.update)`), with nav anchor
  clicks routed through `lenis.scrollTo`. The smoothness *is* the message.

The intro never traps the visitor:

- `prefers-reduced-motion` → the intro region isn't rendered at all
- WebGL unavailable / init failure → the region is removed, land on the hero
- `?skip-intro` query param skips it (handy during development)
- Rendering pauses when the tab is hidden or the canvas has faded out; the
  scene is fully disposed on unmount
- `devicePixelRatio` capped at 2 (1.5 on small screens)

The three.js bundle is code-split (`intro-*.js`) and only downloaded when
the intro actually runs. Lenis is in the main bundle (small).

The hero's "Replay the intro" button smooth-scrolls back to the top —
which naturally replays the scrub.

## Customizing

- **Contact details** — `src/config.ts`: email (currently a temporary
  `c90gray@gmail.com` until the dedicated address exists), LinkedIn, GitHub,
  location.
- **Logo** — Chris's actual artwork: `public/logo-lockup.jpg` (hero),
  `public/logo-badge.jpg` (nav/footer), `public/favicon.jpg`.
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
  one fade-up per section. Per Chris: "resist adding another 47 effects."
