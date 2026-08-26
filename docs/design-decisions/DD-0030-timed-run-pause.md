---
id: DD-0030
title: Timed runs support a manual pause
status: accepted
date: 2026-08-26
applies_to: shared timed sessions, timed quiz interaction, scoreboards, keyboard accessibility
supersedes: none
superseded_by: none
---

# DD-0030: Timed runs support a manual pause

## Context

Timed recall runs need an intentional pause without allowing the player to study
the active question while its score clock is stopped. All timed quizzes must
apply the same elapsed-time and local-score comparison policy.

## Decision

An answerable, incomplete Timed question offers one native `Pause` action. It
immediately freezes active elapsed time and opens a native modal whose opaque
backdrop conceals and makes the complete exercise inert. The visible modal
contains only `Paused` and `Resume timed run`. Escape resumes; backdrop clicks
do nothing. Resume preserves the exact question, deck, queue, partial values,
locked fields, score, configuration, and map viewport, then focuses the useful
current answer input (the first incomplete capital field where applicable).

Pause is manual only. It is unavailable in setup, Practice, timed reveal
acknowledgement, and completion; reveal acknowledgement retains its existing
active-time behavior. Correct, skip, reveal, input, and IME completion
transitions are rejected while paused. Scoreboard entries use one shared timing
rules discriminator so pause-capable active-time scores are isolated from
historical wall-clock boards while retaining DD-0006 ordering.

## Acceptance criteria

- Every Timed quiz route exposes Pause only on an answerable incomplete question.
- Paused elapsed time stays fixed; completion duration excludes every pause interval.
- Pause conceals the exercise with a fully opaque native-modal backdrop and
  blocks background pointer, keyboard, map, input, and IME actions.
- Resume and Escape restore useful input focus and retain all active question state.
- Paused and resumed status is announced to assistive technology without
  changing the visible compact modal content.
- Desktop 1440×900 and mobile 390×844 retain the DD-0027 no-scroll invariant.
- All seven Timed scoreboard scopes read and write the same timing-rules version.

## Consequences

Paused time is not scored and manual background-tab handling remains out of
scope. The pause presentation is a narrow shared component rather than a new
generic quiz framework. It complements DD-0004's queue/reveal behavior and
DD-0006's local scoreboard policy.

## Verification

Core timed-session tests cover pause/resume duration and action rejection;
quiz interaction tests cover pause visibility, focus, input guards, and scoped
score versions. Direct Chrome DevTools MCP review at 1440×900 and 390×844 is
required before publication, including native-dialog concealment, no scroll,
keyboard/Escape, timer freeze, and map restoration.
