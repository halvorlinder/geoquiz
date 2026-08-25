# Border-line image data

`src/data/neighbours.json` remains the answer-policy authority. The historical
`src/data/border-lines.json` v1 artifact remains byte-identical. The application
uses generated `src/data/border-lines-v2.json`, which is display-only and has
every independent exact visual run for each of the same 317 curated unordered
land-border pairs; it must never create or remove an answer-policy edge.

Easy now uses a selected-border context map rather than a whole-country
silhouette, locator, or inset. Its deterministic Web-Mercator frame contains
the full exact run (or all-run union) and is audited at the local map's canonical integer fit zoom
for both narrow and desktop widths. It never union-fits the country silhouette.

## Geometry and scope

The v2 generator retains every continuous exact shared segment in the two
local display shapes for 308 pairs (352 runs across 317 pairs; 27 pairs have
multiple sections). Runs are ordered by descending geodesic length and then a
canonical orientation-independent coordinate key. They are never flattened or
joined with connectors. Unresolved Hard shows them as unconnected paths under
one shared north-up union geographic transform in one anonymous line panel;
the Easy/disclosed-Hard map retains the same all-run geographic union. Nine
records that cannot align with the
mixed global silhouette layer use pinned Overture Divisions `2026-08-19.0`
input derived from the OSM planet snapshot `2026-07-23T00:00:00Z`:

`AND–ESP`, `AND–FRA`, `AUT–LIE`, `BWA–ZMB`, `CHE–LIE`, `ESP–MAR`,
`FRA–MCO`, `ITA–SMR`, and `ITA–VAT`.

The generator requires each override segment to occur byte-for-byte in both
selected Overture country land-area rings. It does not snap, conflate, infer,
or invent coordinates. Spain–Morocco v2 includes its exact Melilla and Ceuta
runs; historical v1 remains Melilla-only and byte-identical. France–Monaco trims source terminal segments that are not in both selected
land areas. These are selected study visuals, not complete legal-border claims.

## Pinned source and regeneration

`public/data-sources/border-countries/overture-divisions-2026-08-19.0.json.gz` is the narrow, reproducible
public source subset. It contains only the nine boundary records, 13 affected
land areas, their literal upstream `sources` arrays from `division_area`,
upstream query provenance, and SHA-256 locks for the locally audited extraction
inputs. The reviewed manifest locks the exact feature IDs and the OSM
provider/licence/planet revision of every geometry source. `scripts/generate-border-lines.ts` performs no
network access. To deliberately regenerate after reviewing a source change:

```sh
npm run generate:border-lines -- --write
npm run generate:border-lines -- --check
npm run validate:data
```

`--extract` is only available while the separately ignored audited input files
exist; it must never be replaced with a live mutable fetch. The committed gzip
artifact is the public source offer for this derived local geometry database.

## Licence and attribution

The Overture Divisions records in this narrow subset identify OpenStreetMap as
their source and ODbL-1.0 as their licence. Geoquiz code is not relicensed.
The derived Overture/OSM subset is offered under ODbL 1.0 at its repository
path above; licence text and attribution are in
`public/border-data-sources.html`. The generated complete derived databases are
deployed at `public/data-sources/border-countries/border-lines-v1.json`
(historical byte-identical v1) and `public/data-sources/border-countries/border-lines-v2.json`
(the exact application dataset).
The quiz exposes one local `Border data
sources` link, preserving Hard-answer non-disclosure. See
`docs/neighbours-data.md` for neutral answer-policy scope and
`docs/country-shapes.md` for the separate global silhouette layer.
