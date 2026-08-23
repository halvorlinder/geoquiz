# Geoquiz feature implementation plan

Status: implemented locally; Chrome MCP and publication gates pending

Last updated: 2026-08-20

## Objective

Expand Geoquiz from one capital-dot exercise into a static collection of
geography quizzes while preserving the existing offline-first GitHub Pages
architecture. The completed product will support practice and timed play,
continent filters, local scoreboards, country/capital text questions, country
shape questions, national-high-point questions, neighbour questions, and flag
questions with an optional territory deck.

The application remains a client-only React/Vite site. All geography, shapes,
flags, aliases, and provenance are bundled locally. No accounts, backend,
runtime geography API, map tiles, or externally hosted quiz images are added.

## Product decisions

### Shared modes

Every applicable quiz exposes two modes:

- **Practice** keeps explicit answer submission and reveal controls. Map-based
  practice may expose the existing country-outline and capital-name aids.
- **Timed** removes all learning aids and explicit answer submission. A correct
  normalized answer advances immediately.

Timed runs use a count-up stopwatch that begins when the player starts the run.
Questions live in a shuffled circular pending queue:

1. A correct answer marks the question green, removes it from the queue, and
   advances.
2. **Skip** leaves the question white and moves it to the back of the queue.
3. **Reveal** shows the answer, marks the question red, removes it from the
   queue, and advances.
4. Incorrect or incomplete text changes no completion state.
5. The run finishes only when the pending queue is empty.

Color is supplemental. Every state also has text/icon semantics for assistive
technology and color-blind users.

### Scoreboards

Only completed timed runs are recorded. Results are stored in versioned
`localStorage`, with one board for every quiz and active filter combination.
The filter key includes continent and, for flags, territory scope. Entries store
duration, correct count, revealed count, total count, completion date, and data
version. Ranking is correct count descending, then duration ascending. Keep the
best ten entries per board. No player name or cloud synchronization is needed.

Malformed, stale, disabled, or quota-blocked storage must not prevent play.

### Continents

The filter is **All** or one continent. Only eligible entities and their visual
marks appear, and only those entities enter the question queue.

Use UN M49 regional placement as the baseline with these explicit product
overrides:

- Russia: Europe
- Türkiye: Europe
- Kazakhstan: Asia
- Egypt: Africa
- Georgia: Asia

The entity catalog, not coordinates or map geometry, is the source of truth.
Antarctica is not a sovereign-study filter because it contains no study entity.

### Countries with multiple capitals

Country-to-capital quizzes ask one question per country and present all required
role-labelled inputs. Required mappings are:

- South Africa: Administrative — Pretoria; Legislative — Cape Town; Judicial —
  Bloemfontein.
- Bolivia: Constitutional capital — Sucre; Seat of government — La Paz.
- Eswatini: Administrative — Mbabane; Royal and legislative — Lobamba.

Fields may be completed in any order. Correct fields lock independently. A
question counts green only when every field was answered without reveal;
revealing any missing field makes the completed question red.

### Neighbour policy

The quiz asks for neighbouring study countries, not every dependency or
unrecognized authority touching a polygon. Maintain a versioned, hand-curated,
reciprocal adjacency table; never infer answer sets from simplified display
geometry.

- Count conventional terrestrial boundaries, including boundaries following
  rivers and lakes.
- Exclude point-only contact.
- Include integral national territory and ordinary exclaves.
- Exclude boundaries created only by dependencies in the territory deck.
- Exclude countries with zero eligible neighbours from the question set.
- Accept answers in any order and show remaining-answer count without revealing
  names.

Required sensitive mappings and notes:

- Palestine: Israel, Egypt, Jordan.
- Kosovo: Serbia, Montenegro, Albania, North Macedonia.
- Morocco: Algeria; do not infer Mauritania through Western Sahara.
- Cyprus: no eligible neighbour; do not add Türkiye or the UK.
- Israel and Syria remain reciprocal neighbours despite the Golan dispute.
- Georgia/Russia, Ukraine/Russia, Armenia/Azerbaijan, China/India,
  India/Pakistan, Afghanistan/Pakistan, Guyana/Venezuela, Guyana/Suriname,
  Belize/Guatemala, Eritrea/Ethiopia, Sudan/South Sudan, and Croatia/Serbia
  remain reciprocal neighbours with dispute notes.
