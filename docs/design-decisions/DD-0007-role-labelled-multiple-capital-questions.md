---
id: DD-0007
title: Role-labelled multiple-capital questions
status: accepted
date: 2026-08-21
applies_to: country-capital quiz, entity catalog, answer inputs
supersedes: none
superseded_by: none
---

# DD-0007: Role-labelled multiple-capital questions

## Context

Some study entities have multiple official capital functions. Splitting them
into unrelated country questions would obscure those roles and distort progress.

## Decision

Country-capital play asks one question per entity and presents one required
input for every role-labelled capital assignment. South Africa requires
Administrative—Pretoria, Legislative—Cape Town, and Judicial—Bloemfontein;
Bolivia requires Constitutional capital—Sucre and Seat of government—La Paz;
Eswatini requires Administrative—Mbabane and Royal and legislative—Lobamba.
Fields can be completed in any order and lock independently. The entity outcome
is correct only when all fields are answered without reveal; revealing a field
makes the completed entity revealed. This entity policy is distinct from the
capital-dot dataset's 200 unique city-place questions.

## Acceptance criteria

- Each study entity creates one country-capital question regardless of its
  number of capital roles.
- South Africa, Bolivia, and Eswatini show all approved role-labelled inputs.
- Correct fields lock independently and may be completed in any order.
- An entity counts correct only when every required field is answered without
  reveal; any reveal gives a revealed outcome.
- Capital-dot questions continue to use unique capital places rather than these
  entity-level multi-input questions.

## Consequences

Role labels and assignments are authoritative entity data, not UI-only hints.
Future multiple-capital cases must be added through the entity and capital data
policy, not by inventing extra questions in a quiz component.

## Verification

`docs/entity-data.md` and `docs/capital-data.md` record the assignments.
Entity, country-capital, and shape-capital tests verify the three multi-capital
cases and `npm run validate:data` checks their reciprocal data mappings.
