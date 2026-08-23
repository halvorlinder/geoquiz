---
id: DD-0017
title: High-fidelity microstate silhouettes
status: accepted
date: 2026-08-21
applies_to: country silhouettes, microstate geometry, boundary attribution
supersedes: none
superseded_by: none
---

# DD-0017: High-fidelity microstate silhouettes

## Context

The globally quantized Natural Earth 50m source reduces some sovereign
microstates to nearly meaningless polygons. Monaco has six distinct source
vertices and Vatican City has five; the bundled 10m topology does not reliably
solve the problem and makes Vatican City degenerate. These silhouettes are
shown large enough in several quizzes and in the desktop Practice recap for the
loss of identity to be obvious.

## Decision

Geoquiz maintains an explicit high-fidelity cohort containing the 25 sovereign
study entities with less than 1,000 square kilometres of land area. Their
display-only silhouettes use version-pinned, locally bundled geoBoundaries 6.0
ADM0 geometry with exact per-entity provenance and licence metadata. Simplified
source artifacts are used when visually faithful; Monaco, Nauru, and Vatican
City retain audited full-source geometry because the published simplified
versions are inadequate.

High-fidelity shapes use per-shape coordinate precision sufficient to preserve
their source geometry. Natural Earth remains the default source for every
entity outside the cohort. High-fidelity overrides remain a separately
identified data layer so their ODbL and attribution obligations do not silently
relicense application code or the independent Natural Earth dataset.

When an attributed override is rendered, its quiz surface shows one restrained,
legible attribution line. Full per-entity source, transformation, and licence
details remain available from that line without repeating them inside every
fact card. The application makes no runtime geography request.

## Acceptance criteria

- The audited cohort is exactly `AND ATG BHR BRB DMA FSM GRD KIR KNA LCA LIE
  MDV MHL MCO MLT NRU PLW SGP SMR STP SYC TON TUV VAT VCT`.
- Every cohort shape has a pinned local source artifact, checksum, source
  identity, checked date, licence, and deterministic generated output.
- Monaco, Nauru, and Vatican City no longer render as coarse wedges, boxes, or
  degenerate rings; no high-fidelity shape loses source vertices to coordinate
  quantization.
- Multi-island entities retain their audited integral components and extent;
  the UI does not fabricate insets or rescale individual islands.
- Attribution is minimal but visible, accessible, and licence-compliant on
  surfaces rendering attributed overrides.
- Shape geometry remains display-only and does not determine neighbour,
  sovereignty, capital, or highest-point answer policy.
- All source data is bundled locally and loaded through existing quiz-level
  lazy boundaries.

## Consequences

The repository carries a separately documented mixed-licence microstate shape
layer, including ODbL share-alike data and required attribution. The application
code remains independently licensed. Geometry-source updates require a new
audit rather than an unreviewed download or blanket resolution switch.

The 1,000-square-kilometre cutoff is a fidelity cohort boundary, not a political
classification or recognition claim. Entities outside it continue to use the
default source unless a separate audited fidelity decision is made.

## Verification

The source manifest validator locks the cohort, hashes, provenance, licences,
geometry structure, precision, antimeridian safety, and deterministic output.
Pure tests cover decoding, projection, containment, and representative geometry
snapshots. Chrome review inspects every cohort silhouette in the primary shape
surface and representative compact, multi-island, marker, neighbour, and
desktop-recap consumers at the required desktop and mobile viewports, including
attribution, overflow, console, and network activity.
