import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Capital } from '../../core/capital'
import { CapitalMapQuiz } from './CapitalMapQuiz'
import { scoreboardKey } from '../../core/scoreboard/scoreboard'

vi.mock('./CapitalMap', () => ({
  CapitalMap: ({ capitals, mode, statusByCapitalId, target, questionNumber }: { capitals: Capital[]; mode: string; statusByCapitalId: Record<string, string>; target: Capital; questionNumber: number }) => (
    <div data-testid="capital-map" data-capital-count={capitals.length} data-mode={mode} data-statuses={JSON.stringify(statusByCapitalId)} data-target={target.capital} data-question-key={questionNumber} />
  ),
}))

const onlyCapital: Capital = {
  id: 'oslo',
  capital: 'Oslo',
  latitude: 59.91,
  longitude: 10.75,
  aliases: [],
  coordinateSource: 'test',
  checked: '2026-08-19',
  entities: [{ code: 'NOR', country: 'Norway', sourceRef: 'test', checked: '2026-08-19' }],
}

const sanaa: Capital = {
  ...onlyCapital,
  id: 'sanaa',
  capital: 'Sanaa',
  entities: [{ code: 'YEM', country: 'Yemen', sourceRef: 'test', checked: '2026-08-19' }],
}

const thirdCapital: Capital = {
  ...onlyCapital,
  id: 'third-city',
  capital: 'Third City',
}

const rome: Capital = {
  ...onlyCapital,
  id: 'rome',
  capital: 'Rome',
  entities: [{ code: 'ITA', country: 'Italy', sourceRef: 'test', checked: '2026-08-19' }],
}

const jerusalem: Capital = {
  ...onlyCapital,
  id: 'jerusalem',
  capital: 'Jerusalem',
  entities: [
    { code: 'ISR', country: 'Israel', sourceRef: 'test', checked: '2026-08-19' },
    { code: 'PSE', country: 'State of Palestine', sourceRef: 'test', checked: '2026-08-19' },
  ],
}

const majuro: Capital = {
  ...onlyCapital,
  id: 'majuro',
  capital: 'Majuro',
  entities: [{ code: 'MHL', country: 'Marshall Islands', sourceRef: 'test', checked: '2026-08-19' }],
}

const monaco: Capital = {
  ...onlyCapital,
  id: 'monaco',
  capital: 'Monaco',
  entities: [{ code: 'MCO', country: 'Monaco', sourceRef: 'test', checked: '2026-08-19' }],
}

function answer(value: string) {
  const input = screen.getByRole('textbox', { name: 'Capital city' })
  fireEvent.change(input, { target: { value } })
  fireEvent.submit(input.closest('form')!)
  return input
}

function installMatchMedia(initialMatches = true) {
  let matches = initialMatches
  const listeners = new Set<() => void>()
  const addEventListener = vi.fn((type: string, listener: () => void) => {
    if (type === 'change') listeners.add(listener)
  })
  const removeEventListener = vi.fn((type: string, listener: () => void) => {
    if (type === 'change') listeners.delete(listener)
  })
  const mediaQuery = {
    get matches() { return matches },
    media: '(min-width: 1200px)',
    onchange: null,
    addEventListener,
    removeEventListener,
    addListener: vi.fn((listener: () => void) => listeners.add(listener)),
    removeListener: vi.fn((listener: () => void) => listeners.delete(listener)),
    dispatchEvent: vi.fn(() => true),
  } as unknown as MediaQueryList
  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
  return {
    addEventListener,
    removeEventListener,
    setMatches(nextMatches: boolean) {
      matches = nextMatches
      for (const listener of listeners) listener()
    },
  }
}