- Include Russia/Poland/Lithuania through Kaliningrad, Azerbaijan/Türkiye
  through Nakhchivan, Angola/Republic of the Congo through Cabinda,
  France/Brazil/Suriname through French Guiana, and Spain/Morocco through
  Ceuta/Melilla.
- Exclude UK/Spain through Gibraltar, UK/Cyprus through the Sovereign Base
  Areas, and Denmark/Canada through Greenland under the dependency rule.

### National highest points

Use the phrase **highest point**, not tallest mountain. Each sovereign-study
entity gets one versioned record with canonical label, accepted aliases,
coordinates, elevation metadata, provenance, checked date, and an edge-case
note where needed.

The record is the highest natural terrestrial point within the same sovereign
study boundary policy. Exclude buildings, fill, spoil heaps, seafloor,
dependencies, overseas territories in the flag territory deck, and Antarctic
claims. Include constitutionally integral islands.

Consequences include:

- Denmark: Mollehoj, not Gunnbjorn Fjeld.
- Netherlands: Vaalserberg, not Mount Scenery.
- Australia: Mount Kosciuszko, not Mawson Peak.
- United Kingdom: Ben Nevis, not Mount Paget.
- Spain: Teide.
- Portugal: Pico.

Shared summits may be associated with multiple entities and reuse the same
canonical label. Curate multilingual and transliteration aliases. Elevation is
display metadata, never part of answer validation.

Explicit audit cases include unnamed or non-mountain points in Vatican City,
Maldives, Tuvalu, and Marshall Islands; shared summits; Mount Hermon/Golan;
Mont Blanc; Palestine; Kosovo; Taiwan; Georgia; the changing Kebnekaise summit;
Colombia; Bangladesh; and recently surveyed replacements in Saudi Arabia,
Uzbekistan, Gambia, Guinea-Bissau, and Togo. Prefer the best current survey with
a dated note when official lists are demonstrably stale.

### Territory flag roster

Keep the existing 197 sovereign-study entities unchanged. Add a separate,
versioned roster of 38 populated territories or associated areas that have a
distinct, stable flag and useful canonical answer. “Territories and associated
areas” is a learning label, not a sovereignty statement.

Roster:

- Finland: Aland Islands.
- Denmark: Faroe Islands, Greenland.
- China: Hong Kong, Macao.
- Kingdom of the Netherlands: Aruba, Curacao, Sint Maarten, Bonaire, Sint
  Eustatius, Saba.
- New Zealand association: Cook Islands, Niue, Tokelau.
- Australia: Christmas Island, Cocos (Keeling) Islands, Norfolk Island.
- France: French Polynesia.
- Crown Dependencies: Guernsey, Isle of Man, Jersey.
- United Kingdom: Anguilla, Bermuda, British Virgin Islands, Cayman Islands,
  Falkland Islands (Malvinas), Gibraltar, Montserrat, Pitcairn, Turks and Caicos
  Islands, Saint Helena, Ascension Island, Tristan da Cunha.
- United States: American Samoa, Guam, Northern Mariana Islands, Puerto Rico,
  United States Virgin Islands.

Flag scopes:

- **Without territories:** 197 sovereign-study questions.
- **With territories:** 235 questions.
- **Only territories:** 38 questions.

Exclude uninhabited Antarctic/subantarctic areas, Western Sahara, British
Indian Ocean Territory, New Caledonia until a flag policy is chosen, French
areas without one stable distinct official flag, Svalbard and Jan Mayen, and
ordinary internal subdivisions. Store ISO/M49 or documented subdivision IDs.
Bundle optimized local SVG assets only after provenance, licensing, and
distinct-flag review.

## Architecture

### Application shell

Add a lightweight quiz hub at `#/quizzes` and URL-addressable navigation without
introducing a router unless it becomes necessary. The Capital dots practice quiz
is the landing route at `#/` (`#/capital-map` remains a compatible deep link).
Each quiz owns its prompt and feedback UI,
while shared run setup, timed status, completion summary, and scoreboard
components live at the application level.

Keep concrete quiz implementations separate:

- `src/quizzes/capital-map/`
- `src/quizzes/country-capital/`
- `src/quizzes/shape-capital/`
- `src/quizzes/shape-high-point/`
- `src/quizzes/shape-neighbours/`
- `src/quizzes/flag-country/`

Create shared code only after two concrete quizzes require it:

