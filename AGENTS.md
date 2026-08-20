# AGENTS.md

These instructions apply to the entire repository.

## Product intent

Geoquiz is a static collection of focused geography-learning games. The current
quiz asks the player to identify a highlighted world capital from its position.
Future quiz formats may use flags, images, or trivia, but they should share only
genuinely reusable infrastructure.

Keep the application deployable as a static GitHub Pages site. Do not introduce
a backend, accounts, secrets, runtime geography APIs, map tiles, or externally
hosted map imagery unless the user explicitly changes that product boundary.

## Architecture

- The frontend uses React, TypeScript, Vite, Leaflet, and React-Leaflet.
- Keep reusable, framework-light quiz logic in `src/core/`.
- Keep capital-map-specific components and behavior in
  `src/quizzes/capital-map/`.
- Keep geography used by the application bundled locally and deterministic.
- The production base path is `/geoquiz/`; do not break project-site asset URLs.
- Do not commit `node_modules/`, `dist/`, coverage output, or local editor files.
- Prefer small, justified dependencies. Report meaningful bundle-size changes.

Do not prematurely build a generic quiz framework. Add an abstraction only when
at least two concrete quiz formats need it.

## Capital-map invariants

- The dots-only challenge remains the default presentation.
- Country outlines are optional and default to Off.
- Outlines are line-only, non-interactive, and rendered behind every capital dot
  and the target halo.
- Boundary geometry must be bundled locally. It must not contain rendered line
  segments whose longitude jump exceeds 180 degrees; split antimeridian
  crossings before giving geometry to Leaflet.
- A new question should automatically focus the target region. Compact screens
  should retain wider context than desktop screens.
- Respect `prefers-reduced-motion`; use an immediate view change when motion is
  reduced.
- Changing the outline toggle must not reset the current question, answer,
  score, map viewport, or shuffled deck.
- Keep the map pannable and zoomable with mouse, trackpad, keyboard, and touch.
- Do not add borders, coastlines, labels, or other hints to the default Off mode.
- Treat map boundaries as study context, not statements about recognition,
  sovereignty, or disputed territory.

## Answer matching

- Normalize case, Unicode diacritics, punctuation, and repeated whitespace.
- Use curated aliases for legitimate transliterations and spelling variants.
- Permit controlled Damerau-Levenshtein typo tolerance based on answer length.
- Before fuzzy matching, reject an answer that exactly names a different known
  capital or one of its aliases.
- Keep the full cross-capital collision test. A convenience change must never
  make one capital a valid answer for another.

## Geography data

`src/data/capitals.json` is a versioned study dataset, not a live feed. The v1
policy covers 197 study entities, 201 entity-to-capital associations, and 200
unique capital-place questions. Read `docs/capital-data.md` before editing it.

For any capital-data change:

1. Prefer current primary government or intergovernmental sources.
2. Record the source and checked date in the data.
3. Update the documented policy for ambiguous, disputed, or changing cases.
4. Preserve unique identifiers, coordinates, normalized answers, and aliases.
5. Do not use country names as capital-answer aliases.
6. Run the mechanical validator and the full answer-collision test.
7. Change the expected 197/201/200 counts only as a deliberate, documented
   product decision.

Boundary provenance and licensing are documented in `docs/map-boundaries.md`.
Keep that document accurate if geometry, processing, or packages change.

## Accessibility and interaction

- Use native controls where possible.
- Give icon-only or map controls accessible names.
- Switches must expose accurate `role="switch"` and `aria-checked` state, while
  also showing an understandable visible state.
- Preserve visible focus styles and logical keyboard focus after feedback,
  reveal, next-question, completion, and restart actions.
- Announce answer feedback through an appropriate live region.
- Maintain usable layouts at desktop and narrow mobile widths.
- Do not encode meaning using color alone.

## Required commands

Install and run locally:

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

The development URL is `http://127.0.0.1:5173/geoquiz/`.

Before reporting an implementation complete, run:

```sh
npm run lint
npm run validate:data
npm test
npm run build
git diff --check
```

Add focused regression tests for every behavior change. Pure geometry, answer
matching, shuffle, and viewport policies should have pure unit tests; component
tests should verify user-visible state and interaction without merely asserting
implementation details.

## Browser QA

Visual or interactive map changes must be tested locally in the requested Chrome
MCP before shipping. Do not substitute another browser when the user explicitly
requires Chrome, and do not claim browser testing when the capability is absent.

At minimum, test:

- a desktop viewport around 1440 x 900;
- a mobile viewport around 390 x 844;
- outline Off and On states;
- pan and zoom controls;
- advancing between geographically distant questions;
- target centering and responsive zoom context;
- absence of antimeridian or cross-world line artifacts;
- browser console errors; and
- network activity, confirming there are no map tiles or external runtime data
  requests.

If the required browser capability is unavailable, finish safe local work but do
not push, merge, or deploy. Report the exact gate and wait for it to be enabled.

## Git and publication

- Preserve user changes and keep unrelated work out of the diff.
- Use a dedicated worktree based on current `main` for non-trivial changes meant
  for a commit or PR. Quick, explicitly requested in-place documentation tweaks
  are exempt.
- Name agent branches `agent/<short-description>`.
- Inspect status and diffs before staging. Stage only named, intended paths.
- Commit, push, PR creation, merge, and deployment require user authorization.
- Use a draft PR by default unless the user asks otherwise.
- Do not resolve implementation conflicts by modifying the main checkout; use
  the normal PR workflow.
- GitHub Actions must pass before merge. Pages deployment must complete before a
  hosted change is called shipped.
- After merge, fast-forward local `main` and confirm it is clean.

## Orchestration and review

The root agent owns requirements, architecture, data policy, public contracts,
integration judgment, and final verification.

Delegate only when parallelism or context isolation materially helps. Use one
producer at a time for overlapping files. For non-trivial UI, map, geography,
matching, or deployment changes:

1. Have a scoped producer implement the root-approved design.
2. Have an independent reviewer look for concrete correctness, accessibility,
   data, security, regression, and missing-test risks with file/line evidence.
3. Judge each finding in the root thread.
4. Send accepted findings back to the producer.
5. Have the independent reviewer re-review the corrected state.
6. Run the required commands and browser QA from the root thread before
   publishing.

Reviewer approval is evidence, not a substitute for root verification.

## Completion report

Report:

- the user-visible result;
- important data or architecture decisions;
- tests and browser viewports actually exercised;
- bundle-size or dependency impact when relevant;
- commit, PR, CI, and Pages links when publication was authorized; and
- any remaining limitation or unperformed verification, stated plainly.
