---
id: DD-0020
title: Study quiz layout and keyboard flow
status: accepted
date: 2026-08-24
applies_to: country-capital, shape-capital, shape-high-point, flag-country, responsive layout, keyboard interaction
supersedes: none
superseded_by: none
---

# DD-0020: Study quiz layout and keyboard flow

## Context

The non-map study exercises need the same calm, legible quality as Capital
dots while retaining their different questions and data policies. DD-0003
requires browser review of that visual and responsive work, and DD-0004 fixes
the Practice and Timed semantics that this presentation must preserve.

## Decision

Country capitals, Shape capitals, Shape highest points, and Flag countries use
a coherent study hierarchy: masthead, compact setup rail, and a generous
challenge card. At desktop widths the setup rail and challenge form a two-column
composition; narrow screens use a single, page-scrollable column so visual
material and controls retain useful size. Native forms retain Enter submission
and the keyboard focus path follows the active task: unresolved answer input on
new questions and after wrong or partial feedback, Next after resolution or
reveal, and Restart after completion.

## Acceptance criteria

- The scoped quizzes share a clear masthead, setup, challenge, feedback, and
  action hierarchy without changing their questions, filters, scores, or reveal
  policies.
- Desktop uses a restrained two-column setup-rail/challenge composition; mobile
  uses one column and page-level scrolling without crushing silhouettes, flags,
  inputs, or actions into unusable sizes.
- Native form submission and visible focus remain available without global
  keyboard shortcuts or duplicate activations.
- A wrong Practice check returns to and selects the first unresolved input;
  partial multi-capital resolution advances focus to the next unresolved input;
  resolution/reveal focuses Next; completion focuses Restart.
- Capital dots and Shape neighbours are outside this layout decision.

## Consequences

The four quizzes may share CSS and the existing capital-field component, but no
generic quiz framework is introduced. Their mode, filter, score, answer safety,
and data decisions remain governed by the existing records.

## Verification

Focused component tests cover keyboard focus transitions and native submission.
Stylesheet tests cover the scoped desktop/mobile composition. Chrome review at
approximately 1440×900 and 390×844 remains required before publication.
