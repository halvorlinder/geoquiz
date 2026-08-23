---
id: DD-0018
title: Shape attribution is local and non-disclosing
status: accepted
date: 2026-08-22
applies_to: country silhouettes, boundary attribution, unresolved challenges
supersedes: none
superseded_by: none
---

# DD-0018: Shape attribution is local and non-disclosing

## Context

DD-0017 requires a restrained, visible attribution line wherever a
mixed-licence high-fidelity shape is rendered. Linking that line directly to an
entity-specific upstream record would expose the target code or country during
an unresolved shape challenge. A provider-only credit would also omit licence
and modification details needed by the bundled data sources.

## Decision

Attributed silhouettes show one compact line identifying geoBoundaries and the
applicable short licence label. OpenStreetMap attribution appears only for
records whose pinned upstream source is OpenStreetMap/Wambacher.

The line links to one generic, base-path-safe, locally deployed credits resource
rather than an entity-specific upstream URL. That generated resource records all
25 pinned sources, years, artifacts, revisions, hashes, transformations,
licences, and required source credits. An unresolved challenge must not expose
its target through attribution text, link attributes, or destinations. No new
application route or runtime geography request is introduced.

## Acceptance criteria

- The visible credit remains a single restrained line and includes the exact
  short licence label for the rendered shape.
- Attribution links are local, base-path-safe, and generic across all unresolved
  shape challenges; their DOM attributes contain no target code or country name.
- The deployed credits resource is generated deterministically from the pinned
  override registry and contains full provenance and licence details for the
  exact 25-entity cohort.
- `© OpenStreetMap contributors` is visible only for the 14 pinned
  OpenStreetMap/Wambacher-derived records; Singapore's ODbL record does not show
  an OpenStreetMap credit.
- The credits resource is present in production output without entering the
  eager application bundle.

## Consequences

Licence compliance stays reachable without cluttering quiz cards or revealing
answers. Updating a source, licence, cohort member, or transformation requires
regenerating both the shape dataset and the deployed credits resource.

## Verification

Component tests cover the visible licence labels, conditional OpenStreetMap
credit, local base-path link, and unresolved-challenge DOM non-disclosure.
Generation and data validation compare the credits resource byte-for-byte with
the pinned registry. Production builds confirm that the resource is deployed,
and Chrome review checks wrapping, legibility, network activity, and both
desktop and mobile layouts.
