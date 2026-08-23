# Country silhouettes

`src/data/country-shapes.json` is a deterministic, display-only dataset of 197
local country silhouettes. It is used by shape quizzes; it is not a source for
country names, capital answers, neighbours, recognition, sovereignty, or border
policy.

## Source and coverage

The default source is Natural Earth v4.1.0 Admin-0 country geometry, packaged
by [`world-atlas@2.0.2`](https://github.com/topojson/world-atlas). Natural
Earth data is public domain; `world-atlas` is ISC-licensed packaging. This base
mapping was checked on 2026-08-20.

172 non-cohort entities use the installed `countries-50m.json` topology to
retain integral islands and other study-relevant components; this includes
Spain's Canaries, Portugal's Azores, Bioko, and Vanuatu's Efate. Somalia merges
the source's separate `Somalia` and
`Somaliland` 50m display features into the single `SOM` study silhouette. This
follows Geoquiz's 197-entity study geometry; it makes no recognition or
final-border assertion. Somaliland is not added as an entity.

`scripts/country-shape-sources.json` records every entity code, exact source
name, expected source ID, resolution, and exceptions. Important mappings are:

- ISR → `376`, `Israel`;
- PSE → `275`, `Palestine`;
- TWN → `158`, `Taiwan`;
- VAT → `336`, `Vatican`;
- XKX → unique feature name `Kosovo`, whose Natural Earth feature has no numeric
  ID; and
- TUV → `798`, `Tuvalu`, from the historic 10m fallback mapping (the rendered
  override below takes precedence).

Israel and Palestine are preserved as separate source features. The data makes
no political claim and must not merge, fabricate, or silently replace disputed
or otherwise sensitive geometry.

### High-fidelity microstate overrides

The exact cohort `AND ATG BHR BRB DMA FSM GRD KIR KNA LCA LIE MDV MHL MCO MLT
NRU PLW SGP SMR STP SYC TON TUV VAT VCT` uses locally vendored geoBoundaries
6.0 gbOpen ADM0 artifacts from commit
`9469f09592ced973a3448cf66b6100b741b64c0d`. The 22 normal artifacts use the
published simplified GeoJSON; Monaco, Nauru, and Vatican City use the audited
full GeoJSON. Files and pinned metadata are in `scripts/vendor/geoboundaries-6.0/`.
`scripts/geoboundaries-shape-overrides.json` is the audited registry: it locks
the exact cohort, source/provenance fields, variant, attribution flag, and
SHA-256 for every local artifact; generation rejects any mismatch.
The generated v3 dataset records the artifact URL, SHA-256, boundary ID,
represented year, upstream source, licence, metadata API URL, variant, and
checked date per override. This is a separate mixed-licence data layer; it does
not relicense Geoquiz code or the Natural Earth base layer.

The records are public domain for AND, ATG, LCA, MLT, and VAT; CC BY 2.5 for
BRB, DMA, and KNA; CC BY 3.0 IGO for FSM; CC BY 4.0 for MDV; and ODbL 1.0 for
BHR, GRD, KIR, LIE, MHL, MCO, NRU, PLW, SGP, SMR, STP, SYC, TON, TUV, and VCT.
Local licence notices/texts are retained in `docs/licenses/`. Whenever a
geoBoundaries shape is displayed, the interface visibly links to the generated,
local `country-shape-credits.html` disclosure and shows the applicable short
licence token. OpenStreetMap contributors are credited only for records pinned
to the exact OpenStreetMap/Wambacher source (not merely because a record is
ODbL-licensed; Singapore is not an OSM record).

## Format and rendering

The `shapes` object is keyed directly by study entity code. Each record contains
an unwrapped geographic bounding box, a zero-origin local SVG viewBox, and
polygon/ring coordinate data. A ring stores its initial local integer coordinate
followed by integer deltas; closure is implicit. Natural Earth shapes use 1,000
units per degree; geoBoundaries overrides use 100,000 units per degree. The framework-light
decoder expands only a selected shape into compound SVG paths. One path
represents one source polygon, preserving outer and inner rings with even-odd
fill without exposing country names.
The generator unwraps and aligns components so no geographic ring segment jumps
more than 180° across the antimeridian. The bounds/viewBox permit a future quiz
to project a local point overlay without shipping the original topology at
runtime. Rendering is entirely local; no map tiles, runtime data, or imagery is
requested.

`CountrySilhouette` accepts a shape object rather than an entity name and has a
generic accessible label by default. Callers must keep challenge-mode labels
generic so the SVG does not reveal the answer. Current shape quiz routes
lazy-load the dataset rather than placing it in the initial application bundle;
future callers must preserve that lazy boundary.

## Regeneration and validation

The generated JSON is checked in and is never modified by install or ordinary
validation. To intentionally regenerate it after auditing a source change:

```sh
npm run generate:country-shapes
npm run validate:data
```

`npm run validate:data` validates capital data, exact 197-shape coverage,
source mapping invariants, geometry structure, and deterministic generated
output. Review any resulting manifest or geometry diff before committing it.

## Review cadence

The Natural Earth base mapping was checked on **2026-08-20** against Natural
Earth v4.1.0 as bundled by `world-atlas@2.0.2`; the geoBoundaries override
layer was checked on **2026-08-21**. Review this document and the checked-in
geometry at least
annually, and immediately when any of these changes:

- the `world-atlas` package version or its Natural Earth source version;
- the audited geoBoundaries cohort, variant, licence, hash, or source metadata;
- the generator, antimeridian alignment, coordinate encoding, or validation
  policy; or
- the 197-entity study scope or its disputed-geometry policy.

For an approved change, update the source manifest and checked date, regenerate
with `npm run generate:country-shapes`, then run `npm run validate:data`,
`npm run generate:country-shapes -- --check`, tests, and the required Chrome MCP
visual/network matrix before publication. Do not accept a geometry diff merely
because generation succeeds.