beforeEach(() => {
  installMatchMedia()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

describe('CapitalMapQuiz interaction and focus flow', () => {
  it('keeps Capital dots controls grouped in the active command band', () => {
    const { container } = render(<CapitalMapQuiz data={[onlyCapital]} />)
    const commandBar = container.querySelector('.capital-map-command-bar')
    const setup = container.querySelector('.capital-map-setup')
    expect(commandBar).toBeTruthy()
    expect(commandBar?.querySelector('.masthead')).toBeTruthy()
    expect(commandBar?.contains(setup)).toBe(true)
    expect(screen.getByRole('heading', { name: 'Run setup' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Mode' })).toBeTruthy()
    expect(screen.getByLabelText('Question set')).toBeTruthy()
    expect(container.querySelector('.capital-map-question-set-group')).toBeTruthy()
    expect(container.querySelector('.capital-map-setup-summary')?.textContent).toBe('1 capital place in this setup.Active: Practice · All.')
    expect(container.querySelectorAll('.capital-map-setup-summary p')).toHaveLength(2)
    expect(container.querySelector('.capital-map-setup-action')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start / restart practice' })).toBeTruthy()
  })

  it('keeps focus for a wrong retry', () => {
    render(<CapitalMapQuiz data={[onlyCapital]} />)
    const input = answer('Bergen')
    expect(screen.getByText('Not quite. Try again, or reveal the answer.')).toBeTruthy()
    expect(document.activeElement).toBe(input)
  })

  it('focuses Next after reveal, then the completion restart button, and supports restart', () => {
    render(<CapitalMapQuiz data={[onlyCapital]} />)
    const input = screen.getByRole('textbox', { name: 'Capital city' })
    expect(document.activeElement).toBe(input)

    fireEvent.click(screen.getByRole('button', { name: 'Reveal and skip' }))
    const next = screen.getByRole('button', { name: /Next capital/ })
    expect(document.activeElement).toBe(next)

    fireEvent.click(next)
    const restart = screen.getByRole('button', { name: 'Start a fresh deck' })
    expect(screen.getByRole('heading', { name: 'Deck complete' })).toBeTruthy()
    expect(document.activeElement).toBe(restart)

    fireEvent.click(restart)
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Capital city' }))
  })

  it('scores a correct answer and completes after the confirmation delay', () => {
    vi.useFakeTimers()
    render(<CapitalMapQuiz data={[onlyCapital]} />)
    answer('Oslo')
    expect(screen.getByText('Correct — Oslo is associated with Norway.')).toBeTruthy()
    act(() => vi.advanceTimersByTime(700))
    expect(screen.getByRole('heading', { name: 'Deck complete' })).toBeTruthy()
    expect(screen.getByText('1', { selector: '.score-number' })).toBeTruthy()
    expect(screen.queryByText('Previous answer')).toBeNull()
    expect(window.localStorage.length).toBe(0)
  })

  it('shows one-question-behind facts after a correct answer, retains them through reveal, then replaces them on Next', async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(.999)
    render(<CapitalMapQuiz data={[onlyCapital, sanaa, rome]} />)
    expect(screen.queryByText('Previous answer')).toBeNull()

    answer('Oslo')
    act(() => vi.advanceTimersByTime(700))
    vi.useRealTimers()
    expect(screen.getByTestId('capital-map').getAttribute('data-target')).toBe('Sanaa')
    expect(await screen.findByRole('heading', { name: 'Oslo' })).toBeTruthy()
    expect(screen.getByLabelText('Norway facts')).toBeTruthy()
    expect(screen.getByLabelText('Norway facts').textContent).toContain('Galdhøpiggen · 2,469 m')
    expect(screen.getByAltText('Flag of Norway').getAttribute('src')).toBe('/geoquiz/flags/v1/NOR.svg')
    expect(screen.getByRole('img', { name: 'Silhouette of Norway' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Capital city' }))

    fireEvent.click(screen.getByRole('button', { name: 'Reveal and skip' }))
    expect(screen.getByRole('heading', { name: 'Oslo' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Next capital/ }))

    fireEvent.click(screen.getByRole('button', { name: /Next capital/ }))
    expect(screen.getByTestId('capital-map').getAttribute('data-target')).toBe('Rome')
    expect(await screen.findByRole('heading', { name: 'Sanaa' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Oslo' })).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Capital city' }))
  })

  it('clears a practice recap on applied setup changes and throughout Timed play, but preserves it for draft-only changes', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(.999)
    render(<CapitalMapQuiz data={[onlyCapital, sanaa]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal and skip' }))
    fireEvent.click(screen.getByRole('button', { name: /Next capital/ }))
    expect(await screen.findByRole('heading', { name: 'Oslo' })).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Question set'), { target: { value: 'Asia' } })
    expect(screen.getByRole('heading', { name: 'Oslo' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Start / restart practice' }))
    expect(screen.queryByRole('heading', { name: 'Oslo' })).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: 'Timed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    expect(screen.queryByText('Previous answer')).toBeNull()
  })

  it('shows the visible geoBoundaries attribution for an overridden recap silhouette', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(.999)
    render(<CapitalMapQuiz data={[monaco, sanaa]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal and skip' }))
    fireEvent.click(screen.getByRole('button', { name: /Next capital/ }))
    expect((await screen.findAllByRole('heading', { name: 'Monaco' })).length).toBe(2)
    expect(screen.getByRole('link', { name: 'geoBoundaries' }).getAttribute('href')).toBe('/geoquiz/country-shape-credits.html')
    expect(screen.getByText(/ODbL 1\.0/)).toBeTruthy()
    expect(screen.getByRole('link', { name: '© OpenStreetMap contributors' })).toBeTruthy()
  })

  it('keeps the recap unmounted below 1200px, restores it when widening, and cleans up the viewport listener', async () => {
    const viewport = installMatchMedia(false)
    vi.spyOn(Math, 'random').mockReturnValue(.999)
    const { unmount } = render(<CapitalMapQuiz data={[onlyCapital, sanaa, rome]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal and skip' }))
    fireEvent.click(screen.getByRole('button', { name: /Next capital/ }))
    expect(screen.getByTestId('capital-map').getAttribute('data-target')).toBe('Sanaa')
    expect(screen.queryByText('Previous answer')).toBeNull()
    expect(screen.queryByAltText('Flag of Norway')).toBeNull()
    expect(document.querySelector('.quiz-layout-with-recap')).toBeNull()

    act(() => viewport.setMatches(true))
    expect(await screen.findByRole('heading', { name: 'Oslo' })).toBeTruthy()
    expect(document.querySelector('.quiz-layout-with-recap')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal and skip' }))
    expect(screen.getByRole('heading', { name: 'Oslo' })).toBeTruthy()

    act(() => viewport.setMatches(false))
    expect(screen.queryByText('Previous answer')).toBeNull()
    expect(document.querySelector('.quiz-layout-with-recap')).toBeNull()

    act(() => viewport.setMatches(true))
    expect(await screen.findByRole('heading', { name: 'Oslo' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Next capital/ }))
    expect(await screen.findByRole('heading', { name: 'Sanaa' })).toBeTruthy()
    unmount()
    expect(viewport.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(viewport.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('renders neutral, separate facts for every Jerusalem association and omits missing elevations', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(.999)
    const { rerender } = render(<CapitalMapQuiz data={[jerusalem, onlyCapital]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal and skip' }))
    fireEvent.click(screen.getByRole('button', { name: /Next capital/ }))
    expect(await screen.findByRole('heading', { name: 'Jerusalem' })).toBeTruthy()
    expect(screen.getByLabelText('Israel facts')).toBeTruthy()
    expect(screen.getByLabelText('State of Palestine facts')).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByAltText('Flag of Israel').getAttribute('src')).toBe('/geoquiz/flags/v1/ISR.svg')
    expect(screen.getByAltText('Flag of State of Palestine').getAttribute('src')).toBe('/geoquiz/flags/v1/PSE.svg')

    rerender(<CapitalMapQuiz key="italy-recap" data={[rome, onlyCapital]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal and skip' }))
    fireEvent.click(screen.getByRole('button', { name: /Next capital/ }))
    const italyFacts = await screen.findByLabelText('Italy facts')
    expect(italyFacts.textContent).toContain('Highest pointMont Blanc')
    expect(italyFacts.textContent).not.toMatch(/\d[\d,]* m/)

    rerender(<CapitalMapQuiz key="marshall-islands-recap" data={[majuro, onlyCapital]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal and skip' }))
    fireEvent.click(screen.getByRole('button', { name: /Next capital/ }))
    expect((await screen.findByLabelText('Marshall Islands facts')).textContent).toContain('Unnamed point, Likiep Atoll · 10 m')
  })

  it('keeps recap fact resources behind a dynamic import', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/quizzes/capital-map/CapitalMapQuiz.tsx'), 'utf8')
    expect(source).toContain("lazy(() => import('./PracticePreviousAnswerRecap'))")
    expect(source).not.toContain("from './PracticePreviousAnswerRecap'")
    expect(source).toContain("previousAnswer !== null && active.mode === 'practice' && fullSizeViewport")
  })

  it('keeps draft continent changes from altering a live practice deck until explicitly restarted', () => {
    render(<CapitalMapQuiz data={[onlyCapital, sanaa]} />)
    expect(screen.getByTestId('capital-map').getAttribute('data-capital-count')).toBe('2')

    fireEvent.change(screen.getByLabelText('Question set'), { target: { value: 'Asia' } })
    expect(screen.getByText(/Active: Practice · All/)).toBeTruthy()
    expect(screen.getByTestId('capital-map').getAttribute('data-capital-count')).toBe('2')

    fireEvent.click(screen.getByRole('button', { name: 'Start / restart practice' }))
    expect(screen.getByText(/Active: Practice · Asia/)).toBeTruthy()
    expect(screen.getByTestId('capital-map').getAttribute('data-capital-count')).toBe('1')
  })

  it('starts timed play only explicitly, hides Check, and records one completed result for its filter', () => {
    vi.useFakeTimers()
    render(<CapitalMapQuiz data={[onlyCapital]} />)
    expect(screen.getByTestId('capital-map').getAttribute('data-mode')).toBe('practice')

    fireEvent.click(screen.getByRole('radio', { name: 'Timed' }))
    expect(screen.getByRole('button', { name: 'Start timed run' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Check answer' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))

    expect(screen.getByTestId('capital-map').getAttribute('data-mode')).toBe('timed')
    expect(screen.queryByRole('button', { name: 'Check answer' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reveal answer' })).toBeTruthy()
    act(() => vi.advanceTimersByTime(1_250))
    fireEvent.change(screen.getByRole('textbox', { name: 'Capital city' }), { target: { value: 'Oslo' } })
    expect(screen.getByText('Correct — Oslo.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
    const key = scoreboardKey({ quizId: 'capital-map', filters: { continent: 'All' }, dataVersion: 'test' })
    const stored = JSON.parse(window.localStorage.getItem(key) ?? '{}')
    expect(stored.entries).toHaveLength(1)
    expect(stored.entries[0].durationMs).toBe(1_250)
    act(() => vi.advanceTimersByTime(5_000))
    expect(JSON.parse(window.localStorage.getItem(key) ?? '{}').entries).toHaveLength(1)
  })

  it('does not auto-advance while a fuzzy input remains a strict prefix of the answer', () => {
    vi.useFakeTimers()
    render(<CapitalMapQuiz data={[sanaa]} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Timed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Capital city' }), { target: { value: 'Sana' } })
    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.queryByRole('heading', { name: 'Timed run complete' })).toBeNull()
    expect((screen.getByRole('textbox', { name: 'Capital city' }) as HTMLInputElement).value).toBe('Sana')
  })

  it('waits for an IME composition to end before evaluating the committed timed answer', () => {
    render(<CapitalMapQuiz data={[onlyCapital]} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Timed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const input = screen.getByRole('textbox', { name: 'Capital city' })
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'Oslo' } })
    expect(screen.queryByRole('heading', { name: 'Timed run complete' })).toBeNull()
    fireEvent.compositionEnd(input, { data: 'Oslo' })
    expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
  })

  it('rotates a two-question skip queue before returning to the first target', () => {
    render(<CapitalMapQuiz data={[onlyCapital, sanaa]} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Timed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const firstTarget = screen.getByTestId('capital-map').getAttribute('data-target')
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    const secondTarget = screen.getByTestId('capital-map').getAttribute('data-target')
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(secondTarget).not.toBe(firstTarget)
    expect(screen.getByTestId('capital-map').getAttribute('data-target')).toBe(firstTarget)
  })

  it('ignores a repeated Skip click but accepts a later first click immediately', () => {
    render(<CapitalMapQuiz data={[onlyCapital, sanaa, thirdCapital]} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Timed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const firstTarget = screen.getByTestId('capital-map').getAttribute('data-target')
    const skip = screen.getByRole('button', { name: 'Skip' })
    fireEvent.click(skip, { detail: 1 })
    const afterFirstSkip = screen.getByTestId('capital-map').getAttribute('data-target')
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }), { detail: 2 })
    expect(afterFirstSkip).not.toBe(firstTarget)
    expect(screen.getByTestId('capital-map').getAttribute('data-target')).toBe(afterFirstSkip)

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }), { detail: 1 })
    expect(screen.getByTestId('capital-map').getAttribute('data-target')).not.toBe(afterFirstSkip)
  })

  it('ignores a repeated Reveal click but accepts a later first click immediately', () => {
    render(<CapitalMapQuiz data={[onlyCapital, sanaa, thirdCapital]} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Timed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const firstTarget = screen.getByTestId('capital-map').getAttribute('data-target')
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }), { detail: 1 })
    const afterFirstReveal = screen.getByTestId('capital-map').getAttribute('data-target')
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }), { detail: 2 })
    expect(afterFirstReveal).not.toBe(firstTarget)
    expect(screen.getByTestId('capital-map').getAttribute('data-target')).toBe(afterFirstReveal)

    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }), { detail: 1 })
    expect(screen.getByTestId('capital-map').getAttribute('data-target')).not.toBe(afterFirstReveal)
  })

  it('allows immediate first-click Skip followed by Reveal as separate manual actions', () => {
    render(<CapitalMapQuiz data={[onlyCapital]} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Timed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }), { detail: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }), { detail: 1 })
    expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
    expect(screen.getByText('Revealed — Oslo.')).toBeTruthy()
  })

  it('prevents only repeated Enter and Space keydown activations on manual controls', () => {
    render(<CapitalMapQuiz data={[onlyCapital]} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Timed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const skip = screen.getByRole('button', { name: 'Skip' })
    const reveal = screen.getByRole('button', { name: 'Reveal answer' })
    const initialEnter = createEvent.keyDown(skip, { key: 'Enter', repeat: false })
    fireEvent(skip, initialEnter)
    const repeatedEnter = createEvent.keyDown(skip, { key: 'Enter', repeat: true })
    fireEvent(skip, repeatedEnter)
    const initialSpace = createEvent.keyDown(reveal, { key: ' ', repeat: false })
    fireEvent(reveal, initialSpace)
    const repeatedSpace = createEvent.keyDown(reveal, { key: ' ', repeat: true })
    fireEvent(reveal, repeatedSpace)

    expect(initialEnter.defaultPrevented).toBe(false)
    expect(repeatedEnter.defaultPrevented).toBe(true)
    expect(initialSpace.defaultPrevented).toBe(false)
    expect(repeatedSpace.defaultPrevented).toBe(true)
  })

  it('keeps scoreboard keys isolated by active continent and renders complete mixed-result rows', () => {
    render(<CapitalMapQuiz data={[onlyCapital, sanaa]} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Timed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Capital city' }), { target: { value: screen.getByTestId('capital-map').getAttribute('data-target') ?? '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    expect(screen.getAllByText(/1 correct · 1 revealed · 2 total/)).toHaveLength(2)
    expect(screen.getByRole('listitem').textContent).toMatch(/0:00 · 1 correct · 1 revealed · 2 total/)

    const allKey = scoreboardKey({ quizId: 'capital-map', filters: { continent: 'All' }, dataVersion: 'test' })
    expect(JSON.parse(window.localStorage.getItem(allKey) ?? '{}').entries).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Question set'), { target: { value: 'Asia' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Capital city' }), { target: { value: 'Sanaa' } })

    const asiaKey = scoreboardKey({ quizId: 'capital-map', filters: { continent: 'Asia' }, dataVersion: 'test' })
    expect(JSON.parse(window.localStorage.getItem(allKey) ?? '{}').entries).toHaveLength(1)
    expect(JSON.parse(window.localStorage.getItem(asiaKey) ?? '{}').entries).toHaveLength(1)
  })

  it('still completes when scoreboard writes are blocked and accurately describes optional storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    render(<CapitalMapQuiz data={[onlyCapital]} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Timed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Capital city' }), { target: { value: 'Oslo' } })
    expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
    expect(screen.getByText('Results stay on this device when browser storage is available.')).toBeTruthy()
  })

  it('keeps the sole skipped capital pending, then completes immediately while retaining its revealed answer', () => {
    render(<CapitalMapQuiz data={[onlyCapital]} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Timed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByText('Skipped. This is the only pending capital, so it remains current.')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Timed run complete' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    expect(screen.getByText('Revealed — Oslo.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
    expect(screen.getAllByText(/0 correct · 1 revealed · 1 total/)).toHaveLength(2)
  })

  it('restores the input focus when a same-target timed skip and explicit restart advance the presentation key', () => {
    render(<CapitalMapQuiz data={[onlyCapital]} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Timed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const initialKey = Number(screen.getByTestId('capital-map').getAttribute('data-question-key'))
    const skip = screen.getByRole('button', { name: 'Skip' })
    skip.focus()
    fireEvent.click(skip)
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Capital city' }))
    const skippedKey = Number(screen.getByTestId('capital-map').getAttribute('data-question-key'))
    expect(skippedKey).toBeGreaterThan(initialKey)
    fireEvent.click(screen.getByRole('radio', { name: 'Practice' }))
    const restart = screen.getByRole('button', { name: 'Start / restart practice' })
    restart.focus()
    fireEvent.click(restart)

    expect(screen.getByTestId('capital-map').getAttribute('data-mode')).toBe('practice')
    expect(screen.getByRole('button', { name: 'Check answer' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Capital city' }))
    expect(Number(screen.getByTestId('capital-map').getAttribute('data-question-key'))).toBeGreaterThan(skippedKey)
  })
})
