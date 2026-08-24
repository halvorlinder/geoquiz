# Design decision records

This directory is the authoritative product-design memory for Geoquiz. It
captures durable user-facing decisions separately from implementation details,
chat history, screenshots, and temporary experiments.

## Record lifecycle

Each decision has a permanent `DD-NNNN` identifier and one Markdown file. IDs
are allocated above the highest historical ID and are never reused or deleted;
gaps are allowed but lower IDs are never backfilled.

- `proposed`: under consideration; implementation must not treat it as settled.
- `accepted`: current product direction.
- `rejected`: considered and explicitly declined.
- `superseded`: replaced by another decision; both records remain for history.

An accepted decision is historical evidence. Its identity, Decision, Acceptance
criteria, and Consequences are immutable. If its outcome changes, add a new
record that names the old ID in `supersedes`, then mark the old record
`superseded` and point `superseded_by` at the replacement. Context and
Verification notes may be amended in place only when they do not change the
outcome.

## Agent workflow

Before changing UI, interaction, responsive layout, navigation, or visual
language, every implementing agent must:

1. Read this index and every record whose `applies_to` overlaps the task.
2. Treat accepted records as requirements, not suggestions.
3. Record a new explicit user design decision before, or in the same patch as,
   its implementation. Do not rely on conversation history as the only record.
4. Supersede conflicting decisions instead of silently rewriting history.
5. Keep code, tests, README guidance, and decision records consistent.
6. Run `npm run validate:design` before handing work off.

Workers may document decisions already fixed by the user or root orchestrator;
they must not invent product direction. Ambiguous or conflicting direction is a
root-level decision. Reviewers must report missing, stale, contradictory, or
unverified records as concrete findings.

## Required format

Copy [TEMPLATE.md](TEMPLATE.md). The validator requires the metadata fields and
the Context, Decision, Acceptance criteria, Consequences, and Verification
sections. Keep records focused on one stable decision family. Link exact routes,
components, tests, or screenshots when that makes the decision verifiable, but
paraphrase user direction rather than copying private conversation.

## Index

| ID | Decision | Status | Applies to |
| --- | --- | --- | --- |
| [DD-0001](DD-0001-capital-dots-landing.md) | Capital dots is the landing experience | superseded | app shell, routing, capital map |
| [DD-0002](DD-0002-capital-map-viewport-composition.md) | Capital-map viewport composition | accepted | capital map, responsive layout, run setup |
| [DD-0003](DD-0003-rendered-browser-design-review.md) | Rendered browser review is required for visual acceptance | accepted | all user-facing UI, responsive layout, maps |
| [DD-0004](DD-0004-practice-and-timed-session-behavior.md) | Practice and timed session behavior | accepted | shared session behavior, quiz interaction, answer feedback |
| [DD-0005](DD-0005-study-roster-and-continent-filters.md) | Study roster and continent filters | accepted | entity catalog, question filters, quiz setup |
| [DD-0006](DD-0006-local-scoreboard-scope.md) | Local scoreboard scope | accepted | scoreboards, timed sessions, browser storage |
| [DD-0007](DD-0007-role-labelled-multiple-capital-questions.md) | Role-labelled multiple-capital questions | accepted | country-capital quiz, entity catalog, answer inputs |
| [DD-0008](DD-0008-land-neighbour-question-scope.md) | Land-neighbour question scope | accepted | neighbour dataset, shape-neighbours quiz, study policy |
| [DD-0009](DD-0009-highest-point-study-scope.md) | Highest-point study scope | accepted | high-point dataset, shape-high-point quiz, marker rendering |
| [DD-0010](DD-0010-flag-territory-roster-and-scopes.md) | Flag territory roster and scopes | accepted | flag dataset, flag quiz, territory filters |
| [DD-0011](DD-0011-capital-map-presentation-and-navigation.md) | Capital-map presentation and navigation | accepted | capital map, practice aids, map interaction |
| [DD-0012](DD-0012-answer-matching-safety.md) | Answer matching safety | accepted | answer matching, aliases, timed input |
| [DD-0013](DD-0013-static-local-github-pages-hosting.md) | Static local GitHub Pages hosting | accepted | application architecture, assets, deployment |
| [DD-0014](DD-0014-practice-reveal-country-facts.md) | Practice reveals include country facts | superseded | capital map, practice reveal, study facts |
| [DD-0015](DD-0015-practice-previous-answer-recap.md) | Practice keeps a one-question-behind answer recap | superseded | capital map, practice progression, study facts |
| [DD-0016](DD-0016-desktop-only-practice-answer-recap.md) | Practice answer recap is desktop-only | accepted | capital map, desktop practice, study facts |
| [DD-0017](DD-0017-high-fidelity-microstate-silhouettes.md) | High-fidelity microstate silhouettes | accepted | country silhouettes, microstate geometry, boundary attribution |
| [DD-0018](DD-0018-non-disclosing-shape-attribution.md) | Shape attribution is local and non-disclosing | accepted | country silhouettes, boundary attribution, unresolved challenges |
| [DD-0019](DD-0019-overlay-quiz-menu.md) | Overlay quiz menu retains the active exercise | accepted | app shell, routing, quiz navigation, responsive layout |
| [DD-0020](DD-0020-study-quiz-layout-and-keyboard-flow.md) | Study quiz layout and keyboard flow | accepted | country-capital, shape-capital, shape-high-point, flag-country, responsive layout, keyboard interaction |
| [DD-0021](DD-0021-progressive-neighbour-map.md) | Practice progressively builds a target-focused neighbour map | accepted | shape-neighbours quiz, practice aids, country-shape map rendering, responsive map viewport |
| [DD-0022](DD-0022-curated-country-abbreviations.md) | Curated country abbreviations are exact-only shared answers | accepted | entity catalog, shape-neighbours, flag-country, answer matching |
| [DD-0024](DD-0024-border-image-quiz.md) | Country-border image quiz | superseded | quiz menu, border image quiz, local border geometry, answer interaction |
| [DD-0025](DD-0025-border-context-map.md) | Easy border context map | accepted | border image quiz, Easy border rendering, local map interaction |
