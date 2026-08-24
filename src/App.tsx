import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent } from 'react'
import { QuizMenu } from './components/QuizMenu'
import { isLegacyMenuHash, legacyHashRoute, routeFromLocation, routeMetadata, type AppRoute, type QuizRoute } from './appRoute'

const CapitalMapQuiz = lazy(() => import('./quizzes/capital-map/CapitalMapQuiz'))
const CountryCapitalQuiz = lazy(() => import('./quizzes/country-capital/CountryCapitalQuiz'))
const ShapeCapitalQuiz = lazy(() => import('./quizzes/shape-capital/ShapeCapitalQuiz'))
const ShapeNeighboursQuiz = lazy(() => import('./quizzes/shape-neighbours/ShapeNeighboursQuiz'))
const ShapeHighPointQuiz = lazy(() => import('./quizzes/shape-high-point/ShapeHighPointQuiz'))
const FlagCountryQuiz = lazy(() => import('./quizzes/flag-country/FlagCountryQuiz'))
const BorderCountriesQuiz = lazy(() => import('./quizzes/border-countries/BorderCountriesQuiz'))

function syncDocumentMetadata(route: AppRoute) {
  const metadata = routeMetadata[route]
  document.title = metadata.title

  const description = document.head.querySelector<HTMLMetaElement>('meta[name="description"]') ?? document.createElement('meta')
  description.name = 'description'
  description.content = metadata.description
  if (!description.isConnected) document.head.append(description)

  const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]') ?? document.createElement('link')
  if (metadata.canonicalUrl) {
    canonical.rel = 'canonical'
    canonical.href = metadata.canonicalUrl
    if (!canonical.isConnected) document.head.append(canonical)
  } else {
    canonical?.remove()
  }

  const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
  if (metadata.indexable) robots?.remove()
  else if (robots) robots.content = 'noindex,follow'
  else {
    const noindex = document.createElement('meta')
    noindex.name = 'robots'
    noindex.content = 'noindex,follow'
    document.head.append(noindex)
  }
}

export function App() {
  const [route, setRoute] = useState(() => routeFromLocation(window.location))
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuOpener, setMenuOpener] = useState<HTMLElement | null>(null)
  const menuOpenerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function syncRoute() {
      const legacyRoute = legacyHashRoute(window.location.hash)
      const legacyMenu = isLegacyMenuHash(window.location.hash)
      if (legacyRoute || legacyMenu) {
        const nextRoute = legacyRoute ?? 'capital-map'
        window.history.replaceState(window.history.state, '', `${routeMetadata[nextRoute].path}${window.location.search}`)
        setRoute(nextRoute)
        setMenuOpen(legacyMenu)
        return
      }
      setRoute(routeFromLocation(window.location))
      setMenuOpen(false)
    }

    syncRoute()
    window.addEventListener('popstate', syncRoute)
    window.addEventListener('hashchange', syncRoute)
    return () => {
      window.removeEventListener('popstate', syncRoute)
      window.removeEventListener('hashchange', syncRoute)
    }
  }, [])

  useEffect(() => { syncDocumentMetadata(route) }, [route])

  const openMenu = (event?: MouseEvent<HTMLButtonElement>) => { setMenuOpener(event?.currentTarget ?? menuOpenerRef.current); setMenuOpen(true) }
  const chooseQuiz = (nextRoute: QuizRoute) => {
    setMenuOpen(false)
    window.history.pushState(window.history.state, '', routeMetadata[nextRoute].path)
    setRoute(nextRoute)
  }

  const isStudyQuiz = route === 'country-capital' || route === 'shape-capital' || route === 'shape-high-point' || route === 'flag-country' || route === 'border-countries'
  return <div className={`app-frame${route === 'capital-map' ? ' capital-map-frame' : ''}${route === 'shape-neighbours' ? ' shape-neighbours-frame' : ''}${isStudyQuiz ? ' study-quiz-frame' : ''}`}>
    <nav className="quiz-route-nav" aria-label="Quiz navigation"><button ref={menuOpenerRef} className="quiz-menu-trigger" type="button" onClick={openMenu}>All quizzes</button></nav>
    {route === 'not-found' ? <NotFound onOpenMenu={openMenu} /> :
    <Suspense fallback={<main className="app-shell"><p className="feedback" role="status">Loading quiz…</p></main>}>
      {route === 'capital-map' ? <CapitalMapQuiz /> : route === 'country-capital' ? <CountryCapitalQuiz /> : route === 'shape-capital' ? <ShapeCapitalQuiz /> : route === 'shape-neighbours' ? <ShapeNeighboursQuiz /> : route === 'shape-high-point' ? <ShapeHighPointQuiz /> : route === 'flag-country' ? <FlagCountryQuiz /> : <BorderCountriesQuiz />}
    </Suspense>}
    <QuizMenu open={menuOpen} currentRoute={route} opener={menuOpener} fallbackOpenerRef={menuOpenerRef} onClose={() => setMenuOpen(false)} onChoose={chooseQuiz} />
  </div>
}

function NotFound({ onOpenMenu }: Readonly<{ onOpenMenu: () => void }>) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { headingRef.current?.focus() }, [])

  return <main className="app-shell not-found" aria-labelledby="not-found-title">
    <p className="eyebrow">Geoquiz</p>
    <h1 ref={headingRef} id="not-found-title" tabIndex={-1}>Quiz not found</h1>
    <p className="hub-intro">That quiz route is not available.</p>
    <button className="primary-link" type="button" onClick={onOpenMenu}>Open quiz menu</button>
  </main>
}