- `src/core/session/`: circular queue, completion states, timed session reducer.
- `src/core/scoreboard/`: versioned keys, result validation, ordering, storage.
- `src/core/answers/`: reusable normalization and single/multiple-answer
  matching built on the existing capital safeguards.
- `src/components/`: shared setup, timer, progress, completion, and scoreboard
  UI after reuse is demonstrated.

### Data model

Introduce an entity-centric catalog without weakening the existing capital-place
dataset:

- `src/data/entities.json`: 197 entities, canonical names, aliases, continent,
  and capital-role assignments.
- `src/data/capitals.json`: existing 200 capital places and 201 associations.
- `src/data/country-shapes.*`: locally bundled, display-oriented geometry keyed
  to entity code.
- `src/data/neighbours.json`: reciprocal curated adjacency with boundary type,
  scope, sources, dates, and optional dispute notes.
- `src/data/high-points.json`: one highest-point record per eligible entity.
- `src/data/flags.json`: sovereign and territory metadata plus local asset path.
- `public/flags/v1/`: audited local SVG files served as local static assets.

Every dataset has a version, provenance document, mechanical validator, stable
IDs, uniqueness checks, finite coordinates where applicable, and explicit count
assertions. Geography display data never silently defines answer policy.

### Country shapes

Create an audited build-time conversion from a documented small-scale public
source into one local feature per supported entity. Preserve source attribution
and licensing. Normalize antimeridian geometry and test for non-finite points,
degenerate rings, cross-world segments, missing IDs, duplicate IDs, and disputed
entity exceptions. Quiz rendering uses a neutral silhouette with no labels,
neighbour context, or external tiles.

### Accessibility and responsive behavior

- Use native inputs and buttons.
- Timers expose readable elapsed text without announcing every tick.
- Auto-advance feedback is announced once and focus moves predictably.
- Multi-answer and multi-capital fields identify which answers are complete,
  pending, or revealed without relying on color.
- SVG shapes and flags have concise accessible names without leaking answers in
  challenge mode.
- Respect reduced motion for map movement and mode transitions.
- Validate the hub and every quiz at approximately 1440x900 and 390x844.

## Delivery phases and PR boundaries

### Phase 1 — Entity and session foundations

PR 1A: entity catalog and validation

- Add the 197-entity catalog, continent assignments, user overrides, and
  role-labelled capital mappings.
- Add derivation/cross-reference helpers and validators against the existing
  197/201/200 capital dataset.
- Document versioning and transcontinental policy.

PR 1B: timed-session and scoreboard core

- Implement and test the circular queue and completion reducer.
- Implement a monotonic count-up timer contract.
- Implement versioned local scoreboards and failure-safe storage.
- No quiz UI migration in this PR.

Acceptance: pure modules have exhaustive transition, ordering, corruption,
storage-disabled, and deterministic-shuffle tests; existing behavior is
unchanged.

### Phase 2 — Capital-map modes and continent filters

- Add mode/filter setup to the existing quiz.
- Practice preserves current controls and explicit answer submission.
- Timed removes aids and Check answer, auto-advances on accepted input, and adds
  Skip/Reveal with white/green/red status.
- Filter dots, targets, deck, progress, and scoreboard by entity continent.
- Preserve pan/zoom, target focus, antimeridian safety, reduced motion, and
  answer-collision guarantees.

Acceptance: unit/component tests plus Chrome MCP on desktop/mobile, distant
targets, keyboard/touch, all toggle states, local-only network, and clean
console.

### Phase 3 — Country-to-capital text quiz

- Add quiz hub navigation and the text format.
- Add role-labelled multi-capital questions.
- Reuse shared modes, filters, session state, answer normalization, and
  scoreboard.
- Lock correct fields independently and reveal remaining fields atomically.

Acceptance: all 197 entities are reachable; multi-capital role tests cover
South Africa, Bolivia, and Eswatini; aliases and cross-answer collisions remain
safe.

### Phase 4 — Shape pipeline and shape-to-capital quiz

- Audit and bundle country silhouette geometry.
- Add geometry validator and provenance documentation.
- Add reusable non-answer-leaking shape renderer.
- Implement country shape to capital, including multi-capital fields.

Acceptance: declared entity coverage is exact; missing/disputed shapes are
explicit; silhouettes render correctly at both required viewports without
runtime requests.

### Phase 5 — Shape-to-neighbours quiz

