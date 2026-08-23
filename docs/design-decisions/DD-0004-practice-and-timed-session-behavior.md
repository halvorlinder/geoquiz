---
id: DD-0004
title: Practice and timed session behavior
status: accepted
date: 2026-08-21
applies_to: shared session behavior, quiz interaction, answer feedback
supersedes: none
superseded_by: none
---

# DD-0004: Practice and timed session behavior

## Context

The quizzes need both a deliberate learning mode and a fast recall mode without
making skipped or revealed questions disappear from a run incorrectly.

## Decision

Practice is untimed and uses explicit checking and reveal controls. Timed runs
use a monotonic count-up timer and accept an unambiguous correct answer without
requiring submission. Timed questions form a circular pending queue: Skip keeps
the question pending and moves it behind every other pending question; correct
and Reveal remove it. Reveal names the answer, records a revealed/red outcome,
and does not count as correct. White/pending, green/correct, and red/revealed
states must also have text or accessible semantics. Timed matching retains the
safe context for advancing: unresolved partial, fuzzy, or ambiguous input never
auto-advances. In multi-answer neighbour questions, an exact currently required
entity may resolve immediately even when it prefixes another entity, while a
shorter known non-neighbour that prefixes a required longer name remains
unresolved. In flags, an exact catalog answer that prefixes another accepted
catalog answer waits for explicit exact submission.

## Acceptance criteria

- Practice does not run a timer and requires an explicit answer check.
- Timed elapsed time is nondecreasing and a correct, safe answer can advance
  without a Check answer action.
- A skipped question returns only after every other outstanding question.
- Reveal displays the answer, marks the outcome as revealed rather than correct,
  and removes that question from timed completion work.
- Completion occurs only when the timed pending queue is empty; non-colour text
  or accessible state describes every outcome.
- Unresolved partial, fuzzy, or ambiguous input never auto-advances.
- A currently required exact neighbour answer may resolve immediately; a known
  non-neighbour prefix of a missing required longer answer remains unresolved.
- An exact flag answer that prefixes another accepted catalog answer requires
  explicit exact submission in Timed mode.

## Consequences

Timed results can distinguish recall from revealed answers. Quiz-specific reveal
presentation may differ, but it must preserve the shared queue and outcome
meaning. A learning aid or explicit submission path must not bypass answer
collision and prefix safety.

## Verification

`src/core/session/timedSession.test.ts`, answer-matching tests, and each quiz's
interaction tests cover queue transitions, timed acceptance, reveal, and status
semantics. Browser QA remains required for final focus and feedback behavior.
