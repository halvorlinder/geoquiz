---
id: DD-0011
title: Capital-map presentation and navigation
status: accepted
date: 2026-08-21
applies_to: capital map, practice aids, map interaction
supersedes: none
superseded_by: none
---

# DD-0011: Capital-map presentation and navigation

## Context

The capital quiz needs to preserve the dots-only challenge while allowing
optional study context and clear geographic orientation during a changing run.

## Decision

Capital dots presents locally bundled capital dots on no remote basemap by
default. Country outlines and capital names are independent Practice-only study
aids, both Off initially. The map remains pannable and zoomable. Each new target
automatically focuses and zooms to its region with responsive context, while
the optional outline geometry is antimeridian-safe. Changing either display aid
must preserve the active run, question, typed answer, score, shuffled deck, and
map viewport.

## Acceptance criteria

- Dots-only presentation is the default, with no remote tiles, coastlines,
  labels, or borders shown until an approved aid is enabled.
- Country outlines and capital names are independent, visible Practice toggles
  and each defaults Off.
- The map supports mouse, keyboard, touch, trackpad, and pinch pan/zoom.
- Every new target receives automatic responsive focus; reduced-motion behavior
  avoids animated movement.
- Outline geometry has no rendered longitude jump over 180 degrees.
- Toggling either aid does not reset quiz, answer, score, deck, or viewport.

## Consequences

Outlines remain study context rather than political statements, and map geometry
is bundled display data rather than answer policy. This record complements the
landing and viewport-composition decisions without replacing their routing or
layout requirements.

## Verification

`src/quizzes/capital-map/CapitalMap.semantics.test.tsx`, map viewport and
boundary tests, and `docs/map-boundaries.md` cover aid defaults, independent
toggle semantics, outline layering, target focusing, no extra toggle refocus,
and Leaflet resize integration. Full preservation of run, question, answer,
score, deck, and viewport across both toggles remains required Chrome MCP and
integration verification, currently pending, alongside rendering, distant focus,
controls, antimeridian artifacts, console, and network activity.
