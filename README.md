# Geoquiz

A deliberately bare capital-city quiz: every question shows the same 200 capital-place dots on a neutral, tile-free map, with one gold ring to identify. Pan, zoom, type the capital, and work through a shuffled deck without repeats.

## Run locally

```sh
npm ci
npm run dev
```

Useful checks:

```sh
npm run lint
npm run validate:data
npm test
npm run build
```

The production build uses Vite's `/geoquiz/` base path, for the project Pages URL `https://halvorlinder.github.io/geoquiz/`.

## Controls and answer rules

- Drag or touch-drag to pan. Use the map buttons, mouse wheel/trackpad, or pinch to zoom.
- Use the **Country outlines** switch to show or hide country and coastline lines; it starts **Off**.
- Type in the focused answer field and press Enter or select **Check answer**.
- Case, accents, punctuation, spacing, common transliterations, and one or two small spelling edits are handled tolerantly. A precise name or alias belonging to another capital is always rejected.
- **Reveal and skip** shows the answer without adding to the score. A completed deck can be restarted with a new order.

## Capital data policy

[`src/data/capitals.json`](src/data/capitals.json) models **197** study entities: the 193 UN member states, plus Vatican City / Holy See, State of Palestine, Kosovo, and Taiwan. It has **201 entity→capital associations** resolved to **200 unique capital-place questions**. Bolivia, Eswatini, and South Africa retain their explicitly divided official capital functions. Israel and the State of Palestine share the single Jerusalem place/question, so it is not duplicated on the map.

The list uses common English study names and a current primary official or functional seat where this keeps the questions practical. The most consequential choices are documented in [data notes](docs/capital-data.md). Coordinates are city-centre points, not country centroids. The validation script enforces entity/place/association cardinalities, unique city/coordinate values, usable coordinates, provenance, and non-colliding aliases.

Source checking is based on the [UN member-state list](https://www.un.org/about-us/member-states), the [UNGEGN capital-name and coordinate API](https://ungegn-api.azurewebsites.net/swagger/index.html) and its [database description](https://unstats.un.org/unsd/geoinfo/geonames/About.htm), plus country-specific official/government sources cited in the data notes. The final data and optional [map-boundary geometry](docs/map-boundaries.md) are bundled into the application—using the quiz makes no network, tile, map-image, or API requests.

## GitHub Pages

After creating the `halvorlinder/geoquiz` repository and pushing `main`:

1. In **Settings → Pages**, select **GitHub Actions** as the source.
2. The included Pages workflow builds and deploys the static `dist/` directory on each push to `main`.
3. The CI workflow runs linting, dataset validation, unit tests, and the production build for pushes and pull requests.

No secrets, database, map API key, or hosting account is required.
