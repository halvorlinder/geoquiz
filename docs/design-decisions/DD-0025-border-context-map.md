---
id: DD-0025
title: Easy border context map
status: superseded
date: 2026-08-24
applies_to: border image quiz, Easy border rendering, local map interaction
supersedes: DD-0024
superseded_by: DD-0026
---

# DD-0025: Easy border context map

## Context

Players need a visual way to study the curated land-neighbour roster without
turning display geometry into answer policy or exposing a Hard challenge’s
answer through labels, data, attribution, or map layers. Easy benefits from
local border context, but that context must stay deterministic, local, and
truthful for both ordinary and microstate borders.

## Decision

Country borders is a lazy modal-menu route at `#/border-countries`. It uses the
curated `neighbours.json` roster as the sole answer-policy authority: Easy and
Hard each contain all 317 unordered land-neighbour pairs exactly once per All
run. Geometry is display-only and cannot create an answer.

Easy chooses one known side per pair from a versioned seeded orientation policy.
For a continent deck, the known side is in that continent; when both sides are
eligible the injected runtime RNG chooses. Its score identity includes quiz,
continent, difficulty, orientation version, and border data version, but not a
particular seed. Easy uses an issue-local, tile-free React-Leaflet context map:
the named known country and exact selected run appear initially. A fixed,
deterministic border-only frame contains the entire run without union-fitting
the silhouette and is used for initial fit, feedback refit, same-card restart,
and the visible Recenter shared border action.

Practice mounts answer geometry only after resolution: correct is solid green
in its true position; reveal is dashed red and provides answer text. Timed
advances before answer geometry is mounted and retains its separate text
acknowledgement. Hard remains an isolated north-up SVG exact run, with no map
DOM. It includes a pair when either endpoint touches the selected continent and
uses the visible `Borders touching that continent.` setup copy. One accumulating
native input accepts the two answers in either order, records the first as a
chip, and clears/refocuses it for the second.

Practice and Timed retain the existing quiz/session policy: Practice supports
explicit check, fuzzy matching, reveal, next, and focus progression; Timed only
auto-resolves exact canonical names, aliases, and curated entity-catalog-v2
abbreviations. Partial, fuzzy, ambiguous, and arbitrary codes do not advance.

The current local topology supplies 308 pairs. The nine audited pair-scoped
Overture Divisions `2026-08-19.0` / OSM snapshot `2026-07-23` overrides supply
exact selected lines and matching Easy shapes for `AND–ESP`, `AND–FRA`,
`AUT–LIE`, `BWA–ZMB`, `CHE–LIE`, `ESP–MAR`, `FRA–MCO`, `ITA–SMR`, and
`ITA–VAT`. Spain–Morocco renders the audited Melilla selected visual run, not a
claim to show a complete legal boundary. All data are bundled, deterministic,
and local: there are no tiles, runtime fetches, APIs, snapping, or invented
geometry. The single generic local Border data sources link carries the source
offer/licensing detail without cluttering play.

## Acceptance criteria

- The route is lazy from the quiz menu; Easy and Hard All decks each have 317
  unordered pairs, preserve the versioned orientation/score identity, and use
  the current neighbour matching authority.
- The Easy map is local, keyboard-pannable/zoomable, noninteractive by layer,
  and makes no runtime map-data request. Hard never mounts map DOM.
- Its selected-run frame is finite, antimeridian-safe, and stable across answer
  feedback and restart, with a mechanically checked local screen-space floor.
- Easy uses the source-matched current or Overture silhouette for both known
  and resolved answer geometry; the selected run is exact and north-up.
- Refit and answer-layer entry respect reduced motion. The map is named only
  for the disclosed known country; unresolved answer geometry and identity do
  not exist in markup, accessible names, or map-layer properties.
- Unresolved Easy markup exposes only the known country; unresolved Hard
  exposes neither answer entity.
- Native setup/input controls, live feedback, chips, reveal/next/restart, and
  Timed acknowledgement preserve keyboard-only use and logical focus.
- The visible play surface contains only the generic local source link; the
  local source offer documents the relevant ODbL provenance and licence.

## Consequences

The old Easy silhouette locator/inset presentation is retired. Existing hybrid
local/Overture geometry, the answer-policy dataset, other quiz visuals, and
the single source link remain unchanged.

## Verification

Viewport, map rendering, disclosure, timed/practice interaction, data, build,
and direct Chrome MCP QA cover this replacement.
