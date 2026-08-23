---
id: DD-0015
title: Practice keeps a one-question-behind answer recap
status: superseded
date: 2026-08-21
applies_to: capital map, practice progression, study facts
supersedes: none
superseded_by: DD-0016
---

# DD-0015: Practice keeps a one-question-behind answer recap

## Context

The Practice answer-information box is intended to support the next question,
not compete with feedback and navigation on the question that was just
resolved. The learner should be able to study the previous answer while working
on the current capital.

## Decision

Capital dots Practice keeps a one-question-behind answer recap. While question
`n + 1` is active, a box directly below its answer input shows the answer facts
for question `n`. When the player resolves and advances from question `n + 1`,
the box is replaced with question `n + 1` facts for the duration of question
`n + 2`.

Both a correct checked answer and an explicit reveal resolve a Practice
question for this purpose. Revealing the current question does not replace the
existing previous-answer recap until the player activates Next capital. The
recap names the previous capital and, for every associated study entity, shows
the canonical country name, locally bundled silhouette and flag, and versioned
highest-point name with elevation when the dataset provides one.

A capital associated with more than one study entity presents a separate,
neutrally labelled fact item for each association rather than selecting one or
combining their facts. The recap is absent on the first question, in Timed mode,
and after restart or an applied setup change. Existing answer feedback and
input/Next focus behavior remain intact.

Fact data and images remain static and base-path safe. The heavier silhouette
and highest-point resources load on demand when a recap first becomes
available, so the default first question does not pay their transfer cost up
front.

## Acceptance criteria

- Question two shows question one's recap directly after the current answer
  input in document order, whether question one was correct or revealed.
- The recap remains question-one content while question two is active,
  including after question two is revealed but before Next capital is used.
- Advancing to question three replaces the recap with question-two content.
- The recap displays the previous capital plus country name, silhouette, local
  flag, and highest point for every associated entity.
- Multi-entity capitals render distinct fact items without implying that one
  association takes precedence.
- The recap is absent on question one, after restart/applied setup changes,
  during completion, and throughout Timed play.
- Existing correct-answer auto-advance, reveal/Next behavior, visible feedback,
  and logical keyboard focus are preserved.
- Recap layouts fit without document or nested scrolling at 1440×900 and
  390×844, while the map retains a useful nonzero study area.
- All fact resources are bundled locally and resolve under `/geoquiz/` without
  external runtime requests.

## Consequences

Practice questions after the first are denser and need a dedicated compact
responsive recap layout. Country silhouettes and highest-point data become an
on-demand Capital dots dependency, but remain outside the initial route payload
until the first resolved answer advances. This recap is a study aid and does
not change capital, entity, flag, highest-point, or recognition policy.

## Verification

Component tests cover the one-question lag, correct and revealed transitions,
replacement timing, restart/Timed absence, multi-entity rendering, local asset
URLs, and focus. Production build output verifies lazy chunking. Chrome MCP
review at 1440×900 and 390×844 verifies hierarchy, useful map height, overflow,
focus, console output, and local-only network activity with the recap visible.
