# Optional map boundaries

The **Country outlines** switch draws an optional, unlabelled line layer behind the capital dots and target ring. It is off when the quiz loads. The lines are study context only: they make no political statement and do not assert or endorse any position on sovereignty, recognition, or the status of any boundary.

## Source and processing

- The build bundles `world-atlas@2.0.2`'s `countries-110m.json` file. Its README identifies the data as Natural Earth Admin 0 Countries, version 4.1.0, at 1:110m small scale.
- This is a deliberately low-detail, small-scale source appropriate for a global quiz. Natural Earth's 1:110m source is already generalized; `world-atlas` quantizes that geometry, and the app does not further generalize or alter it.
- At module initialization, `topojson-client@3.1.0` uses `mesh()` over the topology's `countries` object to create one `MultiLineString`. This includes country boundaries and coastlines while avoiding filled polygons and per-country layers.
- The generated geometry is part of the built JavaScript bundle. It is neither fetched at runtime nor supplied by map tiles, a map API, or a backend.

## Attribution and licenses

Natural Earth data are in the public domain. The `world-atlas@2.0.2` redistribution package is ISC-licensed, and `topojson-client@3.1.0` is ISC-licensed. The development-only `@types/topojson-client@3.1.4` typings (and its transitive TopoJSON-specification typings) are MIT-licensed. These package licenses apply to their code and packaging, not to a new claim over the underlying public-domain Natural Earth data.

For package source and license texts, see the installed `world-atlas` and `topojson-client` package metadata in this repository's lockfile and their published npm packages.
