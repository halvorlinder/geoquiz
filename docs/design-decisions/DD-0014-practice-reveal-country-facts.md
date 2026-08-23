---
id: DD-0014
title: Practice reveals include country facts
status: superseded
date: 2026-08-21
applies_to: capital map, practice reveal, study facts
supersedes: none
superseded_by: DD-0016
---

# DD-0014: Practice reveals include country facts

## Context

Revealing a capital in Practice mode should turn a missed question into a
compact learning moment. A capital name alone does not connect the answer to
the country's shape, flag, or physical geography.

## Decision

After the player explicitly reveals a Capital dots answer in Practice mode, an
answer-information box appears directly below the answer input and before the
Next capital action. It names the revealed capital and, for every associated
study entity, shows the canonical country name, locally bundled silhouette and
flag, and versioned highest-point name with elevation when the dataset provides
one.

A capital associated with more than one study entity presents a separate,
neutrally labelled fact item for each association rather than selecting one or
combining their facts. The box is not shown for unresolved questions, ordinary
correct-answer auto-advance, or Timed mode, and it clears when the player
advances or restarts. The existing Next-capital focus flow remains intact.

Fact data and images remain static and base-path safe. The heavier silhouette
and highest-point resources load on demand when the first Practice answer is
revealed so the default Capital dots challenge does not pay their transfer cost
up front.

## Acceptance criteria

- An explicit Practice reveal places the information box immediately after the
  answer input in document order.
- The box displays the capital plus country name, silhouette, local flag, and
  highest point for every entity associated with the capital.
- Multi-entity capitals render distinct fact items without implying that one
  association takes precedence.
- The box is absent before reveal, after Next/restart, and throughout Timed
  play; a correct Practice answer keeps its existing auto-advance behavior.
- The Next capital action receives and retains logical keyboard focus after a
  reveal, and visual content has useful accessible names.
- Revealed layouts fit without document or nested scrolling at 1440×900 and
  390×844, while the map retains a useful nonzero study area.
- All fact resources are bundled locally and resolve under `/geoquiz/` without
  external runtime requests.

## Consequences

Practice reveal states are denser than unanswered states and need a dedicated
compact responsive layout. Country silhouettes and highest-point data become
an on-demand Capital dots dependency, but remain outside the initial route
payload until a reveal. This card is a study aid and does not change capital,
entity, flag, highest-point, or recognition policy.

## Verification

Component tests cover placement, visibility lifetime, multi-entity rendering,
local asset URLs, and focus. Production build output verifies lazy chunking.
Chrome MCP review at 1440×900 and 390×844 verifies visual hierarchy, useful map
height, overflow, keyboard focus, console output, and local-only network
activity in the revealed state.
