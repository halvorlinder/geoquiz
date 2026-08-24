import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent } from 'react'
import { QuizMenu } from './components/QuizMenu'
import { routeFromHash, type AppRoute } from './appRoute'

const CapitalMapQuiz = lazy(() => import('./quizzes/capital-map/CapitalMapQuiz'))
const CountryCapitalQuiz = lazy(() => import('./quizzes/country-capital/CountryCapitalQuiz'))
const ShapeCapitalQuiz = lazy(() => import('./quizzes/shape-capital/ShapeCapitalQuiz'))
const ShapeNeighboursQuiz = lazy(() => import('./quizzes/shape-neighbours/ShapeNeighboursQuiz'))
const ShapeHighPointQuiz = lazy(() => import('./quizzes/shape-high-point/ShapeHighPointQuiz'))
const FlagCountryQuiz = lazy(() => import('./quizzes/flag-country/FlagCountryQuiz'))

export function App() {
  const [route, setRoute] = useState(() => routeFromHash(window.location.hash))
  const [menuOpen, setMenuOpen] = useState(() => window.location.hash === '#/quizzes')
  const [menuOpener, setMenuOpener] = useState<HTMLElement | null>(null)
  const menuOpenerRef = useRef<HTMLButtonElement>(null)
  const canonicalizingLegacyMenuRef = useRef(false)

  function canonicalizeLegacyMenuHash() {
    if (window.location.hash !== '#/quizzes') return false
    canonicalizingLegacyMenuRef.current = true
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#/`)
    setRoute('capital-map')
    setMenuOpen(true)
    window.setTimeout(() => { canonicalizingLegacyMenuRef.current = false }, 0)
    return true
  }

  useEffect(() => {
    canonicalizeLegacyMenuHash()
    const syncRoute = () => {
      if (canonicalizeLegacyMenuHash()) return
      if (canonicalizingLegacyMenuRef.current && window.location.hash === '#/') { setRoute('capital-map'); setMenuOpen(true); return }
      setRoute(routeFromHash(window.location.hash)); setMenuOpen(false)
    }
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    const titles = {
      'capital-map': 'Geoquiz — Capital dots',
      'country-capital': 'Geoquiz — Country capitals',
      'shape-capital': 'Geoquiz — Shape capitals',
      'shape-neighbours': 'Geoquiz — Shape neighbours',
      'shape-high-point': 'Geoquiz — Shape highest points',
      'flag-country': 'Geoquiz — Flag countries',
      'not-found': 'Geoquiz — Quiz not found',
    } as const
    document.title = titles[route]
  }, [route])

  const openMenu = (event?: MouseEvent<HTMLButtonElement>) => { setMenuOpener(event?.currentTarget ?? menuOpenerRef.current); setMenuOpen(true) }
  const chooseQuiz = (item: Readonly<{ route: Exclude<AppRoute, 'not-found'>; hash: string }>) => { setMenuOpen(false); window.location.hash = item.hash }

  const isStudyQuiz = route === 'country-capital' || route === 'shape-capital' || route === 'shape-high-point' || route === 'flag-country'
  return <div className={`app-frame${route === 'capital-map' ? ' capital-map-frame' : ''}${isStudyQuiz ? ' study-quiz-frame' : ''}`}>
    <nav className="quiz-route-nav" aria-label="Quiz navigation"><button ref={menuOpenerRef} className="quiz-menu-trigger" type="button" onClick={openMenu}>All quizzes</button></nav>
    {route === 'not-found' ? <NotFound onOpenMenu={openMenu} /> :
    <Suspense fallback={<main className="app-shell"><p className="feedback" role="status">Loading quiz…</p></main>}>
      {route === 'capital-map' ? <CapitalMapQuiz /> : route === 'country-capital' ? <CountryCapitalQuiz /> : route === 'shape-capital' ? <ShapeCapitalQuiz /> : route === 'shape-neighbours' ? <ShapeNeighboursQuiz /> : route === 'shape-high-point' ? <ShapeHighPointQuiz /> : <FlagCountryQuiz />}
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
