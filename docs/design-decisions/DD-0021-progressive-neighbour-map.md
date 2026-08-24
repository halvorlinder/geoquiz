---
id: DD-0021
title: Practice progressively builds a target-focused neighbour map
status: accepted
date: 2026-08-24
applies_to: shape-neighbours quiz, practice aids, country-shape map rendering, responsive map viewport
supersedes: none
superseded_by: none
---

# DD-0021: Practice progressively builds a target-focused neighbour map

## Context

A flat silhouette teaches recognition but does not teach where correctly
named neighbours sit around the target. Fitting all revealed countries makes tiny
targets disappear, and enabling this aid in Timed would conflict with the no-aids
recall mode.

## Decision

Shape neighbours offers an optional, default-Off Practice switch that
replaces the flat silhouette with a local, tile-free geographic map. The target
is shown first; each correct neighbour enters in its true geographic position,
and Reveal adds missing neighbours in a distinct treatment. The viewport is
computed from the target alone and is unchanged by added neighbours, so tiny
targets remain legible while large neighbours may be clipped. Timed retains the
flat no-aids silhouette. All geometry is bundled, answer policy remains curated
data rather than inferred geometry, motion respects user preference, and credits
remain generic/local/non-disclosing.

## Acceptance criteria

- Switch is a native accessible Practice-only switch, defaults Off, persists
  across mounted Practice questions, and never resets quiz state.
- Correctly guessed/revealed neighbours appear in true relative geography below
  the target with distinct non-colour semantics and reduced-motion support.
- Target-only framing remains identical as neighbours are added; Liechtenstein
  stays materially visible with Austria/Switzerland, and a Recenter target
  control restores the fixed question framing.
- Local WGS84 geometry is antimeridian-safe, sanitized, tile-free, and makes no
  runtime geography request; unresolved names/codes do not leak through DOM,
  ARIA, properties, links, or unearned layers.
- Attribution follows DD-0017/DD-0018 without per-entity unresolved destinations
  or a noisy map attribution box.
- Desktop/mobile Chrome QA verifies composition, controls, pan/zoom, transitions,
  focus, antimeridian safety, console, and network.

## Consequences

Practice gains spatial feedback at the cost of a larger optional
interactive surface and map-specific tests. The map is a study display, not a
source for neighbour policy or a sovereignty statement. Large neighbours are
intentionally clipped around microstates to protect the target learning task.

## Verification

Pure conversion/viewport tests, ShapeNeighboursQuiz interaction
tests, map semantic tests, production build/bundle comparison, and required
Chrome QA at desktop and mobile viewports.
