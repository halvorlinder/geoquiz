---
id: DD-0009
title: Highest-point study scope
status: accepted
date: 2026-08-21
applies_to: high-point dataset, shape-high-point quiz, marker rendering
supersedes: none
superseded_by: none
---

# DD-0009: Highest-point study scope

## Context

Highest-point learning needs a stable answer policy for low, shared, disputed,
and newly surveyed locations without implying more coordinate precision than
the evidence supports.

## Decision

The highest-point quiz has one versioned natural-terrestrial-point record for
each of the 197 sovereign-study entities. Dependencies and territory-deck areas
are excluded; constitutionally integral islands are included. Edge cases are
documented with canonical answers, aliases, sources, checked dates, and
representative or provisional marker status where needed. A marker is never
snapped into a silhouette merely to look neat: a visible outside marker is
valid when the source coordinate requires it. Kosovo/Serbia and
Myanmar/Palestine follow the fixed neutral policies in the authoritative
highest-point documentation.

## Acceptance criteria

- Exactly one highest-point record exists for every 197 sovereign-study entity.
- Dependencies and territory-deck areas are excluded while constitutionally
  integral islands are included.
- Representative and provisional coordinate confidence is explicitly classified
  in the dataset.
- Sourced coordinates remain unsnapped; a marker outside a simplified silhouette
  remains visible when its source coordinate requires that position.
- High-risk Kosovo/Serbia and Myanmar/Palestine cases follow the documented,
  neutral canonical-answer and marker policies.
- Records retain source, checked-date, alias, coordinate-confidence, and
  edge-case information rather than deriving an answer from display geometry.

## Consequences

“Highest point” includes non-mountain or descriptive natural-ground answers.
Markers are study aids rather than boundary or summit-survey claims; improved
evidence requires a versioned dataset review rather than a visual-only fix.

## Verification

`docs/high-point-data.md`, `src/core/highPointValidation.ts`, high-point tests,
and `npm run validate:data` verify exact coverage, source metadata, edge-case
locks, and selected-marker snapshots.
