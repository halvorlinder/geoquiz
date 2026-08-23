---
id: DD-0003
title: Rendered browser review is required for visual acceptance
status: accepted
date: 2026-08-21
applies_to: all user-facing UI, responsive layout, maps
supersedes: none
superseded_by: none
---

# DD-0003: Rendered browser review is required for visual acceptance

## Context

DOM tests and stylesheet inspection can protect semantics and layout intent, but
they cannot establish that a rendered interface is attractive, balanced,
unclipped, or pleasant to use. The rejected compact-header iteration passed its
automated checks while still failing visual review.

## Decision

No user-facing visual or interaction change is complete, approved, or shippable
from source review and automated tests alone. An agent must inspect the rendered
application in the browser requested by the user, at the required desktop and
mobile viewports, and iterate from observed evidence. A substitute browser must
not be used when the user has explicitly required Chrome MCP.

If the requested browser capability is unavailable, implementation may be
prepared, but the task must remain visually unaccepted and the browser gate must
be reported as pending. Agents must not describe a source-only design review as
visual QA.

## Acceptance criteria

- Browser QA covers approximately 1440×900 and 390×844.
- The agent inspects visible hierarchy, spacing, alignment, typography,
  contrast, focus, overflow, and interactive states—not only page load success.
- Map QA also covers pan/zoom, display aids, distant target focusing,
  antimeridian artifacts, resize behavior, console output, and network activity.
- Findings are corrected and re-inspected before the visual change is accepted.
- Handoffs state the exact browser coverage completed and any pending gate.

## Consequences

Automated checks remain mandatory but are not a proxy for taste or rendering.
When Chrome MCP is required but not exposed to the current session, work pauses
at the visual gate until that capability is attached or the user explicitly
approves another browser.

## Verification

Review notes or the implementation handoff must record viewports, states, and
observed results. CI validates that decision records exist and are structurally
sound; it cannot perform this visual judgment itself.
