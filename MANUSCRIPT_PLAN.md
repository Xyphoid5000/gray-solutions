# Manuscript Review — Build Plan

**The concept:** the visitor is a writer doing a final review of the manuscript.
Loose pages, not a bound book. The bound book exists only on the cover and
in the closing cinematic.

## Phase 1 — The read pile (mobile + desktop)
- Finished pages get tossed onto a messy pile on the left via GSAP Flip.
- The new page is revealed underneath.
- Tabs live only on the right side.
- The page runs off the left edge of the screen.
- The pile persists across routes; going backward pops pages off.

## Phase 2 — Finale typewriter
- The last page types itself out, like it's being finished right now.

## Phase 3 — Gather and bind cinematic
- Hands (stylized flat silhouettes) gather the pages into a neat stack.
- The stack is bound into the book; back to the cover.
- Fallback if hands look cheap: the pages gather themselves.

## Fallback
This branch is based off `portfolio/story-driven` (PR #2). If the manuscript
direction flops, that branch remains the good bound-book version.
