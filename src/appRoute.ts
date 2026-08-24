export type AppRoute = 'capital-map' | 'country-capital' | 'shape-capital' | 'shape-neighbours' | 'shape-high-point' | 'flag-country' | 'border-countries' | 'not-found'

export function routeFromHash(hash: string): AppRoute {
  if (!hash || hash === '#' || hash === '#/') return 'capital-map'
  // The former chooser URL remains a compatible entry point. App canonicalizes it
  // to the landing route and opens the overlay menu without adding history.
  if (hash === '#/quizzes') return 'capital-map'
  if (hash === '#/capital-map') return 'capital-map'
  if (hash === '#/country-capital') return 'country-capital'
  if (hash === '#/shape-capital') return 'shape-capital'
  if (hash === '#/shape-neighbours') return 'shape-neighbours'
  if (hash === '#/shape-high-point') return 'shape-high-point'
  if (hash === '#/flag-country') return 'flag-country'
  if (hash === '#/border-countries' || (import.meta.env.DEV && hash.startsWith('#/border-countries?qa='))) return 'border-countries'
  return 'not-found'
}
