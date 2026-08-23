---
id: DD-0008
title: Land-neighbour question scope
status: accepted
date: 2026-08-21
applies_to: neighbour dataset, shape-neighbours quiz, study policy
supersedes: none
superseded_by: none
---

# DD-0008: Land-neighbour question scope

## Context

Silhouette geometry cannot safely determine answer policy, especially for
exclaves, dependencies, point contacts, and sensitive borders.

## Decision

The neighbour quiz uses a versioned, hand-curated reciprocal land-boundary
dataset. Countries with no eligible land neighbours are excluded from its
question set. Conventional terrestrial boundaries, including integral territory
and ordinary exclaves, count; point-only contact and contacts arising only from
dependencies in the flag territory deck do not. Sensitive and disputed cases
are represented in the dataset and `docs/neighbours-data.md` with neutral,
versioned notes rather than inferred from rendered shapes or treated as legal
conclusions.

## Acceptance criteria

- Zero-neighbour entities are not drawn as neighbour-quiz questions.
- Every accepted edge is reciprocal, non-self, and has an approved scope.
- Integral territory and ordinary exclaves can create eligible edges.
- Dependency-only and point-only contacts do not create eligible edges.
- The sensitive/disputed roster is sourced, versioned, and expressed neutrally
  in the neighbour policy and dataset.
- Display silhouettes never determine neighbour answers.

## Consequences

The question count follows the curated dataset rather than a geographic renderer.
Any disputed-border change requires an explicit data-policy update, sources,
notes, and snapshot validation.

## Verification

`docs/neighbours-data.md`, `scripts/validate-neighbours.ts`, and
`src/core/neighbours.test.ts` verify exact eligibility, reciprocity, exclusions,
and sensitive-case snapshots. `npm run validate:data` runs this validation.
