---
id: DD-0016
title: Practice answer recap is desktop-only
status: accepted
date: 2026-08-21
applies_to: capital map, desktop practice, study facts
supersedes: DD-0014, DD-0015
superseded_by: none
---

# DD-0016: Practice answer recap is desktop-only

## Context

The one-question-behind Practice recap adds valuable study context on a
full-size web layout, but its silhouettes, flags, and fact rows compete with the
map and current answer controls on compact and mobile screens.

## Decision

Capital dots shows the one-question-behind Practice recap only in a full-size
web window, using the established desktop breakpoint of at least 1200 CSS
pixels. While question `n + 1` is active at that size, the recap below the
current answer interaction shows question `n`; advancing to question `n + 2`
replaces it with question `n + 1`.

Both a correct checked answer and an explicit Reveal followed by Next resolve a
Practice question for the recap. Revealing the current question before Next
does not replace the older recap. Each associated study entity receives its own
neutral fact item containing canonical country name, locally bundled
silhouette and flag, the previous capital, and its versioned highest point with
elevation when available.

Below 1200 CSS pixels, the recap is not rendered. Compact and mobile clients do
not load its lazy component, silhouette data, highest-point data, or flag asset.
The remembered previous answer may remain in session state so resizing back to
a full-size window restores the appropriate current recap without changing the
quiz.

The recap is also absent on the first question, in Timed mode, during
completion, and after restart or an applied setup change. Existing feedback,
input focus, Next focus, map behavior, and responsive compact layouts remain
unchanged.

## Acceptance criteria

- At 1440×900, question two shows question one's recap beneath the current
  answer interaction after either correct auto-advance or Reveal followed by
  Next.
- Revealing question two retains question-one facts until Next; question three
  then shows question-two facts.
- The recap displays the previous capital plus country name, silhouette, local
  flag, and highest point for every associated entity; Jerusalem shows distinct
  Israel and State of Palestine fact items.
- At 1199 CSS pixels and below, no recap markup is present and no recap-specific
  component, silhouette, highest-point, or flag resource is requested.
- The recap is absent on question one, after restart/applied setup changes,
  during completion, and throughout Timed play.
- Existing correct-answer auto-advance, reveal/Next behavior, visible feedback,
  map state, and logical keyboard focus are preserved.
- The 1440×900 desktop view has no document or nested scrolling, retains at
  least 765px for the map-and-answer region, and presents fact text readably.
- All recap resources are bundled locally and resolve under `/geoquiz/` without
  external runtime requests.

## Consequences

The recap is a desktop study enhancement rather than a universal responsive
feature. Compact and mobile Capital dots retain their existing map and answer
allocation. The desktop answer column may widen while the recap is visible, but
the map must remain the dominant study surface. Local silhouette and
highest-point bundles become an on-demand desktop dependency only.

## Verification

Component tests cover breakpoint-gated rendering and loading, one-question
lag, replacement timing, correct and reveal flows, restart/Timed absence,
multi-entity facts, local assets, and focus. Production build output verifies
lazy chunking. Chrome MCP review covers recap states at 1440×900 and confirms
absence and unchanged layout at 1199px and 390×844, including overflow, console,
and network inspection.
