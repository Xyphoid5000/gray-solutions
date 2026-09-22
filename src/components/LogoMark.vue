<script setup lang="ts">
/**
 * Gray Solutions GS monogram — an original geometric interpretation of the
 * brand mark: a silver G (arc + arrow crossbar) interlocked with an
 * electric-blue S, with a small digital-pixel accent. Drawn as crisp vector
 * geometry; no raster assets, animatable and themeable.
 */
defineProps<{
  /** Render inside the dark rounded-square badge */
  badge?: boolean;
}>();
</script>

<template>
  <svg viewBox="0 0 240 240" role="img" aria-label="Gray Solutions logo" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gs-silver" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f4f6f9" />
        <stop offset="0.55" stop-color="#b9bfc9" />
        <stop offset="1" stop-color="#878e9a" />
      </linearGradient>
      <linearGradient id="gs-blue" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8fd0ff" />
        <stop offset="0.55" stop-color="#2f9bff" />
        <stop offset="1" stop-color="#1460b4" />
      </linearGradient>
      <linearGradient id="gs-badge" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#161c26" />
        <stop offset="1" stop-color="#0b0e14" />
      </linearGradient>
    </defs>

    <rect
      v-if="badge"
      x="8"
      y="8"
      width="224"
      height="224"
      rx="52"
      fill="url(#gs-badge)"
      stroke="rgba(199,204,212,0.22)"
      stroke-width="2"
    />

    <g :transform="badge ? 'translate(14, 18) scale(0.883)' : undefined">
      <!-- Silver G: open arc -->
      <path
        d="M 190 66 A 80 80 0 1 0 190 174"
        fill="none"
        stroke="url(#gs-silver)"
        stroke-width="30"
        stroke-linecap="butt"
      />
      <!-- G crossbar: arrow driving into the mark -->
      <polygon
        points="92,104 146,104 146,94 184,120 146,146 146,136 92,136"
        fill="url(#gs-silver)"
      />
      <!-- Electric-blue S, interlocking the G's lower right -->
      <path
        d="M 168 148
           C 168 130 142 124 120 131
           C 98 138 94 152 114 158
           C 134 164 158 166 151 184
           C 144 200 108 202 88 189"
        fill="none"
        stroke="url(#gs-blue)"
        stroke-width="27"
        stroke-linecap="round"
      />
      <!-- Digital pixel accent trailing the S -->
      <rect x="188" y="58" width="15" height="15" fill="url(#gs-blue)" />
      <rect x="209" y="38" width="11" height="11" fill="url(#gs-blue)" opacity="0.85" />
      <rect x="191" y="30" width="8" height="8" fill="url(#gs-blue)" opacity="0.65" />
    </g>
  </svg>
</template>