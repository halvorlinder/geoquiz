---
id: DD-0024
title: Country-border image quiz
status: superseded
date: 2026-08-24
applies_to: quiz menu, border image quiz, local border geometry, answer interaction
supersedes: none
superseded_by: DD-0025
---

# DD-0024: Country-border image quiz

## Context

Players need a visual way to study the curated land-neighbour roster without
turning display geometry into answer policy or exposing a Hard challenge’s
answer through labels or attribution.

## Decision

Country borders is a lazy menu route at `#/border-countries`. Easy names one
known country, shows its north-up silhouette with one selected continuous land
border run, and asks for the other country. Hard shows only that run and
accumulates both country answers in either order. Both modes use every one of
the 317 curated neighbour pairs exactly once per run. Easy orientation is a
versioned seeded deck choice; a continent-constrained Easy card names a country
in that continent, while Hard includes borders touching the selected continent.

Geometry remains display-only. The existing local shape topology supplies 308
pairs; nine audited Overture/OSM records supply exact override lines and their
matching Easy silhouettes. Botswana–Zambia remains included with a truthful
whole-country locator and magnified exact inset. A single local source link is
the only visible attribution during play.

## Acceptance criteria

- Easy and Hard each contain 317 unordered-pair questions under All.
- Hard challenge markup, labels, and accessible names do not disclose either
  unresolved country.
- Native controls support keyboard-only setup, answer entry, chips, reveal,
  next, and restart; feedback is announced without colour alone.
- Rendering is local, north-up, unrotated, and uses an exact highlighted run.
- The BWA–ZMB Easy card retains its whole-country silhouette and exact inset.

## Consequences

The quiz has a small lazy local geometry payload and an ODbL source offer. It
does not change the neighbour-policy dataset, global country silhouettes, or
other quiz displays. Spain–Morocco renders the selected Melilla visual run,
not a statement that every component or legal boundary is shown.

## Verification

`scripts/validate-border-lines.ts`, border deck and interaction tests, the
design validator, production build inspection, and required direct Chrome MCP
desktop/mobile visual and network QA verify the feature. Chrome QA is pending
until integration review.
