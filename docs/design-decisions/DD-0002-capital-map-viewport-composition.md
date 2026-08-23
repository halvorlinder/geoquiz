---
id: DD-0002
title: Capital-map viewport composition
status: accepted
date: 2026-08-21
applies_to: capital map, responsive layout, run setup
supersedes: none
superseded_by: none
---

# DD-0002: Capital-map viewport composition

## Context

The first no-scroll layout allowed navigation, title, and run setup to consume
too much height. A later compact strip met the height arithmetic but looked
cramped and utilitarian. The map and answer are the product; setup is supporting
chrome.

## Decision

Capital-map play must not require document or nested scrolling. At desktop
widths of at least 1200px, the actual map-and-answer region occupies at least
85% of the dynamic viewport height. Navigation, identity, progress, and setup
share the remaining 15% or less.

Desktop composition must use the available horizontal space: identity and
progress occupy the left side of a compact top band, while readable, clearly
grouped mode, question-set, summary, and start/restart controls use the right.
The top must feel coherent and intentional—not like a dense debug toolbar.
Required controls may not be hidden, clipped, transformed smaller, or overlaid
on the map to satisfy the height target.

At narrow widths, controls may wrap into an intentional responsive composition.
The page still must not scroll or clip required content, the map must retain a
nonzero usable size, and text inputs must remain at least 16px to avoid mobile
browser zoom.

## Acceptance criteria

- At 1440×900, the map-and-answer region is at least 765px tall.
- At desktop widths, setup uses the space to the right of identity/progress and
  retains readable typography and visible focus.
- `html`, `body`, the document, and quiz shells have no horizontal or vertical
  scrolling at 1440×900 and 390×844.
- Every setup, answer, reveal, and completion control remains visible and
  operable; no nested scroll region substitutes for fitting the viewport.
- Leaflet receives nonzero dimensions and invalidates its size after responsive
  layout changes without resetting or refocusing the question.
- The 2026-08-21 tiny-type, cramped control-strip treatment is not an approved
  visual solution even if its numeric height allocation passes.

## Consequences

Capital-map layout may have route-specific shell styles because its map-first
composition differs from text quizzes. The 85% rule is a minimum, not permission
to reduce accessibility or visual quality. Intermediate widths require an
explicit layout rather than inheriting a broken desktop or mobile arrangement.

## Verification

Source tests protect the viewport allocation, semantic controls, mobile input
size, and Leaflet resize integration. Final acceptance requires measuring real
rendered bounds and overflow at 1440×900 and 390×844 in the required browser,
including Practice, Timed, reveal, and completion states.
