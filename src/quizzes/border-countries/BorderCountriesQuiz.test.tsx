import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BorderCountriesQuiz } from './BorderCountriesQuiz'
import { scoreboardKey } from '../../core/scoreboard/scoreboard'
import { normalizeAnswer } from '../../core/answerMatching'
import { BORDER_DATA_VERSION, borderEntity, borderQuestions, borderSetupNote, borderShape, type BorderQuestion } from './borderCountries'
import { borderContextGeometry } from './borderContextGeometry'
import { allBorderRunsFocus } from './borderContextViewport'

const quizLeaflet = vi.hoisted(() => ({ fitBounds: vi.fn(), stop: vi.fn(), invalidateSize: vi.fn() }))
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, className }: { children: ReactNode; className: string }) => <div className={className}>{children}</div>,
  Pane: ({ children }: { children: ReactNode }) => <>{children}</>,
  GeoJSON: ({ data, style }: { data: { properties?: Record<string, never>; geometry?: { coordinates?: unknown } }; style?: { className?: string } }) => <div className={style?.className} data-properties={JSON.stringify(data.properties ?? {})} data-geometry={JSON.stringify(data.geometry?.coordinates ?? [])} />,
  useMap: () => ({ ...quizLeaflet, getContainer: () => document.querySelector('.easy-border-context-map') as HTMLElement }),
}))

const easy = borderQuestions('easy', 'All', () => 0)[0]
const easy2 = borderQuestions('easy', 'All', () => 0).find((question) => question.knownCode !== easy.knownCode)!
const easy3 = borderQuestions('easy', 'All', () => 0).find((question) => question.knownCode !== easy.knownCode && question.knownCode !== easy2.knownCode)!
const hard = borderQuestions('hard', 'All', () => 0)[0]
const iran = borderQuestions('easy', 'All', () => 0).find((question) => question.codes.join(',') === 'AFG,IRN')!
const unitedStates = borderQuestions('easy', 'All', () => 0).find((question) => question.codes.join(',') === 'CAN,USA')!
const hardMulti = borderQuestions('hard', 'All', () => 0).find((question) => question.codes.join(',') === 'ESP,FRA')!
const answerName = (question: BorderQuestion) => borderEntity(question.answerCode!)!.name
const factory = (...questions: BorderQuestion[]) => () => questions
const stableRandom = () => 0
function shown(questions: readonly BorderQuestion[]) { return questions.find((question) => screen.getByRole('heading', { name: /Which country borders/ }).textContent?.includes(borderEntity(question.knownCode!)!.name))! }

afterEach(() => window.localStorage.clear())

