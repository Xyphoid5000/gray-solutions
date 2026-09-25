<!--
  The about-me content, shared by the home page section and the
  standalone /about page. Portrait: swap the monogram for Chris's
  photo — <img class="about-photo" src="../assets/chris.jpg" alt="Chris Gray" />
  dropped inside .about-portrait, and it fills the frame.
-->
<template>
  <div class="about-me">
    <div class="about-portrait" role="img" aria-label="Portrait of Chris Gray">
      <span class="about-monogram" aria-hidden="true">CG</span>
    </div>
    <p class="kicker"><span class="k-num">&sect;</span> About me</p>
    <h2 class="h-display">The guy behind the book.</h2>
    <p class="hero-sub">
      I&rsquo;m a senior software engineer who treats every website like a
      story — with a hook, a rising arc, and an ending that asks something
      of the reader. Gray Solutions is where I do that for other people&rsquo;s
      businesses.
    </p>
    <dl class="about-facts">
      <div>
        <dt>Day job</dt>
        <dd>Senior software engineer — C# backend, Vue&nbsp;3 + TypeScript up front.</dd>
      </div>
      <div>
        <dt>Side quest</dt>
        <dd>Client sites with a pulse: design, motion, and story baked in.</dd>
      </div>
      <div>
        <dt>After hours</dt>
        <dd>Drums, keys, and an unreasonable 2026-album discovery habit.</dd>
      </div>
      <div>
        <dt>Based in</dt>
        <dd>Ohio — working with clients anywhere.</dd>
      </div>
      <div>
        <dt>Availability</dt>
        <dd>Booking new story-driven projects now.</dd>
      </div>
    </dl>
    <p class="about-signoff">
      <em>Every business has a story. Mine is helping you tell yours.</em>
    </p>
  </div>
</template>
