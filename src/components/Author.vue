<script setup lang="ts">
import ChapterHeading from './ChapterHeading.vue';
import { siteConfig } from '../config';
</script>

<template>
  <section id="author" class="chapter" aria-label="Chapter 5 — The author">
    <div class="wrap">
      <ChapterHeading
        index="05"
        kicker="Chapter Five &mdash; The Author"
        title="Hi, I&rsquo;m <em>Chris.</em>"
      />
      <div class="author-grid">
        <div>
          <p v-reveal class="lede" style="margin-bottom: 1.8rem">
            By day I&rsquo;m a senior software engineer &mdash; C# backends,
            Vue frontends, databases that behave. On the side I run
            <strong style="color: var(--ink)">Gray Solutions</strong>,
            building websites for businesses that deserve better than a
            template.
          </p>
          <p v-reveal class="body-copy" style="margin-bottom: 1.4rem">
            I&rsquo;m also a drummer and a keys player, which is probably
            why I think about websites the way I think about songs:
            <strong>rhythm, tension, and a payoff.</strong> A great chorus
            and a great homepage are doing the same job &mdash; they make
            you feel something, then they make you stay.
          </p>
          <p v-reveal class="body-copy">
            That&rsquo;s the whole pitch, really. I don&rsquo;t sell pages.
            I sell the feeling your customers get when your story finally
            sounds like you.
          </p>
        </div>
        <ul v-reveal="0.1" class="author-facts">
          <li>
            <span class="fact-k">Day job</span>
            <span class="fact-v"><strong>Senior software engineer</strong> &mdash; C#, Vue 3, TypeScript</span>
          </li>
          <li>
            <span class="fact-k">Side quest</span>
            <span class="fact-v"><strong>Gray Solutions</strong> &mdash; story-driven client websites</span>
          </li>
          <li>
            <span class="fact-k">After hours</span>
            <span class="fact-v">Drums, keys, and worship-team Sundays</span>
          </li>
          <li>
            <span class="fact-k">Based in</span>
            <span class="fact-v">{{ siteConfig.location }}</span>
          </li>
          <li>
            <span class="fact-k">Currently</span>
            <span class="fact-v">Booking select projects &mdash; <strong>one story at a time</strong></span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
