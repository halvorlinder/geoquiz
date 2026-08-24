# Geoquiz

Geoquiz is a static, local-first collection of focused world-geography exercises.
It has no accounts, backend, map tiles, runtime geography API, or remotely loaded
quiz images. The production site is built for GitHub Pages at
`https://halvorlinder.github.io/geoquiz/`.

## Quizzes

Capital dots is the front page at `/geoquiz/`. The quiz chooser is an overlay,
opened from **All quizzes**; it does not replace the active exercise. Every quiz
has a separate static, crawlable page:

| Quiz | Route | Question set |
| --- | --- | --- |
| Capital dots | `/geoquiz/` | Identify a highlighted capital from a tile-free world map. |
| Country capitals | `/geoquiz/country-capital/` | Name a country's capital(s), including role-labelled multi-capital questions. |
| Shape capitals | `/geoquiz/shape-capital/` | Name a capital from a country silhouette. |
| Shape neighbours | `/geoquiz/shape-neighbours/` | Name every eligible land neighbour from a country silhouette. |
| Shape highest points | `/geoquiz/shape-high-point/` | Name the marked highest point on a country silhouette. |
| Flag countries | `/geoquiz/flag-country/` | Identify countries or approved territories from bundled local SVG flags. |
| Country borders | `/geoquiz/border-countries/` | Identify neighbouring countries from locally rendered shared land borders. |

The former `#/`, `#/capital-map`, and quiz hash routes remain compatible
bookmarks: the app replaces them with their canonical paths. `#/quizzes` opens
the overlay once over Capital dots after canonicalizing to the front page. All
quiz modules remain lazy-loaded at the quiz boundary. Country silhouettes are a known
large lazy chunk (about 680 kB raw / 257 kB gzip); flags remain individual local
SVG files and the flag-quiz code chunk is about 92 kB raw / 10 kB gzip.

## Play modes and accessibility

Every quiz has **Practice** and **Timed** modes plus an **All/continent** filter.
The flag quiz also has **Without territories** (197), **With territories** (235),
and **Only territories** (38) scopes.

- Practice has explicit checking and reveal controls. The capital-dot map starts
  with outlines and capital names off; both are optional practice aids.
- Timed runs count upward, remove learning aids, and accept a correct answer as
  it is typed. **Skip** rotates a question to the back of its circular queue;
  it returns after every other outstanding question. A timed **Reveal** marks a
  question revealed. On Capital dots, its old dot becomes red, feedback names
  the capital, and play advances immediately. Text, shape, and flag quizzes
  instead show an answer-revealed card that requires **Continue** before play
  resumes.
- Answers normalize case, accents, punctuation, and spacing; curated aliases and
  controlled typo tolerance are supported. Known answers for a different target
  are rejected, except deliberately shared highest-point answers whose records
  have the same declared `sharedFeatureId`. In the flag quiz, an exact answer
  that is also the start of another accepted catalog answer requires Enter in
  Timed mode rather than auto-advancing: **Dominica**, **Guinea**, **Niger**,
  **UK**, and **United States**. Unambiguous alternatives such as **United
  Kingdom** and **USA** still auto-advance.
- Native controls, visible focus, live feedback, readable timer text, and
  keyboard-safe actions are provided. The map remains pannable and zoomable by
  mouse, keyboard, touch, trackpad, and pinch.

Completed timed runs are stored only in browser `localStorage`: one top-ten board
per quiz and active filter combination, ranked by correct answers then duration.
Results from another data version are ignored. Corrupt, blocked, disabled, or
quota-full storage never prevents play; it simply leaves no persistent score.

## Study data

The sovereign study set contains **197** entities, **201** entity-to-capital
associations, and **200** unique capital places. It also contains **197** local
country silhouettes, **317** reciprocal neighbour edges, **157** eligible
neighbour questions, **40** zero-neighbour exclusions, **197** highest-point
records, and **235** flag records (197 sovereign + 38 territory/associated-area).

Each dataset is bundled and versioned. Policy, provenance, exceptions, and
maintenance details are in:

- [Capital data](docs/capital-data.md)
- [Entity and continent policy](docs/entity-data.md)
- [Map boundaries](docs/map-boundaries.md)
- [Country shapes](docs/country-shapes.md)
- [Neighbours](docs/neighbours-data.md)
- [Highest points](docs/high-point-data.md)
- [Flags and territories](docs/flag-data.md)
- [Country-border display data](docs/border-lines-data.md)

Durable UI and interaction direction is maintained separately in the
[design-decision index](docs/design-decisions/README.md). New explicit design
decisions must be recorded there and validated in the same change that
implements them.

The source records may contain provenance links, but those are data references:
the browser does not request them while a quiz runs. Flag SVGs live in
`public/flags/v1/` and are validated for integrity and safe SVG content.

## Local development and maintenance

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/geoquiz/`.

Run the full deterministic verification suite before proposing publication:

```sh
npm run lint
npm run validate:design
npm run validate:data
npm test
npm run build
npm run generate:country-shapes -- --check
npm run validate:flags
git diff --check
```

`validate:data` includes capital, entity, country-shape, neighbour, highest-point,
and flag validation. `generate:country-shapes -- --check` additionally asserts
that the checked-in shape artifact is byte-for-byte current. To intentionally
regenerate that artifact after an approved source-policy change, run:

```sh
npm run generate:country-shapes
```

Do not refresh study data casually: preserve stable IDs and documented policy,
record source/checked dates, update the relevant policy document, and run every
check above. The flag catalogue and its local assets are intentionally audited
rather than fetched at runtime.

## GitHub Pages and release gate

The repository's CI workflow runs installation, linting, every data validator,
the deterministic country-shape check, tests, and a production build. The Pages
workflow repeats those checks and deploys `dist/` on pushes to `main`. In the
repository settings, select **GitHub Actions** as the Pages source.

Before a visual or interactive change is pushed, merged, deployed, or called
shipped, test locally with the requested Chrome MCP—not a substitute browser—at:

- Desktop around 1440 × 900 and mobile around 390 × 844.
- Capital-map outline Off/On, pan/zoom controls, and movement between distant
  targets (including the responsive focus context and reduced motion).
- Keyboard and pointer interaction, visible focus through reveal/next/restart,
  all quiz modes and filters, and circular Skip/Reveal behavior.
- Browser console output and network activity, confirming no map tiles, external
  runtime data, or remote flag requests; also check for antimeridian/cross-world
  line artifacts.

Chrome MCP QA, passing GitHub Actions, an authorized merge, a successful Pages
deployment, and a hosted smoke test are all required before publication.

## Search discovery

The production build emits static HTML for all seven canonical quiz routes, each
with its own title, description, and canonical URL. `sitemap.xml` lists those
seven URLs exactly; submit `https://halvorlinder.github.io/geoquiz/sitemap.xml` in
Google Search Console after deployment. The downloaded Google ownership file is
copied unchanged into `public/` so it is served at the project-site root.

Search indexing and ranking remain controlled by Google. Geoquiz does not add
visitor analytics as part of its search-discovery setup.
