---
id: DD-0005
title: Study roster and continent filters
status: accepted
date: 2026-08-21
applies_to: entity catalog, question filters, quiz setup
supersedes: none
superseded_by: none
---

# DD-0005: Study roster and continent filters

## Context

Question filters need a stable study roster and a consistent continental
allocation that does not depend on map coordinates or display geometry.

## Decision

The sovereign study roster contains 197 entities. An All filter and six
continent filters select only entities assigned by the versioned entity catalog;
the resulting filter controls the question deck and applicable visual marks.
UN M49 is the baseline with fixed quiz allocations: Russia and Türkiye are in
Europe; Kazakhstan and Georgia are in Asia; Egypt is in Africa. These are neutral
learning-filter conventions, not recognition or boundary statements.

## Acceptance criteria

- The entity catalog and its validator retain exactly 197 study entities.
- All and every continent filter use catalog assignments rather than coordinates
  or map geometry.
- Russia and Türkiye filter as Europe; Kazakhstan and Georgia as Asia; Egypt as
  Africa.
- A selected filter limits the active question deck and relevant map marks to
  eligible entities.
- The catalog records these classifications as study policy without making a
  sovereignty, border, or recognition claim.

## Consequences

Changing the study roster or a continent allocation is a deliberate data-policy
change requiring its associated documentation and validation updates. Territory
scope has separate flag-quiz policy and must not silently alter the 197-entity
roster.

## Verification

`docs/entity-data.md`, `src/core/entityContinentPolicy.ts`, entity tests, and
`npm run validate:data` define and verify the roster and allocations. Quiz tests
verify that filtered decks use this catalog policy.
