---
id: DD-0027
title: Fixed-viewport site layout and keyboard flow
status: accepted
date: 2026-08-25
applies_to: all routes, responsive layout, overlay quiz menu, keyboard interaction
supersedes: DD-0020
superseded_by: none
---

# DD-0027: Fixed-viewport site layout and keyboard flow

## Context

The product is a focused exercise rather than a document. Page and nested
scrolling make controls, feedback, maps, and the quiz chooser harder to reach,
especially on compact windows.

## Decision

All Geoquiz states use a fixed viewport with no document, app-shell, dialog, or
nested scrolling at the supported desktop and mobile sizes. This includes
active, setup, reveal, acknowledgement, completion, loading, Not Found, and
the DD-0019 native quiz-menu dialog. Required content fits through responsive
reflow, `minmax(0, …)`, compact spacing, and capped decorative media; it is not
made to fit by zooming, transform scaling, hidden required controls, clipping,
or a scrollable substitute.

DD-0020's hierarchy, desktop two-column study composition, native forms, and
keyboard-focus contracts remain in force. Capital dots and Shape neighbours are
also explicitly within this site-wide viewport invariant.

## Acceptance criteria

- At 1440×900 and 390×844, document, shell, dialog, and nested surfaces have
  no horizontal or vertical scroll range in every supported route and state.
- Every setup, answer, reveal, next, restart, score, source, map, and dialog
  control remains visible, reachable, and operable; maps retain useful nonzero
  dimensions and normal pan/zoom/touch interaction.
- The seven-item native quiz dialog fits as a no-scroll responsive modal with
  a reachable close control and preserves DD-0019 focus semantics.
- Desktop study quizzes retain a calm two-column setup/challenge hierarchy;
  compact views preserve readable inputs and their established focus flow.
- Decorative shapes, flags, and maps may be capped responsively, but required
  prompt text, feedback, actions, answer lists, attribution, and score content
  are not silently hidden or clipped.

## Consequences

Responsive states use denser but still native controls and route-specific media
caps. New surfaces must budget their height before adding content and cannot
introduce a scroll container as an escape hatch.

## Verification

Stylesheet and component tests enforce the no-scroll contract and focus paths.
Direct Chrome MCP review at 1440×900 and 390×844 covers every route, dense
state, dialog, map control, console, and network state before publication.
