import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeAnswer } from '../../core/answerMatching'
import { scoreboardKey } from '../../core/scoreboard/scoreboard'
import { entityForNeighbourCode, shapeNeighboursQuestions, type ShapeNeighboursQuestion } from './shapeNeighbours'
import { ShapeNeighboursQuiz } from './ShapeNeighboursQuiz'

vi.mock('./NeighbourProgressMap', () => ({
  NeighbourProgressMap: ({ layers, targetShape }: { layers: readonly { status: string }[]; targetShape: { bounds: readonly number[] } }) => <div aria-label="Neighbour study map" data-layers={layers.map(({ status }) => status).join(',')} data-target-width={targetShape.bounds[2] - targetShape.bounds[0]} />,
}))

const catalog = shapeNeighboursQuestions()
const q = (code: string) => catalog.find((question) => question.entity.code === code)!
const afghanistan = q('AFG'), niger = q('NER'), guinea = q('GIN')
const liechtenstein = q('LIE')
const factory = (...items: ShapeNeighboursQuestion[]) => () => items
const small = (question: ShapeNeighboursQuestion, codes: readonly string[]): ShapeNeighboursQuestion => ({ ...question, neighbourCodes: codes })
const flush = () => act(() => vi.runOnlyPendingTimers())
const input = () => screen.getByLabelText('Neighbouring country') as HTMLInputElement
function practice(value: string) { fireEvent.change(input(), { target: { value } }); fireEvent.submit(input().closest('form')!); flush() }
function answerNames(question: ShapeNeighboursQuestion) { return question.neighbourCodes.map((code) => entityForNeighbourCode(code)!.name) }
function token(value: string, answer: string) { const a = normalizeAnswer(answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return new RegExp(`(^|[^\\p{L}\\p{N}])${a}($|[^\\p{L}\\p{N}])`, 'u').test(normalizeAnswer(value)) }
function assertAbsent(container: HTMLElement, values: readonly string[]) { const haystack = [container.textContent ?? '', ...Array.from(container.querySelectorAll('*')).flatMap((element) => Array.from(element.attributes).map((attribute) => attribute.value))]; for (const value of values) expect(haystack.some((part) => token(part, value)), `${value} leaked`).toBe(false) }

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); window.localStorage.clear() })

