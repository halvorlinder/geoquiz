---
id: DD-0006
title: Local scoreboard scope
status: accepted
date: 2026-08-21
applies_to: scoreboards, timed sessions, browser storage
supersedes: none
superseded_by: none
---

# DD-0006: Local scoreboard scope

## Context

Timed scores should be comparable only within the same quiz and active question
scope, while retaining the static, account-free product boundary.

## Decision

Completed timed runs are stored locally in one top-ten scoreboard per quiz and
active filter combination. The score scope includes continent and, for flags,
territory scope. Entries are isolated by quiz data version and rank by correct
answers descending, then duration ascending. Browser storage is optional:
corrupt, unavailable, blocked, or quota-full storage never prevents play or an
in-memory result.

## Acceptance criteria

- Practice runs do not create scoreboard entries.
- Timed boards are isolated by quiz ID, active continent/filter, and flag
  territory scope where applicable.
- Entries from a different data version are excluded from the current board.
- A board retains at most ten completed results ranked by correct count then
  elapsed duration.
- Invalid or unavailable browser storage produces an empty or in-memory board
  without interrupting gameplay.

## Consequences

There are no player identities, cloud synchronization, or cross-quiz rankings.
Changing data-version semantics or result ranking requires a replacement design
decision because it changes score comparability.

## Verification

`src/core/scoreboard/scoreboard.test.ts` exercises key isolation, version
filtering, ordering, malformed payloads, and storage failures. Quiz tests verify
the correct scope is passed for each timed result.
