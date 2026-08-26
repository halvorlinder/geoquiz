export type QuizRoute = 'capital-map' | 'country-capital' | 'shape-capital' | 'shape-neighbours' | 'shape-high-point' | 'flag-country' | 'border-countries'
export type AppRoute = QuizRoute | 'not-found'

export type RouteMetadata = Readonly<{
  path: string
  title: string
  description: string
  canonicalUrl: string | null
  indexable: boolean
}>

const siteOrigin = 'https://halvorlinder.github.io'

export const routeMetadata: Readonly<Record<AppRoute, RouteMetadata>> = {
  'capital-map': {
    path: '/geoquiz/',
    title: 'Capital dots geography quiz | Geoquiz',
    description: 'Learn world capitals by identifying a highlighted dot on a tile-free map.',
    canonicalUrl: `${siteOrigin}/geoquiz/`,
    indexable: true,
  },
  'country-capital': {
    path: '/geoquiz/country-capital/',
    title: 'Country capitals geography quiz | Geoquiz',
    description: 'Practise naming the capital or capitals of countries around the world.',
    canonicalUrl: `${siteOrigin}/geoquiz/country-capital/`,
    indexable: true,
  },
  'shape-capital': {
    path: '/geoquiz/shape-capital/',
    title: 'Shape capitals geography quiz | Geoquiz',
    description: 'Identify world capitals from country silhouettes in this geography quiz.',
    canonicalUrl: `${siteOrigin}/geoquiz/shape-capital/`,
    indexable: true,
  },
  'shape-neighbours': {
    path: '/geoquiz/shape-neighbours/',
    title: 'Shape neighbours geography quiz | Geoquiz',
    description: 'Name the land neighbours of countries from their silhouettes.',
    canonicalUrl: `${siteOrigin}/geoquiz/shape-neighbours/`,
    indexable: true,
  },
  'shape-high-point': {
    path: '/geoquiz/shape-high-point/',
    title: 'Shape highest points geography quiz | Geoquiz',
    description: 'Learn the highest points of countries from marked country silhouettes.',
    canonicalUrl: `${siteOrigin}/geoquiz/shape-high-point/`,
    indexable: true,
  },
  'flag-country': {
    path: '/geoquiz/flag-country/',
    title: 'Flag countries geography quiz | Geoquiz',
    description: 'Identify countries and territories from their flags in a geography quiz.',
    canonicalUrl: `${siteOrigin}/geoquiz/flag-country/`,
    indexable: true,
  },
  'border-countries': {
    path: '/geoquiz/border-countries/',
    title: 'Country borders geography quiz | Geoquiz',
    description: 'Identify neighbouring countries from locally rendered shared land borders.',
    canonicalUrl: `${siteOrigin}/geoquiz/border-countries/`,
    indexable: true,
  },
  'not-found': {
    path: '/geoquiz/404.html',
    title: 'Quiz not found | Geoquiz',
    description: 'The requested Geoquiz page is not available. Choose a geography quiz to continue.',
    canonicalUrl: null,
    indexable: false,
  },
}

export const quizRoutes = Object.keys(routeMetadata).filter((route): route is QuizRoute => route !== 'not-found')

const hashRoutes: Readonly<Record<string, QuizRoute>> = {
  '#/': 'capital-map',
  '#/capital-map': 'capital-map',
  '#/country-capital': 'country-capital',
  '#/shape-capital': 'shape-capital',
  '#/shape-neighbours': 'shape-neighbours',
  '#/shape-high-point': 'shape-high-point',
  '#/flag-country': 'flag-country',
  '#/border-countries': 'border-countries',
}

const borderQaHashes = new Set([
  '#/border-countries?qa=rus-prk',
  '#/border-countries?qa=bwa-botswana',
  '#/border-countries?qa=bwa-zambia',
  '#/border-countries?qa=vatican-italy',
  '#/border-countries?qa=liechtenstein',
  '#/border-countries?qa=spain-morocco',
  '#/border-countries?qa=france-monaco',
  '#/border-countries?qa=hard',
  '#/border-countries?qa=esp-fra',
  '#/border-countries?qa=esp-mar',
  '#/border-countries?qa=can-usa',
  '#/border-countries?qa=arm-aze',
  '#/border-countries?qa=hard-multi',
])

export function routeFromPath(pathname: string): AppRoute {
  if (pathname === '/' || pathname === '/geoquiz' || pathname === '/geoquiz/') return 'capital-map'
  return quizRoutes.find((route) => routeMetadata[route].path === pathname) ?? 'not-found'
}

export function routeFromHash(hash: string): AppRoute {
  if (!hash || hash === '#') return 'capital-map'
  if (hash === '#/quizzes') return 'capital-map'
  if (import.meta.env.DEV && hash === '#/shape-neighbours?qa=china') return 'shape-neighbours'
  if (import.meta.env.DEV && hash === '#/shape-high-point?qa=colombia') return 'shape-high-point'
  if (import.meta.env.DEV && borderQaHashes.has(hash)) return 'border-countries'
  return hashRoutes[hash] ?? 'not-found'
}

export function legacyHashRoute(hash: string): QuizRoute | null {
  return hashRoutes[hash] ?? null
}

export function isLegacyMenuHash(hash: string) {
  return hash === '#/quizzes'
}

export function routeFromLocation(location: Pick<Location, 'pathname' | 'hash'>): AppRoute {
  return location.hash ? routeFromHash(location.hash) : routeFromPath(location.pathname)
}
