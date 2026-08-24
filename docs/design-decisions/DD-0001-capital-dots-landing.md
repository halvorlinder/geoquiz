---
id: DD-0001
title: Capital dots is the landing experience
status: superseded
date: 2026-08-21
applies_to: app shell, routing, capital map
supersedes: none
superseded_by: DD-0019
---

# DD-0001: Capital dots is the landing experience

## Context

Geoquiz has grown into a collection of quiz formats, but the map-based capital
practice remains the primary experience. Requiring a visit to a chooser before
reaching that exercise weakens the intended immediate start.

## Decision

The root hash route `#/` opens the existing Capital dots quiz directly in its
default Practice mode. The quiz chooser lives at `#/quizzes`. The legacy
`#/capital-map` route remains a compatible deep link to the same implementation.
Active quiz pages provide a compact, clear route to `All quizzes`.

## Acceptance criteria

- Empty hash, `#`, and `#/` render Capital dots in Practice mode.
- `#/quizzes` renders the six-quiz chooser.
- `#/capital-map` renders the same Capital dots implementation without a fork.
- Browser Back/Forward, route titles, focus, lazy loading, and quiz-state
  isolation remain correct.
- Unknown hashes render the Not Found state with a route to `#/quizzes`.

## Consequences

The chooser is navigation, not the home experience. New quiz formats must be
added to the chooser without displacing Capital dots from `#/` unless a later
decision explicitly supersedes this one.

## Verification

Route parsing and application tests cover the root, chooser, legacy, history,
and unknown-route behavior. Rendered browser QA must still confirm navigation
and focus behavior before publication.

## History

Superseded by DD-0019. Its root landing and `#/capital-map` compatibility
outcomes are explicitly retained there; only its chooser-page and `All quizzes`
navigation outcomes are replaced.
