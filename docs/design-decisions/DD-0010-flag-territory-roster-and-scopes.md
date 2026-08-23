---
id: DD-0010
title: Flag territory roster and scopes
status: accepted
date: 2026-08-21
applies_to: flag dataset, flag quiz, territory filters
supersedes: none
superseded_by: none
---

# DD-0010: Flag territory roster and scopes

## Context

Flag practice benefits from a controlled territory deck, but its membership and
terminology must remain audited and neutral.

## Decision

The flag catalog retains the 197 sovereign-study records and adds a fixed,
audited roster of 38 territories and associated areas. Its scopes are Without
territories (197), With territories (235), and Only territories (38). Each flag
is a bundled local SVG with validated provenance and safety. “Territories and
associated areas” is neutral learning terminology, and the exact roster and
continent allocation live in the flag policy rather than being inferred from
assets or recognition claims.

## Acceptance criteria

- Flag scopes contain exactly 197, 235, and 38 records respectively.
- The 38 additions exactly match the audited roster in `docs/flag-data.md` and
  the catalog policy.
- Every rendered flag is a validated, locally bundled SVG; quiz play makes no
  runtime remote image request.
- Territory labels and continent allocation are neutral study conventions, not
  sovereignty or recognition statements.
- Scope selection occurs before continent filtering and includes the active
  territory scope in the scoreboard key.

## Consequences

Territories are a flag-specific extension and do not expand the sovereign
capital, neighbour, or high-point study roster. Roster additions or removals
need an audited policy, asset, provenance, and validation update.

## Verification

`docs/flag-data.md`, `scripts/flag-catalog-policy.ts`, `scripts/validate-flags.ts`,
and flag-quiz tests verify the exact roster, scope counts, local assets, safety,
and continent-policy counts. `npm run validate:flags` is required for catalog
changes.
