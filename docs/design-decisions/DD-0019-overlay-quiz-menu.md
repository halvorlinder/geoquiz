---
id: DD-0019
title: Overlay quiz menu retains the active exercise
status: superseded
date: 2026-08-24
applies_to: app shell, routing, quiz navigation, responsive layout
supersedes: DD-0001
superseded_by: DD-0029
---

# DD-0019: Overlay quiz menu retains the active exercise

## Context

Geoquiz has several focused exercises, but navigating between them should not
replace the player’s active exercise with a separate chooser page. The landing
experience must remain immediate and compatible with existing capital-map links.

## Decision

The root hash route `#/` opens Capital dots directly in its default Practice
mode. The legacy `#/capital-map` route continues to open the same Capital dots
implementation. `All quizzes` opens an accessible native dialog over the
currently mounted quiz without changing the hash or resetting that quiz. The
dialog is the only quiz chooser. The former `#/quizzes` URL is retained as a
compatible entry point: it is replaced with `#/` and opens that dialog over
Capital dots without creating an extra history entry.

## Acceptance criteria

- Empty hash, `#`, and `#/` render Capital dots in Practice mode, and
  `#/capital-map` remains an equivalent deep link.
- `All quizzes` is a native button that opens a labelled native dialog without
  unmounting, resetting, or changing the route of the active quiz.
- The dialog has a visible close control, Escape cancellation, backdrop-only
  click cancellation, native modal focus containment, and opener-focus
  restoration. The current quiz is marked.
- Choosing the current quiz only closes the dialog; choosing another quiz
  closes it and navigates to that quiz’s existing hash route.
- Desktop presents a restrained centered menu grid. Narrow layouts use a clean,
  no-horizontal-overflow sheet with a reachable close control.
- `#/quizzes` canonicalizes to `#/` with replacement semantics, opens the menu
  once over Capital dots, and does not trap Browser Back/Forward history.
- Unknown hashes retain a recoverable Not Found state with access to the dialog,
  not a standalone chooser page. Static menu metadata must not eagerly load all
  lazy quiz modules.

## Consequences

Opening the menu is reversible and preserves in-progress work until a different
exercise is selected. Direct links remain simple hashes for static GitHub Pages.
The former standalone chooser route is no longer a presentation surface.

## Verification

Application and route tests cover dialog state, selection, focus restoration,
route preservation, and legacy canonicalization. Rendered Chrome review at
desktop and mobile viewports remains required before publication.
