import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { routeFromHash } from './appRoute'

const CapitalMapQuiz = lazy(() => import('./quizzes/capital-map/CapitalMapQuiz'))
const CountryCapitalQuiz = lazy(() => import('./quizzes/country-capital/CountryCapitalQuiz'))
const ShapeCapitalQuiz = lazy(() => import('./quizzes/shape-capital/ShapeCapitalQuiz'))
const ShapeNeighboursQuiz = lazy(() => import('./quizzes/shape-neighbours/ShapeNeighboursQuiz'))
const ShapeHighPointQuiz = lazy(() => import('./quizzes/shape-high-point/ShapeHighPointQuiz'))
const FlagCountryQuiz = lazy(() => import('./quizzes/flag-country/FlagCountryQuiz'))

export function App() {
  const [route, setRoute] = useState(() => routeFromHash(window.location.hash))

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromHash(window.location.hash))
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    const titles = {
      hub: 'Geoquiz — All quizzes',
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

  if (route === 'hub') return <QuizHub />
  if (route === 'not-found') return <NotFound />
  return <div className={`app-frame${route === 'capital-map' ? ' capital-map-frame' : ''}`}>
    <nav className="quiz-route-nav" aria-label="Quiz navigation"><a href="#/quizzes">All quizzes</a></nav>
    <Suspense fallback={<main className="app-shell"><p className="feedback" role="status">Loading quiz…</p></main>}>
      {route === 'capital-map' ? <CapitalMapQuiz /> : route === 'country-capital' ? <CountryCapitalQuiz /> : route === 'shape-capital' ? <ShapeCapitalQuiz /> : route === 'shape-neighbours' ? <ShapeNeighboursQuiz /> : route === 'shape-high-point' ? <ShapeHighPointQuiz /> : <FlagCountryQuiz />}
    </Suspense>
  </div>
}

function QuizHub() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { headingRef.current?.focus() }, [])

  return <main className="app-shell quiz-hub" aria-labelledby="quiz-hub-title">
    <p className="eyebrow">Geoquiz</p>
    <h1 ref={headingRef} id="quiz-hub-title" tabIndex={-1}>Choose a quiz</h1>
    <p className="hub-intro">Focused, local-first exercises for learning world geography.</p>
    <ul className="quiz-hub-list">
      <li><a href="#/"><strong>Capital dots</strong><span>Identify a highlighted capital from its place on the map.</span></a></li>
      <li><a href="#/country-capital"><strong>Country capitals</strong><span>Name the capital or role-specific capitals for each country.</span></a></li>
      <li><a href="#/shape-capital"><strong>Shape capitals</strong><span>Name a country’s capital from its silhouette.</span></a></li>
      <li><a href="#/shape-neighbours"><strong>Shape neighbours</strong><span>Name every land neighbour from a country silhouette.</span></a></li>
      <li><a href="#/shape-high-point"><strong>Shape highest points</strong><span>Name the highest point marked on a country silhouette.</span></a></li>
      <li><a href="#/flag-country"><strong>Flag countries</strong><span>Identify countries or territories from their local flags.</span></a></li>
    </ul>
  </main>
}

function NotFound() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { headingRef.current?.focus() }, [])

  return <main className="app-shell not-found" aria-labelledby="not-found-title">
    <p className="eyebrow">Geoquiz</p>
    <h1 ref={headingRef} id="not-found-title" tabIndex={-1}>Quiz not found</h1>
    <p className="hub-intro">That quiz route is not available.</p>
    <a className="primary-link" href="#/quizzes">All quizzes</a>
  </main>
}