describe('BorderCountriesQuiz', () => {
  it('starts Easy with a local source disclosure and moves to a non-disclosing Hard prompt', () => {
    const { container } = render(<BorderCountriesQuiz />)
    expect(screen.getByRole('heading', { name: /Which country borders/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Border data sources' }).getAttribute('href')).toBe('/geoquiz/border-data-sources.html')
    fireEvent.click(screen.getByLabelText('Hard'))
    fireEvent.click(screen.getByRole('button', { name: 'Start / restart practice' }))
    expect(screen.getByRole('heading', { name: 'Which countries share this border?' })).toBeTruthy()
    expect(screen.getByLabelText('Country')).toBeTruthy()
    expect(container.querySelector('.border-answer-chips')).toBeNull()
  })
  it('uses the neutral Border quiz eyebrow while active and after Practice or Timed completion', () => {
    const practice = render(<BorderCountriesQuiz questionFactory={factory(easy)} />)
    expect(screen.getByText('Border quiz')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Other country'), { target: { value: answerName(easy) } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next border' }))
    expect(screen.getByRole('heading', { name: 'Deck complete' })).toBeTruthy()
    expect(screen.getByText('Border quiz')).toBeTruthy()
    expect(screen.queryByText('Image quiz')).toBeNull()
    practice.unmount()

    render(<BorderCountriesQuiz questionFactory={factory(easy)} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.change(screen.getByLabelText('Other country'), { target: { value: answerName(easy) } })
    expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
    expect(screen.getByText('Border quiz')).toBeTruthy()
    expect(screen.queryByText('Image quiz')).toBeNull()
  })
  it('offers deterministic development-only Chrome fixture URLs while keeping Hard line-only', () => {
    const original = window.location.hash
    try {
      for (const [fixture, known] of [['rus-prk', 'Russia'], ['bwa-botswana', 'Botswana'], ['bwa-zambia', 'Zambia'], ['vatican-italy', 'Italy'], ['liechtenstein', 'Liechtenstein'], ['spain-morocco', 'Spain'], ['france-monaco', 'France'], ['esp-fra', 'Spain'], ['esp-mar', 'Spain'], ['can-usa', 'Canada'], ['arm-aze', 'Armenia']] as const) {
        window.location.hash = `#/border-countries?qa=${fixture}`
        const view = render(<BorderCountriesQuiz />)
        expect(screen.getByRole('heading', { name: `Which country borders ${known}?` })).toBeTruthy()
        view.unmount()
      }
      window.location.hash = '#/border-countries?qa=hard'
      const hardFixture = render(<BorderCountriesQuiz />)
      expect(screen.getByRole('heading', { name: 'Which countries share this border?' })).toBeTruthy()
      expect(screen.getByRole('status').textContent).toBe('Name both countries sharing this border.')
      expect(screen.getByRole('status').textContent).not.toContain('other side')
      expect(hardFixture.container.querySelector('.easy-border-context-map, .leaflet-container')).toBeNull()
      expect(hardFixture.container.querySelector('.border-image-hard')).toBeTruthy()
      hardFixture.unmount()
      window.location.hash = '#/border-countries?qa=hard-multi'
      const multiHardFixture = render(<BorderCountriesQuiz />)
      expect(screen.getByText('2 border sections')).toBeTruthy()
      expect(multiHardFixture.container.querySelector('.easy-border-context-map, .leaflet-container')).toBeNull()
    } finally { window.location.hash = original }
  })
  it('refits a restarted Easy fixture card and restores input focus without remounting a resolved answer', async () => {
    const original = window.location.hash
    try {
      window.location.hash = '#/border-countries?qa=bwa-botswana'
      quizLeaflet.fitBounds.mockClear()
      render(<BorderCountriesQuiz />)
      const initialFits = quizLeaflet.fitBounds.mock.calls.length
      expect(initialFits).toBeGreaterThan(0)
      fireEvent.click(screen.getByRole('button', { name: 'Start / restart practice' }))
      await waitFor(() => expect(quizLeaflet.fitBounds.mock.calls.length).toBeGreaterThan(initialFits))
      await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Other country')))
    } finally { window.location.hash = original }
  })
  it('resets a same-card multi-run Easy restart from local section focus to the all-run union', async () => {
    const original = window.location.hash
    try {
      window.location.hash = '#/border-countries?qa=can-usa'
      quizLeaflet.fitBounds.mockClear()
      const { container } = render(<BorderCountriesQuiz />)
      const focus=allBorderRunsFocus(unitedStates.runs)
      const unionBounds=[[focus.bounds[0],focus.bounds[1]],[focus.bounds[2],focus.bounds[3]]]
      const unionOptions={ animate:true,maxZoom:focus.maxZoom,padding:[focus.padding[0],focus.padding[1]] }
      fireEvent.change(screen.getByLabelText('Other country'), { target: { value: answerName(unitedStates) } })
      fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
      fireEvent.click(screen.getByRole('button', { name: 'Focus next section' }))
      expect(quizLeaflet.fitBounds).toHaveBeenLastCalledWith(expect.not.arrayContaining(unionBounds),expect.anything())
      fireEvent.click(screen.getByRole('button', { name: 'Start / restart practice' }))
      await waitFor(() => expect(quizLeaflet.fitBounds).toHaveBeenLastCalledWith(unionBounds,expect.objectContaining(unionOptions)))
      await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Other country')))
      expect(container.querySelector('.easy-border-answer')).toBeNull()
      expect(container.querySelector('.border-reveal-answer')).toBeNull()
    } finally { window.location.hash = original }
  })
  it('resets a one-disclosed multi-run Hard local focus to the union on either final disclosure path', async () => {
    const original = window.location.hash
    const first=borderEntity(hardMulti.codes[0])!.name, second=borderEntity(hardMulti.codes[1])!.name
    const focus=allBorderRunsFocus(hardMulti.runs)
    const unionBounds=[[focus.bounds[0],focus.bounds[1]],[focus.bounds[2],focus.bounds[3]]]
    const unionOptions={ animate:true,maxZoom:focus.maxZoom,padding:[focus.padding[0],focus.padding[1]] }
    const beginOneDisclosed=async () => {
      window.location.hash = '#/border-countries?qa=hard-multi'
      quizLeaflet.fitBounds.mockClear()
      const view=render(<BorderCountriesQuiz />)
      fireEvent.change(screen.getByLabelText('Country'), { target: { value: first } })
      fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
      await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Country')))
      expect(view.container.querySelectorAll('.easy-border-selected-run-halo, .easy-border-selected-run')).toHaveLength(2)
      fireEvent.click(screen.getByRole('button', { name: 'Focus next section' }))
      expect(quizLeaflet.fitBounds).toHaveBeenLastCalledWith(expect.not.arrayContaining(unionBounds),expect.anything())
      return view
    }
    try {
      const correctPath=await beginOneDisclosed()
      fireEvent.change(screen.getByLabelText('Country'), { target: { value: second } })
      fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
      await waitFor(() => expect(quizLeaflet.fitBounds).toHaveBeenLastCalledWith(unionBounds,expect.objectContaining(unionOptions)))
      expect(correctPath.container.querySelectorAll('.easy-border-selected-run-halo, .easy-border-selected-run')).toHaveLength(2)
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next border' })))
      correctPath.unmount()

      const revealPath=await beginOneDisclosed()
      fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
      await waitFor(() => expect(quizLeaflet.fitBounds).toHaveBeenLastCalledWith(unionBounds,expect.objectContaining(unionOptions)))
      expect(revealPath.container.querySelectorAll('.easy-border-selected-run-halo, .easy-border-selected-run')).toHaveLength(2)
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next border' })))
      revealPath.unmount()
    } finally { window.location.hash = original }
  })
  it('keeps native timed setup and the border-touching continent description', () => {
    render(<BorderCountriesQuiz />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByLabelText('Hard'))
    fireEvent.change(screen.getByLabelText('Continent'), { target: { value: 'Europe' } })
    expect(screen.getByText(/Borders touching that continent\./)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start timed run' })).toBeTruthy()
  })
  it('uses the accurate setup copy for Easy and both Hard continent branches with a uniquely named continent control', () => {
    expect(borderSetupNote('easy', 'All')).toBe('Easy shows a known country.')
    expect(borderSetupNote('easy', 'Europe')).toBe('Easy shows a known country.')
    expect(borderSetupNote('hard', 'All')).toBe('Hard shows only the shared border line.')
    expect(borderSetupNote('hard', 'Europe')).toBe('Borders touching that continent.')
    render(<BorderCountriesQuiz random={stableRandom} />)
    const continent = screen.getByLabelText('Continent')
    expect(continent).toHaveProperty('id', 'border-continent'); expect(continent).toHaveProperty('name', 'border-continent')
    expect(screen.getByText(/Easy shows a known country/)).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Hard')); expect(screen.getByText(/Hard shows only the shared border line/)).toBeTruthy()
    fireEvent.change(continent, { target: { value: 'Europe' } }); expect(screen.getByText(/Borders touching that continent/)).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Easy')); expect(screen.getByText(/Easy shows a known country/)).toBeTruthy()
  })
  it('allows a fresh Practice reveal after advancing from a revealed card', () => {
    render(<BorderCountriesQuiz questionFactory={factory(easy, easy2)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    expect(document.querySelector('.border-reveal-answer')?.textContent).toMatch(/ and /)
    expect(screen.getByRole('button', { name: 'Next border' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next border' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    expect(screen.getByRole('button', { name: 'Next border' })).toBeTruthy()
    expect(document.querySelector('.border-reveal-answer')?.textContent).toMatch(/ and /)
  })
  it('checks wrong and fuzzy Practice answers explicitly, then advances with logical focus', async () => {
    render(<BorderCountriesQuiz questionFactory={factory(easy)} />)
    const input = screen.getByLabelText('Other country')
    fireEvent.change(input, { target: { value: 'Germnay' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('status').textContent).toMatch(/does not answer this border/)
    fireEvent.change(input, { target: { value: answerName(easy).slice(0, -1) } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('button', { name: 'Next border' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Correct. Continue when you are ready.')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next border' })))
  })
  it('accumulates either Hard answer order without disclosing target names before a match', () => {
    render(<BorderCountriesQuiz questionFactory={factory(hard)} />)
    fireEvent.click(screen.getByLabelText('Hard'))
    fireEvent.click(screen.getByRole('button', { name: 'Start / restart practice' }))
    const names = hard.codes.map((code) => borderEntity(code)!.name)
    expect(screen.getByRole('main').textContent).not.toContain(names[0])
    const input = screen.getByLabelText('Country')
    fireEvent.change(input, { target: { value: names[1] } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByLabelText('Answered countries').textContent).toContain(names[1])
    fireEvent.change(input, { target: { value: names[0] } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
    expect(screen.getByRole('button', { name: 'Next border' })).toBeTruthy()
    expect(document.querySelectorAll('.easy-border-answer-correct')).toHaveLength(2)
    expect(document.querySelectorAll('.easy-border-answer-revealed')).toHaveLength(0)
  })
  it('progressively renders only disclosed Hard Practice countries and locks one-country reveal after use', async () => {
    render(<BorderCountriesQuiz questionFactory={factory(hard)} />)
    fireEvent.click(screen.getByLabelText('Hard')); fireEvent.click(screen.getByRole('button', { name: 'Start / restart practice' }))
    const names=hard.codes.map(code=>borderEntity(code)!.name)
    expect(document.querySelector('.easy-border-context-map')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal one country' }))
    expect(screen.getByLabelText('Revealed countries').textContent).toContain(names[0])
    expect(screen.getByLabelText('Revealed countries').textContent).toContain('Revealed')
    expect(screen.queryByRole('button', { name: 'Reveal one country' })).toBeNull()
    expect(document.querySelector('.easy-border-context-map')?.getAttribute('aria-label')).toContain(names[0])
    expect(document.querySelector('.easy-border-context-map')?.getAttribute('aria-label')).not.toContain(names[1])
    expect(document.querySelector('.border-question-card--hard.border-question-card--context')).toBeTruthy()
    expect(document.querySelector('.border-answer-form .border-answer-actions')).toBeTruthy()
    const input=screen.getByLabelText('Country')
    fireEvent.change(input,{target:{value:names[1]}}); fireEvent.click(screen.getByRole('button',{name:'Check answer'}))
    expect(screen.getByRole('button',{name:'Next border'})).toBeTruthy()
    await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('button',{name:'Next border'})))
    fireEvent.click(screen.getByRole('button',{name:'Next border'}))
    expect(document.querySelector('.score-number')?.textContent).toContain('0correct')
  })
  it('keeps one-country reveal idempotent for held keys and repeated pointer activation', () => {
    render(<BorderCountriesQuiz questionFactory={factory(hard)} />)
    fireEvent.click(screen.getByLabelText('Hard')); fireEvent.click(screen.getByRole('button', { name: 'Start / restart practice' }))
    const revealOne=screen.getByRole('button',{name:'Reveal one country'})
    expect(fireEvent.keyDown(revealOne,{key:'Enter',repeat:true})).toBe(false)
    fireEvent.click(revealOne,{detail:1}); fireEvent.click(revealOne,{detail:2})
    expect(screen.getByLabelText('Revealed countries').children).toHaveLength(1)
    expect(screen.queryByRole('button',{name:'Reveal one country'})).toBeNull()
  })
  it('renders visible, non-colour Hard status labels with distinct correct and revealed treatments', () => {
    render(<BorderCountriesQuiz questionFactory={factory(hard)} />)
    fireEvent.click(screen.getByLabelText('Hard')); fireEvent.click(screen.getByRole('button', { name: 'Start / restart practice' }))
    const [first,second]=hard.codes.map(code=>borderEntity(code)!.name)
    fireEvent.change(screen.getByLabelText('Country'),{target:{value:first}});fireEvent.click(screen.getByRole('button',{name:'Check answer'}))
    fireEvent.click(screen.getByRole('button',{name:'Reveal one country'}))
    expect(screen.getByLabelText('Answered countries').textContent).toContain('Correct')
    expect(screen.getByLabelText('Revealed countries').textContent).toContain(`Revealed`)
    expect(document.querySelector('.border-revealed-chips')).toBeTruthy()
    expect(document.querySelector('.easy-border-answer-correct')).toBeTruthy()
    expect(document.querySelector('.easy-border-answer-revealed')).toBeTruthy()
    expect(second).toBeTruthy()
  })
  it('renders both Hard countries for full Practice reveal but never mounts a map for Timed Hard', () => {
    const practice=render(<BorderCountriesQuiz questionFactory={factory(hard)} />)
    fireEvent.click(screen.getByLabelText('Hard')); fireEvent.click(screen.getByRole('button', { name: 'Start / restart practice' }))
    fireEvent.click(screen.getByRole('button',{name:'Reveal answers'}))
    expect(screen.getByLabelText('Revealed countries').children).toHaveLength(2)
    expect(document.querySelector('.easy-border-context-map')?.getAttribute('aria-label')).toContain(borderEntity(hard.codes[0])!.name)
    practice.unmount()
    render(<BorderCountriesQuiz questionFactory={factory(hard)} />)
    fireEvent.click(screen.getByLabelText('Hard')); fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button',{name:'Start timed run'}))
    expect(document.querySelector('.easy-border-context-map')).toBeNull()
    expect(screen.queryByRole('button',{name:'Reveal one country'})).toBeNull()
  })
  it('keeps one Hard chip per answer, reports duplicate and known-wrong input, then resolves in either order', async () => {
    for (const names of [hard.codes.map((code) => borderEntity(code)!.name), [...hard.codes].reverse().map((code) => borderEntity(code)!.name)]) {
      const view = render(<BorderCountriesQuiz questionFactory={factory(hard)} />)
      fireEvent.click(screen.getByLabelText('Hard')); fireEvent.click(screen.getByRole('button', { name: 'Start / restart practice' }))
      const input = screen.getByLabelText('Country')
      fireEvent.change(input, { target: { value: names[0] } }); fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
      expect(screen.getByLabelText('Answered countries').children).toHaveLength(1)
      await waitFor(() => expect(document.activeElement).toBe(input))
      fireEvent.change(input, { target: { value: names[0] } }); fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
      expect(screen.getByRole('status').textContent).toMatch(/already recorded/); expect(screen.getByLabelText('Answered countries').children).toHaveLength(1)
      fireEvent.change(input, { target: { value: 'Canada' } }); fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
      expect(screen.getByRole('status').textContent).toMatch(/does not answer this border/); expect(document.activeElement).toBe(input)
      fireEvent.change(input, { target: { value: names[1] } }); fireEvent.click(screen.getByRole('button', { name: 'Check answer' }))
      expect(screen.getByRole('button', { name: 'Next border' })).toBeTruthy()
      view.unmount()
    }
  })
  it('keeps a timed reveal acknowledgement focused and continues to the next input', async () => {
    render(<BorderCountriesQuiz questionFactory={factory(easy, easy2)} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    const acknowledgement = screen.getByRole('region', { name: 'Answers revealed' })
    await waitFor(() => expect(document.activeElement).toBe(acknowledgement))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Other country')))
  })
  it('focuses Restart after a final timed reveal and ignores a repeated Continue click', async () => {
    render(<BorderCountriesQuiz questionFactory={factory(easy)} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    const continueButton = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(continueButton, { detail: 1 })
    fireEvent.click(continueButton, { detail: 2 })
    const restart = await screen.findByRole('button', { name: 'Restart timed run' })
    await waitFor(() => expect(document.activeElement).toBe(restart))
    expect(document.querySelector('.score-number')?.textContent).toContain('0 correct · 1 revealed · 1 total')
    const key = scoreboardKey({ quizId: 'border-countries', filters: { continent: 'All', difficulty: 'easy', orientation: '1' }, dataVersion: BORDER_DATA_VERSION })
    expect(JSON.parse(window.localStorage.getItem(key) ?? '{}').entries[0]).toMatchObject({ correctCount: 0, revealedCount: 1, totalCount: 1, dataVersion: BORDER_DATA_VERSION })
  })
  it('records and presents a mixed timed correct/revealed outcome with the scoped board key', async () => {
    render(<BorderCountriesQuiz questionFactory={factory(easy, easy2)} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const first = shown([easy, easy2]); fireEvent.change(screen.getByLabelText('Other country'), { target: { value: answerName(first) } })
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Other country')))
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'Timed run complete' })
    expect(document.querySelector('.score-number')?.textContent).toContain('1 correct · 1 revealed · 2 total')
    const key = scoreboardKey({ quizId: 'border-countries', filters: { continent: 'All', difficulty: 'easy', orientation: '1' }, dataVersion: BORDER_DATA_VERSION })
    expect(JSON.parse(window.localStorage.getItem(key) ?? '{}').entries[0]).toMatchObject({ correctCount: 1, revealedCount: 1, totalCount: 2 })
  })
  it('suppresses held-key activation on timed skip and reveal controls', () => {
    render(<BorderCountriesQuiz questionFactory={factory(easy, easy2)} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const skip = screen.getByRole('button', { name: 'Skip' })
    const reveal = screen.getByRole('button', { name: 'Reveal answer' })
    expect(fireEvent.keyDown(skip, { key: 'Enter', repeat: true })).toBe(false)
    expect(fireEvent.keyDown(reveal, { key: ' ', repeat: true })).toBe(false)
  })
  it('uses canonical, alias and v2 abbreviation answers to auto-advance timed cards while partial, fuzzy and codes stay put', () => {
    for (const [question, value] of [[easy, answerName(easy)], [iran, 'Islamic Republic of Iran'], [unitedStates, 'US']] as const) {
      const view = render(<BorderCountriesQuiz questionFactory={factory(question)} random={stableRandom} />)
      fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
      fireEvent.change(screen.getByLabelText('Other country'), { target: { value } })
      expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
      view.unmount()
    }
    const view = render(<BorderCountriesQuiz questionFactory={factory(unitedStates)} random={stableRandom} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const input = screen.getByLabelText('Other country')
    for (const value of ['U', 'Untied States', 'CAN']) { fireEvent.change(input, { target: { value } }); expect(screen.getByText('1 remaining')).toBeTruthy() }
    fireEvent.compositionStart(input); fireEvent.change(input, { target: { value: 'US' } }); expect(screen.getByText('1 remaining')).toBeTruthy()
    fireEvent.compositionEnd(input, { currentTarget: { value: 'US' } }); expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
    view.unmount()
  })
  it('reports an exact timed answer as advancing to the next distinct border without a Continue control', async () => {
    render(<BorderCountriesQuiz questionFactory={factory(easy, easy2)} random={stableRandom} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const before = screen.getByRole('heading', { name: /Which country borders/ }).textContent
    const active = shown([easy, easy2]); fireEvent.change(screen.getByLabelText('Other country'), { target: { value: answerName(active) } })
    await waitFor(() => expect(screen.getByRole('heading', { name: /Which country borders/ }).textContent).not.toBe(before))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Other country')))
    expect(screen.getByRole('status').textContent).toBe('Correct. Next border.')
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
  })
  it('wires deterministic timed skips circularly, rejects duplicate activation, and retains a sole pending card', async () => {
    const view = render(<BorderCountriesQuiz questionFactory={factory(easy, easy2, easy3)} random={stableRandom} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const title = () => screen.getByRole('heading', { name: /Which country borders/ }).textContent
    const first = title(); const skip = screen.getByRole('button', { name: 'Skip' })
    fireEvent.click(skip, { detail: 1 }); const second = title(); expect(second).not.toBe(first)
    fireEvent.click(skip, { detail: 2 }); expect(title()).toBe(second); expect(fireEvent.keyDown(skip, { key: 'Enter', repeat: true })).toBe(false)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Other country')))
    fireEvent.click(screen.getByRole('button', { name: 'Skip' })); const third = title(); expect(third).not.toBe(first); expect(third).not.toBe(second)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Other country')))
    fireEvent.click(screen.getByRole('button', { name: 'Skip' })); expect(title()).toBe(first)
    view.unmount()
    render(<BorderCountriesQuiz questionFactory={factory(easy)} random={stableRandom} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const only = title(); fireEvent.click(screen.getByRole('button', { name: 'Skip' })); expect(title()).toBe(only); expect(screen.getByRole('status').textContent).toMatch(/only pending border/)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Other country')))
  })
  it('still completes timed results when browser score storage is unavailable or rejects writes', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new DOMException('blocked', 'SecurityError') } })
    try {
      const view = render(<BorderCountriesQuiz questionFactory={factory(easy)} random={stableRandom} />)
      fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' })); fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy(); view.unmount()
    } finally { if (descriptor) Object.defineProperty(window, 'localStorage', descriptor) }
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    try {
      render(<BorderCountriesQuiz questionFactory={factory(easy)} random={stableRandom} />)
      fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); fireEvent.change(screen.getByLabelText('Other country'), { target: { value: answerName(easy) } })
      expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy(); expect(setItem).toHaveBeenCalled()
    } finally { setItem.mockRestore() }
  })
  it('keeps every production Hard answer name, alias, abbreviation, and code out of unresolved DOM text and attributes', () => {
    const token = (value: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${normalizeAnswer(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'iu')
    for (const question of borderQuestions('hard')) {
      const view = render(<BorderCountriesQuiz questionFactory={factory(question)} />)
      const main = screen.getByRole('main')
      const forbidden = question.codes.flatMap((code) => { const entity = borderEntity(code)!; return [entity.code, entity.name, ...entity.aliases, ...entity.abbreviations] })
      for (const value of forbidden) expect(token(value).test(normalizeAnswer(main.textContent ?? '')), `${question.id} leaked ${value}`).toBe(false)
      for (const element of main.querySelectorAll('*')) for (const attribute of element.getAttributeNames()) {
        const attributeValue = normalizeAnswer(element.getAttribute(attribute) ?? '')
        for (const value of forbidden) expect(token(value).test(attributeValue), `${question.id} leaked ${value} through ${attribute}`).toBe(false)
      }
      view.unmount()
    }
  }, 30_000)
  it('discloses only the earned Hard endpoint across every production pair', () => {
    const token = (value: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${normalizeAnswer(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'iu')
    for (const question of borderQuestions('hard')) {
      const view=render(<BorderCountriesQuiz questionFactory={factory(question)} />)
      const first=borderEntity(question.codes[0])!, unresolved=borderEntity(question.codes[1])!
      fireEvent.change(screen.getByLabelText('Country'),{target:{value:first.name}});fireEvent.click(screen.getByRole('button',{name:'Check answer'}))
      const main=screen.getByRole('main')
      const disclosedLabel=normalizeAnswer(first.name)
      const forbidden=[unresolved.code,unresolved.name,...unresolved.aliases,...unresolved.abbreviations].filter(value=>!token(value).test(disclosedLabel))
      for(const value of forbidden) expect(token(value).test(normalizeAnswer(main.textContent??'')),`${question.id} leaked ${value}`).toBe(false)
      for(const element of main.querySelectorAll('*')) for(const attribute of element.getAttributeNames()) for(const value of forbidden) expect(token(value).test(normalizeAnswer(element.getAttribute(attribute)??'')),`${question.id} leaked ${value} through ${attribute}`).toBe(false)
      const unresolvedGeometry=JSON.stringify((borderContextGeometry(borderShape(unresolved.code,question.source)!) as { geometry: { coordinates: unknown } }).geometry.coordinates)
      expect(main.innerHTML,`${question.id} serialized unresolved geometry`).not.toContain(unresolvedGeometry)
      expect(main.querySelectorAll('[data-properties="{}"]'),question.id).toHaveLength(3)
      expect(main.querySelectorAll('.easy-border-answer-correct'),question.id).toHaveLength(1)
      expect(main.querySelectorAll('.easy-border-answer-revealed'),question.id).toHaveLength(0)
      view.unmount()
    }
  }, 30_000)
  it('keeps the opposite endpoint hidden for both answer orientations and the one-country reveal path across every pair', () => {
    const token = (value: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${normalizeAnswer(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'iu')
    const assertHidden=(main: HTMLElement, question: BorderQuestion, entityCode: string, disclosedCode: string) => {
      const entity=borderEntity(entityCode)!, disclosed=borderEntity(disclosedCode)!
      const values=[entity.code,entity.name,...entity.aliases,...entity.abbreviations].filter(value=>!token(value).test(normalizeAnswer(disclosed.name)))
      for(const value of values) expect(token(value).test(normalizeAnswer(main.textContent??'')),`${question.id} leaked ${value}`).toBe(false)
      for(const element of main.querySelectorAll('*')) for(const attribute of element.getAttributeNames()) for(const value of values) expect(token(value).test(normalizeAnswer(element.getAttribute(attribute)??'')),`${question.id} leaked ${value} through ${attribute}`).toBe(false)
      const geometry=JSON.stringify((borderContextGeometry(borderShape(entity.code,question.source)!) as { geometry: { coordinates: unknown } }).geometry.coordinates)
      expect(main.innerHTML,`${question.id} serialized unresolved geometry`).not.toContain(geometry)
    }
    for(const question of borderQuestions('hard')) {
      const reverse=render(<BorderCountriesQuiz questionFactory={factory(question)} />)
      const second=borderEntity(question.codes[1])!
      fireEvent.change(screen.getByLabelText('Country'),{target:{value:second.name}});fireEvent.click(screen.getByRole('button',{name:'Check answer'}))
      assertHidden(screen.getByRole('main'),question,question.codes[0],question.codes[1])
      expect(document.querySelectorAll('.easy-border-answer-correct'),question.id).toHaveLength(1)
      reverse.unmount()

      const revealed=render(<BorderCountriesQuiz questionFactory={factory(question)} />)
      fireEvent.click(screen.getByRole('button',{name:'Reveal one country'}))
      assertHidden(screen.getByRole('main'),question,question.codes[1],question.codes[0])
      expect(document.querySelectorAll('.easy-border-answer-revealed'),question.id).toHaveLength(1)
      revealed.unmount()
    }
  }, 30_000)
})
