# Optional map boundaries

The **Country outlines** switch draws an optional, unlabelled line layer behind the capital dots and target ring. It is off when the quiz loads. The lines are study context only: they make no political statement and do not assert or endorse any position on sovereignty, recognition, or the status of any boundary.

## Source and processing

- The build bundles `world-atlas@2.0.2`'s `countries-110m.json` file. Its README identifies the data as Natural Earth Admin 0 Countries, version 4.1.0, at 1:110m small scale.
- This is a deliberately low-detail, small-scale source appropriate for a global quiz. Natural Earth's 1:110m source is already generalized, and `world-atlas` quantizes that geometry. The app does not further generalize it.
- At module initialization, `topojson-client@3.1.0` uses `mesh()` over the topology's `countries` object to create one `MultiLineString`. The app then splits only line segments that cross the antimeridian, inserting equivalent seam endpoints so Leaflet does not draw artificial cross-world strokes. This includes country boundaries and coastlines while avoiding filled polygons and per-country layers.
- The generated geometry is part of the built JavaScript bundle. It is neither fetched at runtime nor supplied by map tiles, a map API, or a backend.

## Attribution and licenses

Natural Earth data are in the public domain. The `world-atlas@2.0.2` redistribution package is ISC-licensed, and `topojson-client@3.1.0` is ISC-licensed. The development-only `@types/topojson-client@3.1.4` typings (and its transitive TopoJSON-specification typings) are MIT-licensed. These package licenses apply to their code and packaging, not to a new claim over the underlying public-domain Natural Earth data.

For package source and license texts, see the installed `world-atlas` and `topojson-client` package metadata in this repository's lockfile and their published npm packages.

## Display boundary sources

The existing optional capital-map outlines continue to use their own bundled
`world-atlas/countries-110m.json` line conversion. They are unrelated to the
country-silhouette dataset described in [country-shapes.md](country-shapes.md).
The silhouette source is display-only and must never be used to infer quiz
neighbours, recognition, sovereignty, or answer policy.

## Review cadence

The optional boundary source and conversion were checked on **2026-08-20**:
Natural Earth v4.1.0 at 1:110m, bundled by `world-atlas@2.0.2`, converted with
`topojson-client@3.1.0`. Review this document and the rendered line behavior at
least annually, and immediately when any of these changes:

- the `world-atlas` package, Natural Earth source version, or selected 110m
  topology;
- `topojson-client`, mesh conversion, antimeridian splitting, or Leaflet
  rendering behavior; or
- the optional-outline study-context policy or capital-map display invariants.

For an approved update, record the new version and checked date, run lint,
`npm run validate:data`, tests, and a production build, then complete the
required Chrome MCP matrix. That matrix must verify outline Off/On, distant
target changes, pan/zoom, reduced motion, console output, local-only network
activity, and absence of cross-world line artifacts before publication.
