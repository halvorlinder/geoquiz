---
id: DD-0028
title: Complete multi-run border sections
status: accepted
date: 2026-08-25
applies_to: border image quiz, local border geometry, Easy and Hard border rendering, Practice disclosure
supersedes: DD-0026
superseded_by: none
---

# DD-0028: Complete multi-run border sections

## Context

Some curated land-neighbour pairs have more than one independent exact shared
border section. Showing only one conceals valid local geography; joining them
would fabricate a border that does not exist.

## Decision

DD-0026, DD-0025, and DD-0024 contracts remain in force unless this record
explicitly replaces them: Country borders remains a lazy, static local route;
`neighbours.json` remains the sole answer-policy authority; Easy and Hard keep
exactly one question and one Practice/Timed score identity for each of the 317
curated unordered pairs; continent eligibility, seeded Easy orientation,
matching, disclosure, native focus/live-feedback, source offer, nine audited
overrides, BWA–ZMB, neutral/non-legal source policy, reduced motion, no-runtime-network, and
unresolved identity/geometry non-disclosure remain unchanged.

This replaces DD-0026's selected-single-run presentation, including its
ESP–MAR Melilla-only display rule: v2 displays every exact independent run,
so ESP–MAR includes both Melilla and Ceuta. This display correction does not
make a legal-border claim; the historical v1 artifact remains Melilla-only and
byte-identical for reproducibility.

The border display-data version and associated score-storage version are bumped
with v2, while the score meaning and scope remain exactly one Practice or Timed
result per curated unordered pair.

The display dataset v2 records every independent exact shared run for each
pair, ordered by descending geodesic length then a canonical
orientation-independent coordinate key. It retains no threshold and never
creates a connector. The historical v1 artifact remains byte-identical.

Hard unresolved and Hard Timed remain country-free and map-free. They retain
one existing visual panel and one SVG: every unconnected run shares one
north-up union geographic transform (maximum four), preserving true relative
position, distance, and scale while empty geographic space remains whitespace.
A visible and accessible generic section count is retained; no run is called
primary or secondary. Easy and disclosed Hard mount every exact run as a property-free
GeoJSON MultiLineString in true geographic position and initially fit their
union. For multiple runs, compact native map controls provide `Focus next
section` and `Show all sections`; focusing cycles in deterministic dataset order
without unmounting any run. A single run retains `Recenter shared border`.

## Acceptance criteria

- The v2 registry contains all 317 pairs, 352 runs, and 27 multi-run pairs;
  every run is finite, nondegenerate, antimeridian-safe, ordered, and exactly
  contained by both applicable local source-matched shapes.
- Easy orientation, question IDs, continent decks, matching, Timed behavior,
  score scope, and source provenance remain unchanged despite v2 display data.
- Unresolved Hard exposes neither endpoint identity nor endpoint geometry and
  mounts no map; its one SVG contains only exact unconnected stimulus subpaths
  under one shared union transform, never boxes, captions, numbering, connectors,
  or independent fit/rearrangement.
- Easy and disclosed Hard mount all runs in property-free MultiLineString form,
  union-fit initially/refit/recenter, retain normal map pan/zoom/touch, and
  offer the generic multi-section controls without increasing the fixed-height
  map budget or hiding required controls.
- Supported 1440×900 and 390×844 layouts retain DD-0027’s no-scroll invariant.

## Consequences

Border display data grows modestly while the answer-policy graph, dependencies,
runtime network boundary, and quiz scoring remain unchanged. Direct Chrome MCP
review remains required for the shared-transform line panel, multi-section map controls, focus,
overflow, pan/zoom, console, and local-only network behavior.

## Verification

Generator/validator registry and provenance locks, geometry containment and
ordering tests, shared-transform line-panel and context-map component tests, disclosure audits,
production stripping checks, build validation, and required Chrome MCP desktop
and mobile review verify this record.
