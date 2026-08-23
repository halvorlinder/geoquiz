---
id: DD-0012
title: Answer matching safety
status: accepted
date: 2026-08-21
applies_to: answer matching, aliases, timed input
supersedes: none
superseded_by: none
---

# DD-0012: Answer matching safety

## Context

Answers should forgive small spelling slips without accepting a known answer for
a different place, entity, or flag, or advancing while a longer answer is typed.

## Decision

Matching normalizes Unicode diacritics, case, punctuation, and repeated
whitespace. Canonical names and curated aliases define legitimate variants;
controlled Damerau-Levenshtein tolerance is length-based. Exact known answers
for another target are rejected before fuzzy matching, except when highest-point
records deliberately share a declared physical-answer identity through
`sharedFeatureId`. Fuzzy matching must resolve safely to one target. Timed
auto-advance never accepts unresolved partial, fuzzy, or ambiguous input. In
multi-answer neighbour questions, an exact currently required entity can resolve
even if it prefixes another entity, while a short known non-neighbour prefix of
a required longer entity stays unresolved. An exact flag answer that prefixes
another catalog answer requires explicit exact submission. Datasets, not
components, own canonical names and aliases.

## Acceptance criteria

- Equivalent case, diacritic, punctuation, and whitespace forms match.
- Curated aliases and only controlled length-based typos are accepted.
- A canonical name or alias for another known target never answers the current
  target, except deliberately shared highest-point records with the same
  declared `sharedFeatureId`.
- Fuzzy candidates with more than one possible target are rejected.
- Timed input never auto-advances unresolved partial, fuzzy, or ambiguous input.
- A currently required exact neighbour answer may resolve immediately, but a
  shorter known non-neighbour prefix of a missing longer answer remains
  unresolved; exact prefix-safe flag targets use explicit exact submission.
- Cross-target collision tests cover the complete relevant answer corpus.

## Consequences

Answer convenience cannot be added through broad similarity or country-name
aliases. New aliases require dataset review and collision tests, especially when
they introduce a prefix or transliteration overlap.

## Verification

`src/core/answerMatching.test.ts`, `src/core/entityAnswerMatching.test.ts`,
`src/quizzes/shape-high-point/highPointAnswerMatching.test.ts`, flag matching
tests, and capital collision coverage exercise normalization, typos, competing
answers, shared physical features, and prefix handling. Data validation retains
canonical and alias integrity.
