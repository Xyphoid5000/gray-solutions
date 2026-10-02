<!--
  Wax seal: glossy bright-red wax, raised rim, drippy organic edge, embossed G.
  Bonus-only indicator. Used on the manuscript's front page (CoverHero) and
  pressed over the G on the bound Gray Solutions book's front cover (Book.vue
  shelf overlay). Only one instance is ever in the DOM at a time — the
  manuscript shows while unbound, the bound book only after binding — so the
  SVG ids stay collision-free.
-->
<template>
  <div class="wax-seal" aria-hidden="true">
    <svg viewBox="0 0 120 120">
      <defs>
        <radialGradient id="waxBody" cx="42%" cy="34%" r="75%">
          <stop offset="0%" stop-color="#f2492f" />
          <stop offset="45%" stop-color="#d12c17" />
          <stop offset="100%" stop-color="#931708" />
        </radialGradient>
        <linearGradient id="waxRim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ff9a7e" />
          <stop offset="45%" stop-color="#e23d24" />
          <stop offset="100%" stop-color="#8f150c" />
        </linearGradient>
        <filter id="waxSoft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <!-- contact shadow grounds the wax on the paper -->
      <ellipse cx="60" cy="111" rx="42" ry="7" fill="#3a0d06" opacity="0.28" filter="url(#waxSoft)" />
      <!-- side wall: a dark extrusion under the wax gives it real
           height, so it reads as a thick blob from the side -->
      <g fill="#5e0d05">
        <g transform="translate(0,7)">
          <path
            d="M60 14 C76 12, 92 22, 97 38 C100 48, 98 54, 100 62 C102 74, 94 88, 82 96 C70 104, 54 106, 40 100 C26 94, 16 82, 15 66 C14 54, 18 48, 17 38 C16 26, 30 16, 44 15 C49 14.5, 55 14.5, 60 14 Z"
          />
        </g>
        <g transform="translate(0,4)">
          <ellipse cx="101" cy="30" rx="7" ry="9" />
          <circle cx="20" cy="95" r="6" />
        </g>
      </g>
      <!-- satellite droplets -->
      <ellipse cx="101" cy="30" rx="7" ry="9" fill="url(#waxBody)" stroke="#7d130a" stroke-width="1.5" />
      <ellipse cx="99" cy="27" rx="2.4" ry="3.4" fill="#ffb3a0" opacity="0.75" filter="url(#waxSoft)" />
      <circle cx="20" cy="95" r="6" fill="url(#waxBody)" stroke="#7d130a" stroke-width="1.5" />
      <circle cx="18.5" cy="93" r="1.8" fill="#ffb3a0" opacity="0.7" filter="url(#waxSoft)" />
      <!-- main blob -->
      <path
        d="M60 14 C76 12, 92 22, 97 38 C100 48, 98 54, 100 62 C102 74, 94 88, 82 96 C70 104, 54 106, 40 100 C26 94, 16 82, 15 66 C14 54, 18 48, 17 38 C16 26, 30 16, 44 15 C49 14.5, 55 14.5, 60 14 Z"
        fill="url(#waxBody)"
        stroke="#7d130a"
        stroke-width="2"
      />
      <!-- recessed inner field -->
      <circle cx="60" cy="60" r="33" fill="#a81f10" opacity="0.55" />
      <!-- raised glossy rim -->
      <circle cx="60" cy="60" r="39" fill="none" stroke="url(#waxRim)" stroke-width="9" />
      <circle cx="60" cy="60" r="43.5" fill="none" stroke="#7d130a" stroke-width="1.5" opacity="0.8" />
      <!-- specular streaks -->
      <path d="M30 38 A36 36 0 0 1 62 22" fill="none" stroke="#ffd9cc" stroke-width="5" stroke-linecap="round" opacity="0.65" filter="url(#waxSoft)" />
      <path d="M28 74 A38 38 0 0 0 44 90" fill="none" stroke="#ffd9cc" stroke-width="3.5" stroke-linecap="round" opacity="0.35" filter="url(#waxSoft)" />
      <!-- embossed G: shadow, body, catchlight -->
      <text x="60" y="61.5" text-anchor="middle" dominant-baseline="central" font-family="Georgia, 'Times New Roman', serif" font-size="42" fill="#6e0f06" opacity="0.9">G</text>
      <text x="60" y="60" text-anchor="middle" dominant-baseline="central" font-family="Georgia, 'Times New Roman', serif" font-size="42" fill="#ef4a30">G</text>
      <text x="60" y="59.2" text-anchor="middle" dominant-baseline="central" font-family="Georgia, 'Times New Roman', serif" font-size="42" fill="#ffab90" opacity="0.5">G</text>
    </svg>
  </div>
</template>
