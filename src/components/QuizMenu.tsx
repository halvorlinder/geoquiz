import { useLayoutEffect, useRef, type MouseEvent, type RefObject, type SyntheticEvent } from 'react'
import { routeMetadata, type AppRoute, type QuizRoute } from '../appRoute'

type QuizMenuItem = Readonly<{ route: QuizRoute; name: string; description: string }>

const quizMenuItems: readonly QuizMenuItem[] = [
  { route: 'capital-map', name: 'Capital dots', description: 'Identify a highlighted capital from its place on the map.' },
  { route: 'country-capital', name: 'Country capitals', description: 'Name each country’s capital or capitals.' },
  { route: 'shape-capital', name: 'Shape capitals', description: 'Name a capital from its country silhouette.' },
  { route: 'shape-neighbours', name: 'Shape neighbours', description: 'Name every land neighbour from a country shape.' },
  { route: 'shape-high-point', name: 'Shape highest points', description: 'Name the marked highest point of a country.' },
  { route: 'flag-country', name: 'Flag countries', description: 'Identify countries or territories from their flags.' },
  { route: 'border-countries', name: 'Country borders', description: 'Identify countries from their shared land borders.' },
]

export function QuizMenu({ open, currentRoute, opener, fallbackOpenerRef, onClose, onChoose }: Readonly<{
  open: boolean
  currentRoute: AppRoute
  opener: HTMLElement | null
  fallbackOpenerRef: RefObject<HTMLElement | null>
  onClose: () => void
  onChoose: (route: QuizRoute) => void
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const closingProgrammaticallyRef = useRef(false)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal()
        if (!dialog.open) { dialog.setAttribute('open', ''); dialog.open = true }
      }
      window.setTimeout(() => closeRef.current?.focus(), 0)
    } else {
      closingProgrammaticallyRef.current = true
      if (dialog.open && typeof dialog.close === 'function') dialog.close()
      dialog.removeAttribute('open')
      closingProgrammaticallyRef.current = false
    }
  }, [open])

  function restoreOpener() { window.setTimeout(() => (opener ?? fallbackOpenerRef.current)?.focus(), 0) }
  function closeMenu() { onClose(); restoreOpener() }
  function onCancel(event: SyntheticEvent<HTMLDialogElement>) { event.preventDefault(); closeMenu() }
  function onBackdropClick(event: MouseEvent<HTMLDialogElement>) { if (event.target === event.currentTarget) closeMenu() }
  function chooseQuiz(event: MouseEvent<HTMLAnchorElement>, item: QuizMenuItem) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (item.route === currentRoute) { event.preventDefault(); closeMenu(); return }
    event.preventDefault()
    onChoose(item.route)
  }

  return <dialog ref={dialogRef} className="quiz-menu-dialog" aria-labelledby="quiz-menu-title" onCancel={onCancel} onClose={() => { if (!closingProgrammaticallyRef.current) onClose() }} onClick={onBackdropClick}>
    <div className="quiz-menu-panel">
      <header className="quiz-menu-header">
        <div><p className="eyebrow">Geoquiz</p><h2 id="quiz-menu-title">Choose a quiz</h2></div>
        <button ref={closeRef} className="quiz-menu-close" type="button" onClick={closeMenu} aria-label="Close quiz menu">Close</button>
      </header>
      <p className="quiz-menu-intro">Switch exercises without losing your place until you choose one.</p>
      <ul className="quiz-menu-list">
        {quizMenuItems.map((item) => {
          const current = item.route === currentRoute
          return <li key={item.route}><a className="quiz-menu-item" href={routeMetadata[item.route].path} aria-current={current ? 'page' : undefined} onClick={(event) => chooseQuiz(event, item)}><strong>{item.name}</strong><span>{item.description}</span>{current && <em>Current quiz</em>}</a></li>
        })}
      </ul>
    </div>
  </dialog>
}
