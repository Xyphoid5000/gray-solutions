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
                          #   blocks, progress bar, vignette + flash + veil
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
timeline and nothing to "finish". A sticky 100vh stage holds the whole
sequence behind a ~700vh scroll region; a single scroll-progress value
(0→1) drives everything, so scrolling up rewinds the camera exactly.

The division of labor is deliberate:

- **Three.js owns the WORLD** — `src/three/intro.ts` builds the scene:
  the logo is INFINITELY DEEP, but only the middle bar exists in 3D. An
  endless chrome beam (`BoxGeometry(3000, 30, 24)`, metalness 1.0,
  RoomEnvironment IBL) runs to ±X infinity, and a giant chrome "G"
  (hand-authored extruded arch, gap on the right) stands around it — the
  beam IS the G's crossbar, one monumental sculpture. Starfield + glints
  and atmospheric haze complete the infinite-space feel. No badge, no
  wordmark, no S, no duplicates, no reflections.
- **GSAP owns the STORY** — one *paused* timeline, scrubbed via
  `setProgress(p)`. The camera moves by PURE TRANSLATION only, with one
  fixed lookAt `(0, 10, 0)` — no rotation, no arcs. It starts sitting ON
  the beam (26, 22, 14 — ~7 units above the surface, deep inside the G's
  ring) and only ever dollies back and up: (10, 45, 110) → (-30, 90, 260)
  → (-70, 160, 430). FogExp2 density is timeline-driven (deterministic,
  reversible): dense at p=0 so the G is fully hidden, lifting through
  phase 2 so the G's top arch comes into view first, then its side, to
  near-clear at the wide shot. Phase 3 (0.7→1) is a FAST accelerating
  pullback (`power3.in`), with a restrained flash + particle burst as the
  G resolves (~p 0.8). The burst is deterministic (a pure function of
  timeline state), so it rewinds cleanly too.
- **The DOM owns the STORYTELLING LAYER** — `IntroSequence.vue` renders
  the full hero philosophy copy across five giant-type blocks ("Every good
  story needs great structure." … "turn ideas into something real."). Each
  line starts dim and illuminates to full SOLID opacity over its scroll
  window, then dims as it leaves — all scrubbed by scroll, driven
  deterministically by the same progress value (no ScrollTrigger enter
  events inside the sticky stage). G-S word pairs wear the logo's colors
  (G-word silver, S-word blue), matching the hero copy. A thin
  electric-blue progress bar (the only progress indicator) tracks the
  journey at the top of the viewport.
- **The hero was there the whole time** — it lives inside the sticky
  stage behind the canvas for the entire sequence (opacity 0 → 1 from
  p≈0.88 → 1, while the canvas fades 1 → 0 from p≈0.9 → 1). It is revealed
  in place and never slides up; the visitor started inside it. When the
  intro can't run, the hero renders statically in the page instead.
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