describe('ShapeNeighboursQuiz', () => {
  it('has no unresolved target or answer leakage across all 157 production questions', () => {
    for (const question of catalog) {
      const { container, unmount } = render(<ShapeNeighboursQuiz questionFactory={factory(question)} />)
      assertAbsent(container, [question.entity.name, ...question.entity.aliases, question.entity.code, ...question.neighbourCodes.flatMap((code) => { const entity = entityForNeighbourCode(code)!; return [entity.name, ...entity.aliases, entity.code] })])
      unmount()
    }
  })

  it('wires both required credits onto an OSM-derived override silhouette challenge', () => {
    render(<ShapeNeighboursQuiz questionFactory={factory(liechtenstein)} />)
    expect(screen.getByRole('link', { name: 'geoBoundaries' }).getAttribute('href')).toBe('/geoquiz/country-shape-credits.html')
    expect(screen.getByText(/ODbL 1\.0/)).toBeTruthy()
    expect(screen.getByRole('link', { name: '© OpenStreetMap contributors' }).getAttribute('href')).toBe('https://www.openstreetmap.org/copyright')
  })

  it('keeps the progressive map as an off-by-default Practice aid and preserves it across answers', () => {
    vi.useFakeTimers(); render(<ShapeNeighboursQuiz questionFactory={factory(afghanistan)} />)
    const toggle = screen.getByRole('switch', { name: 'Neighbour map' })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(screen.queryByLabelText('Neighbour study map')).toBeNull()
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByLabelText('Neighbour study map').getAttribute('data-layers')).toBe('')
    practice('China')
    expect(screen.getByLabelText('Neighbour study map').getAttribute('data-layers')).toBe('found')
    expect(screen.getByRole('button', { name: 'Recenter target' })).toBeTruthy()
  })

  it('keeps the map preference on and replaces the target layer when Practice advances', () => {
    vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const first = small(afghanistan, ['CHN']), second = small(niger, ['NGA'])
    render(<ShapeNeighboursQuiz questionFactory={factory(first, second)} />)
    fireEvent.click(screen.getByRole('switch', { name: 'Neighbour map' }))
    const map = screen.getByLabelText('Neighbour study map')
    const firstWidth = map.getAttribute('data-target-width')
    practice('China')
    fireEvent.click(screen.getByRole('button', { name: /Next country/ }))
    flush()
    const nextMap = screen.getByLabelText('Neighbour study map')
    expect(screen.getByRole('switch', { name: 'Neighbour map' }).getAttribute('aria-checked')).toBe('true')
    expect(nextMap.getAttribute('data-target-width')).not.toBe(firstWidth)
    expect(nextMap.getAttribute('data-layers')).toBe('')
  })

  it('keeps the map aid out of Timed mode', () => {
    render(<ShapeNeighboursQuiz questionFactory={factory(afghanistan)} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    expect(screen.queryByRole('switch', { name: 'Neighbour map' })).toBeNull()
    expect(screen.queryByLabelText('Neighbour study map')).toBeNull()
  })

  it('exposes only an answered neighbour and keeps target plus unresolved answers hidden', () => {
    vi.useFakeTimers(); const { container } = render(<ShapeNeighboursQuiz questionFactory={factory(afghanistan)} />)
    practice('China')
    expect(screen.getByRole('list', { name: 'Answered neighbours' }).textContent).toContain('China')
    assertAbsent(container, [afghanistan.entity.name, ...afghanistan.entity.aliases, afghanistan.entity.code, ...afghanistan.neighbourCodes.filter((code) => code !== 'CHN').flatMap((code) => { const e = entityForNeighbourCode(code)!; return [e.name, ...e.aliases, e.code] })])
  })

  it('completes every practice neighbour in arbitrary order with focus, green state, Next, and restart focus', () => {
    vi.useFakeTimers(); const { container } = render(<ShapeNeighboursQuiz questionFactory={factory(afghanistan)} />)
    const names = answerNames(afghanistan).reverse()
    names.forEach((name, index) => { practice(name); expect(input().value).toBe(''); if (index < names.length - 1) expect(document.activeElement).toBe(input()); expect(screen.getByText(`${names.length - index - 1} remaining`)).toBeTruthy() })
    expect(container.querySelector('.neighbours-correct')).toBeTruthy(); expect(screen.getByText(/Every neighbour is correct/)).toBeTruthy(); expect(document.activeElement).toBe(screen.getByRole('button', { name: /Next country/ }))
    fireEvent.click(screen.getByRole('button', { name: /Next country/ })); flush(); expect(screen.getByRole('heading', { name: 'Deck complete' })).toBeTruthy(); expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Start a fresh deck' }))
  })

  it('keeps invalid, known non-neighbour, and duplicate practice answers retryable', () => {
    vi.useFakeTimers(); render(<ShapeNeighboursQuiz questionFactory={factory(afghanistan)} />)
    for (const [value, message] of [['wrong', /No new neighbour recognized/], ['France', /not a required neighbour/]] as const) { practice(value); expect(screen.getByText(message)).toBeTruthy(); expect(document.activeElement).toBe(input()); expect(input().selectionStart).toBe(0) }
    practice('China'); practice('China'); expect(screen.getByText('That neighbour is already recorded.')).toBeTruthy(); expect(input().selectionStart).toBe(0)
  })

  it('reveals a partial practice prompt exactly once with red state and deliberate Next', () => {
    vi.useFakeTimers(); const { container } = render(<ShapeNeighboursQuiz questionFactory={factory(afghanistan)} />)
    practice('China'); fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' })); flush()
    expect(container.querySelector('.neighbours-revealed')).toBeTruthy(); expect(container.textContent).toContain('Afghanistan'); expect(screen.getByRole('list', { name: 'Revealed neighbours' }).children).toHaveLength(5); expect(document.activeElement).toBe(screen.getByRole('button', { name: /Next country/ }))
    fireEvent.click(screen.getByRole('button', { name: /Next country/ })); flush(); expect(screen.getByRole('heading', { name: 'Deck complete' })).toBeTruthy()
  })

  it('preserves timed found and typed state across circular and one-pending skips', () => {
    vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(0.999); render(<ShapeNeighboursQuiz questionFactory={factory(afghanistan, niger)} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); expect(screen.queryByRole('button', { name: 'Check answer' })).toBeNull()
    fireEvent.change(input(), { target: { value: 'China' } }); flush(); fireEvent.change(input(), { target: { value: 'typing' } }); flush(); fireEvent.click(screen.getByRole('button', { name: 'Skip' })); flush(); expect(screen.getByText('7 remaining')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' })); flush(); expect(input().value).toBe('typing'); expect(screen.getByRole('list', { name: 'Answered neighbours' }).textContent).toContain('China')
  })

  it('uses context-aware timed prefix matching and IME composition', () => {
    vi.useFakeTimers(); const first = render(<ShapeNeighboursQuiz questionFactory={factory(niger)} />); fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.change(input(), { target: { value: 'Niger' } }); expect(input().value).toBe('Niger'); expect(screen.queryByRole('list', { name: 'Answered neighbours' })).toBeNull()
    fireEvent.change(input(), { target: { value: 'Nigeria' } }); flush(); expect(screen.getByRole('list', { name: 'Answered neighbours' }).textContent).toContain('Nigeria')
    first.unmount(); const guineaRender = render(<ShapeNeighboursQuiz questionFactory={factory(guinea)} />); guineaRender.unmount()
    // A composition change does not match until compositionend.
    render(<ShapeNeighboursQuiz questionFactory={factory(afghanistan)} />); fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); fireEvent.compositionStart(input()); fireEvent.change(input(), { target: { value: 'China' } }); expect(screen.queryByRole('list', { name: 'Answered neighbours' })).toBeNull(); fireEvent.compositionEnd(input(), { currentTarget: input() }); flush(); expect(screen.getByRole('list', { name: 'Answered neighbours' }).textContent).toContain('China')
  })

  it('shows timed reveal acknowledgement before moving onward and records a scoped score', () => {
    vi.useFakeTimers(); render(<ShapeNeighboursQuiz questionFactory={factory(afghanistan)} />); fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
    expect(screen.getByRole('heading', { name: 'Answers revealed' })).toBeTruthy(); expect(screen.getByText('Afghanistan')).toBeTruthy(); expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Answers revealed' })); fireEvent.click(screen.getByRole('button', { name: 'Continue' })); flush(); expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
    const key = scoreboardKey({ quizId: 'shape-neighbours', filters: { continent: 'All' }, dataVersion: 'test' }); expect(JSON.parse(window.localStorage.getItem(key) ?? '{}').entries).toHaveLength(1)
  })

  it('keeps timed completion usable when storage and repeated controls fail', () => {
    vi.useFakeTimers(); vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') }); render(<ShapeNeighboursQuiz questionFactory={factory(afghanistan)} />); fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }), { detail: 2 }); expect(screen.getByRole('heading', { name: 'Country silhouette' })).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' })); fireEvent.click(screen.getByRole('button', { name: 'Continue' }), { detail: 2 }); flush(); expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
  })

  it('keeps the sole pending question and its partial state on skip', () => {
    vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const first = small(afghanistan, ['CHN', 'IRN']), second = small(niger, ['NGA'])
    render(<ShapeNeighboursQuiz questionFactory={factory(first, second)} />); fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.change(input(), { target: { value: 'China' } }); flush(); fireEvent.change(input(), { target: { value: 'partial' } }); flush(); fireEvent.click(screen.getByRole('button', { name: 'Skip' })); flush()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' })); fireEvent.click(screen.getByRole('button', { name: 'Continue' })); flush()
    expect(input().value).toBe('partial'); fireEvent.click(screen.getByRole('button', { name: 'Skip' })); flush(); expect(input().value).toBe('partial'); expect(screen.getByText('Skipped. This is the only pending country.')).toBeTruthy()
  })

  it('auto-completes a timed run correctly and records the correct outcome', () => {
    vi.useFakeTimers(); render(<ShapeNeighboursQuiz questionFactory={factory(small(afghanistan, ['CHN']))} />); fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); fireEvent.change(input(), { target: { value: 'China' } }); flush()
    expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy(); expect(screen.getAllByText(/1 correct · 0 revealed · 1 total/).length).toBeGreaterThan(0); expect(JSON.parse(window.localStorage.getItem(scoreboardKey({ quizId: 'shape-neighbours', filters: { continent: 'All' }, dataVersion: 'test' })) ?? '{}').entries).toHaveLength(1); expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Restart timed run' }))
  })

  it('handles strict-prefix target contexts without timed submission', () => {
    vi.useFakeTimers(); const onlyLonger = render(<ShapeNeighboursQuiz questionFactory={factory(small(niger, ['NGA']))} />); fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); fireEvent.change(input(), { target: { value: 'Niger' } }); fireEvent.submit(input().closest('form')!); expect(input().value).toBe('Niger'); expect(screen.queryByRole('list', { name: 'Answered neighbours' })).toBeNull(); fireEvent.change(input(), { target: { value: 'Nigeria' } }); flush(); expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy(); onlyLonger.unmount()
    const onlyShorter = render(<ShapeNeighboursQuiz questionFactory={factory(small(niger, ['NER']))} />); fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); fireEvent.change(input(), { target: { value: 'Niger' } }); flush(); expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy(); onlyShorter.unmount()
    render(<ShapeNeighboursQuiz questionFactory={factory(small(niger, ['NER', 'NGA']))} />); fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); fireEvent.change(input(), { target: { value: 'Niger' } }); flush(); fireEvent.change(input(), { target: { value: 'Niger' } }); expect(screen.getByText('That neighbour is already recorded.')).toBeTruthy(); fireEvent.change(input(), { target: { value: 'Nigeria' } }); flush(); expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
  })

  it('survives unavailable and failing scoreboard storage', () => {
    vi.useFakeTimers(); const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage'); Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new Error('unavailable') } }); const unavailable = render(<ShapeNeighboursQuiz questionFactory={factory(small(afghanistan, ['CHN']))} />); fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); fireEvent.change(input(), { target: { value: 'China' } }); flush(); expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy(); unavailable.unmount(); if (descriptor) Object.defineProperty(window, 'localStorage', descriptor)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('read') }); render(<ShapeNeighboursQuiz questionFactory={factory(small(afghanistan, ['CHN']))} />); fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); fireEvent.change(input(), { target: { value: 'China' } }); flush(); expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
  })

  it('guards repeated timed actions', () => {
    vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(0.999); render(<ShapeNeighboursQuiz questionFactory={factory(afghanistan, niger)} />); fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); const skip = screen.getByRole('button', { name: 'Skip' }); fireEvent.click(skip, { detail: 1 }); fireEvent.click(skip, { detail: 2 }); fireEvent.keyDown(skip, { key: 'Enter', repeat: true }); flush(); expect(screen.getByText('7 remaining')).toBeTruthy(); const reveal = screen.getByRole('button', { name: 'Reveal answers' }); fireEvent.click(reveal, { detail: 1 }); fireEvent.click(reveal, { detail: 2 }); fireEvent.keyDown(reveal, { key: ' ', repeat: true }); expect(screen.getByRole('heading', { name: 'Answers revealed' })).toBeTruthy(); const proceed = screen.getByRole('button', { name: 'Continue' }); fireEvent.click(proceed, { detail: 1 }); fireEvent.click(proceed, { detail: 2 }); expect(screen.queryByRole('heading', { name: 'Timed run complete' })).toBeNull()
  })
})
