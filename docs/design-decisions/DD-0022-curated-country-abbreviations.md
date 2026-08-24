---
id: DD-0022
title: Curated country abbreviations are exact-only shared answers
status: accepted
date: 2026-08-24
applies_to: entity catalog, shape-neighbours, flag-country, answer matching
supersedes: none
superseded_by: none
---

# DD-0022: Curated country abbreviations are exact-only shared answers

## Context

Players commonly recall a small set of established country abbreviations. The
same answer must work in sovereign neighbour and flag questions without turning
opaque identifiers, abbreviations, or territory shorthand into broad aliases.

## Decision

The version-2 entity catalog owns a conservative approved English roster:
UAE, BiH, CAR, DRC, FSM, UK, ROK, NZ, PNG, DPRK, KSA, US, USA, and RSA for
their respective study entities. Abbreviations use compact case/diacritic/
punctuation/whitespace-insensitive exact matching, never fuzzy matching. Their
spelling is shared by sovereign neighbour and flag quizzes; territory aliases
remain flag-catalog data. Entity codes remain identifiers unless a value appears
in this approved abbreviation field.

## Acceptance criteria

- Every approved compact or punctuated/spaced form resolves only to its one
  intended sovereign entity.
- Abbreviation typos and non-curated entity codes do not resolve as answers.
- Timed flag input waits for explicit Enter where UK prefixes Ukraine or US
  prefixes USVI; other unambiguous exact abbreviations may auto-advance.
- Ordinary names and aliases retain the matching and prefix safeguards in
  DD-0012 and DD-0004.

## Consequences

The product intentionally excludes general ISO-code support, disputed or broad
shortforms, informal directional shorthand, obsolete initialisms, and additional
territory shorthand. New abbreviations require evidence, ownership/collision
checks, and data-policy review rather than component-local exceptions.

## Verification

`src/core/entityCatalogValidation.ts`, `src/core/entityAnswerMatching.test.ts`,
`src/quizzes/flag-country/flagCountry.test.ts`, unresolved-DOM component tests,
`npm run validate:data`, and `npm run validate:flags` verify roster ownership,
compact exact matching, timed prefix safety, and local shared data use.
