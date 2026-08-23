export type AppRoute = 'hub' | 'capital-map' | 'country-capital' | 'shape-capital' | 'shape-neighbours' | 'shape-high-point' | 'flag-country' | 'not-found'

export function routeFromHash(hash: string): AppRoute {
  if (!hash || hash === '#' || hash === '#/') return 'capital-map'
  if (hash === '#/quizzes') return 'hub'
  if (hash === '#/capital-map') return 'capital-map'
  if (hash === '#/country-capital') return 'country-capital'
  if (hash === '#/shape-capital') return 'shape-capital'
  if (hash === '#/shape-neighbours') return 'shape-neighbours'
  if (hash === '#/shape-high-point') return 'shape-high-point'
  if (hash === '#/flag-country') return 'flag-country'
  return 'not-found'
}
