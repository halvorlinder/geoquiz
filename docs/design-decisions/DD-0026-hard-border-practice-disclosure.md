---
id: DD-0026
title: Hard border Practice progressive disclosure
status: accepted
date: 2026-08-25
applies_to: border image quiz, Easy and Hard border rendering, local map interaction, Practice disclosure
supersedes: DD-0025
superseded_by: none
---

# DD-0026: Hard border Practice progressive disclosure

## Context

The line-only Hard challenge is appropriate before an answer is known, but a
Practice response should become a geographic learning aid as each endpoint is
earned or deliberately revealed.

## Decision

DD-0025's Easy contracts are carried forward in full: Country borders remains
a lazy modal-menu route; `neighbours.json` remains its sole answer-policy
authority; Easy and Hard All decks retain all 317 unordered land-neighbour
pairs once; continent eligibility, seeded Easy orientation, score identity,
matching policy, local source link, and the current hybrid topology/overrides
remain unchanged. Easy continues to start with only its named known country and
the exact selected run, uses the deterministic border-only frame for initial,
feedback, restart, and Recenter fits, and mounts an answer shape only after
resolution. Its tile-free Leaflet map remains keyboard/touch pannable and
zoomable, layer-noninteractive, antimeridian-safe, reduced-motion-aware, and
free of runtime tile, API, fetch, snapping, or invented geometry. The nine
audited override pairs, BWA–ZMB, Melilla display policy, local ODbL source
offer, native controls, live feedback, Practice/Timed matching semantics, and
unresolved Easy non-disclosure also remain unchanged.

Hard Practice begins with the same isolated, north-up exact-run SVG and no map
DOM. After a correct endpoint or a deliberate disclosure, it replaces that
line-only display with the same local, tile-free border context map and renders
only the already disclosed countries. Correct countries use the correct
treatment; deliberately disclosed countries use the revealed treatment. The
selected exact run remains visible.

Hard Practice provides one native `Reveal one country` action. It reveals one
unresolved endpoint in stable deck order when neither is known, or the remaining
endpoint when one is correct; it is unavailable after use or completion. `Reveal
answers` discloses all remaining endpoints. Any deliberate disclosure makes the
card ineligible for a fully-correct Practice result. Hard Timed stays line-only
and never mounts a map.

## Acceptance criteria

- Initial and unresolved Hard markup discloses neither endpoint and mounts no
  map; Hard Timed remains line-only throughout.
- Each correct or revealed Hard endpoint appears in its true local geometry
  only after disclosure. No undisclosed identity, shape, alias, abbreviation,
  code, layer property, accessible name, URL, or map descriptor is computed or
  exposed.
- `Reveal one country` is exact-once, deterministic from blank, reveals the
  remaining endpoint after one correct answer, and leaves keyboard focus in an
  unresolved input unless the pair is complete.
- Full reveal and a fully correct Hard Practice pair render both countries;
  chips/text distinguish correct from revealed without relying on colour.
- Existing Easy deck, matching, geometry, source-offer, refit, and local-only
  map contracts remain unchanged.

## Consequences

The border context map is a narrow display component that receives only
already-disclosed country descriptors. It cannot derive an endpoint from a
question. Practice gains a useful spatial aid without weakening Timed recall or
the unresolved disclosure boundary.

## Verification

Pure Hard state-transition tests, border component disclosure tests, map
semantic tests, production build checks, and direct Chrome MCP review at the
required desktop and mobile viewports verify this decision.
