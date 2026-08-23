---
id: DD-0013
title: Static local GitHub Pages hosting
status: accepted
date: 2026-08-21
applies_to: application architecture, assets, deployment
supersedes: none
superseded_by: none
---

# DD-0013: Static local GitHub Pages hosting

## Context

Geoquiz should be free to host, work as a deterministic study site, and avoid
requiring accounts or runtime external geography services.

## Decision

Geoquiz is a static GitHub Pages project site deployed under `/geoquiz/` with
base-path-safe assets and routes. It has no backend, accounts, secrets, runtime
map tiles, geography APIs, externally hosted map imagery, or runtime quiz-data
requests. Geography, shapes, flag SVGs, aliases, and provenance-required data
are bundled locally. Shared abstractions are introduced only after two concrete
quiz formats demonstrate genuine reuse.

## Acceptance criteria

- Production builds resolve application and asset URLs under `/geoquiz/`.
- The app can run without a backend, account, secret, runtime map tile, or
  runtime geography/data service.
- Quiz data, map geometry, and flag assets are bundled local resources with
  documented provenance where required.
- Runtime network inspection shows no external map, data, or flag-image request.
- New shared infrastructure has at least two concrete quiz consumers.

## Consequences

Live updates require a reviewed source-data change and deployment rather than
silent runtime changes. Local asset and data size must be monitored, with
quiz-level loading used when measurement justifies it.

## Verification

Vite base-path configuration, production builds, policy validators, and asset
tests verify the static package. Required Chrome MCP network inspection and
GitHub Pages deployment checks are the final runtime and hosting gates.