- Add the curated reciprocal adjacency dataset and validator.
- Exclude zero-neighbour entities from the question deck.
- Accept neighbours in any order, reject duplicates and non-neighbours, and
  expose remaining count.
- Apply the approved territory and dispute policy.

Acceptance: reciprocity, no-self-edge, scope, eligibility, alias-collision, and
sensitive-pair snapshot tests all pass.

### Phase 6 — Shape/highest-point quiz

- Build the sourced highest-point dataset and exception dossier.
- Mark the point on the country silhouette without adding other hints.
- Implement answer aliases, practice reveal, timed circular play, filters, and
  scoreboard.

Acceptance: every included entity has a deliberate answer policy; unnamed and
disputed cases are documented; shared summit and recent-survey snapshots pass.

### Phase 7 — Flag quiz and territory scopes

- Complete flag provenance and licensing audit.
- Bundle and optimize sovereign plus approved territory SVGs.
- Implement Without/With/Only territories setup.
- Use “country or territory” wording when territory questions are active.

Acceptance: exact 197/38/235 counts; one valid local asset per record; no remote
image requests; duplicate/near-identical flag cases documented; responsive and
keyboard QA complete.

### Phase 8 — Portfolio hardening

- Cross-mode navigation, restart, timer, storage, and focus audit.
- Bundle-size analysis and justified code splitting if needed.
- Full data provenance review and annual-review markers.
- Complete README and contributor/data-maintenance documentation.
- Run the full automated suite and Chrome MCP matrix.

## Verification gates

Every implementation PR requires an independent producer/reviewer correction
loop and root integration judgment. Required automated commands:

```sh
npm ci
npm run lint
npm run validate:design
npm run validate:data
npm test
npm run build
git diff --check
```

Add dataset-specific validators as they land and include them in CI. Browser QA
must use the requested Chrome MCP for user-facing or visual changes. Test at
1440x900 and 390x844, keyboard and pointer interaction, focus, reduced motion,
console output, and runtime network requests.

No branch may be called shipped until its PR checks pass, it is merged with
authorization, the Pages deployment succeeds, and the public URL is smoke
tested.

## Implementation status (2026-08-20)

Phases 1 through 7 are implemented in the integration worktree: the entity,
session, scoreboard, shape, neighbour, highest-point, flag, and six-quiz UI
deliverables are present with their dataset validators and focused tests. The
capital-map mode/filter work includes optional practice outlines and capital
labels; timed mode removes those aids. The flag roster is 197 sovereign records
plus 38 approved territory or associated-area records, for 235 total—not two
separate “with territories” counts.

Phase 8 adds the portfolio maintenance documentation and explicit deterministic
shape-artifact checks in CI and Pages. Automated checks can establish source and
build correctness, but not visual interaction. The remaining required gate is
local Chrome MCP QA at desktop and mobile viewports, including map geometry,
network, console, focus, and mode/filter coverage. No commit, push, PR, merge,
deployment, or hosted smoke test has been authorized or performed.

Ongoing product-design direction is indexed in
`docs/design-decisions/README.md`. The agent workflow requires applicable
records to be read before design work, new explicit user decisions to be
recorded with their implementation, superseded direction to remain linked, and
`npm run validate:design` to pass in CI and Pages.

## Implementation risks

- Country shapes and neighbour answers encode different policies; never derive
  the latter from the former.
- Permanent labels, large geometry, and 235 local SVGs can increase bundle or
  DOM cost; lazy-load quiz-specific data/assets if measurement justifies it.
- Auto-advance must not accept a short prefix before the user finishes a longer
  valid answer.
- Timer rendering must not cause the entire map or quiz tree to rerender every
  animation frame.
- `localStorage` is optional and user-controlled; gameplay cannot depend on it.
- Political and physical geography changes. Every nontrivial dataset needs a
  checked date, source, version, and review procedure.
- Multiple quiz branches must not edit the same shell or shared core files in
  parallel. Land foundations first, then serialize dependent integrations.

## Initial orchestration

Begin with two disjoint issues in parallel:

1. **Entity catalog foundation** owns entity metadata, continent policy,
   multi-capital roles, validation, and data documentation.
2. **Timed-session foundation** owns pure circular-queue, timer, and scoreboard
   modules with tests.

After independent review and root verification, integrate those foundations
through separate PRs. Phase 2 begins only after both are on `main`. Later phases
are admitted sequentially when their data prerequisites and ownership boundaries
are clear.
