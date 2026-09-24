<script setup lang="ts">
import ChapterHeading from './ChapterHeading.vue';
</script>

<template>
  <section id="premise" class="chapter" aria-label="Chapter 1 — The premise">
    <div class="wrap">
      <ChapterHeading
        index="01"
        kicker="Chapter One &mdash; The Premise"
        title="Nobody remembers <em>a brochure.</em>"
      />
      <p v-reveal class="premise-statement">
        <span class="dim">Your visitor arrives, skims, shrugs, and leaves.</span>
        Not because your business isn&rsquo;t good &mdash; because your
        website never gave them a <em>reason to stay.</em>
      </p>
      <p v-reveal class="premise-statement">
        People don&rsquo;t remember lists. They remember
        <em>stories</em> &mdash; a beginning that hooks, a middle that
        builds, an ending worth acting on.
      </p>
      <div class="premise-grid">
        <div v-reveal class="premise-point">
          <h3>The hook, <em>not the header</em></h3>
          <p>
            Above the fold isn&rsquo;t a billboard &mdash; it&rsquo;s the
            first line of a novel. If it doesn&rsquo;t earn the next scroll,
            nothing below it matters.
          </p>
        </div>
        <div v-reveal="0.1" class="premise-point">
          <h3>Tension, <em>then release</em></h3>
          <p>
            Great stories run on tension and payoff. Your visitor&rsquo;s
            problem is the tension; your work is the release. The site
            should be paced like it means it.
          </p>
        </div>
        <div v-reveal class="premise-point">
          <h3>A character <em>to root for</em></h3>
          <p>
            Nobody roots for a logo. They root for the person behind it.
            Your site should sound like you on your best day &mdash; not
            like a template&rsquo;s placeholder text.
          </p>
        </div>
        <div v-reveal="0.1" class="premise-point">
          <h3>An ending <em>worth acting on</em></h3>
          <p>
            Every story lands somewhere. Yours lands on a phone call, a
            booking, a sale &mdash; the call to action is the climax, not
            an afterthought.
          </p>
        </div>
      </div>
    </div>
  </section>
  <div class="marquee" aria-hidden="true">
    <div class="marquee-track">
      <span v-for="n in 2" :key="n">
        <template v-for="word in ['beginning', 'middle', 'end']" :key="word">
          {{ word }} <b>&mdash;</b>
        </template>
      </span>
    </div>
  </div>
</template>
