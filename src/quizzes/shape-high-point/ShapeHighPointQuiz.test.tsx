import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { scoreboardKey } from '../../core/scoreboard/scoreboard'
import { timedScoreDataVersion } from '../../core/session/timedScoreVersion'
import { getEntityByCode } from '../../core/entity'
import { shapeHighPointQuestions, type ShapeHighPointQuestion } from './shapeHighPoint'
import { ShapeHighPointQuiz } from './ShapeHighPointQuiz'

const denmark = getEntityByCode('DNK')!
const france = getEntityByCode('FRA')!
const single = (question: ShapeHighPointQuestion) => () => [question]
const denmarkQuestion = shapeHighPointQuestions([denmark])[0]
const franceQuestion = shapeHighPointQuestions([france])[0]
const outsideQuestion = shapeHighPointQuestions([france])[0]
const monacoQuestion = shapeHighPointQuestions([getEntityByCode('MCO')!])[0]
const colombiaQuestion = shapeHighPointQuestions([getEntityByCode('COL')!])[0]
const input = () => screen.getByLabelText('Highest point') as HTMLInputElement
const flush = () => act(() => vi.runOnlyPendingTimers())

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); window.localStorage.clear() })

describe('ShapeHighPointQuiz', () => {
  it('uses the DEV-only Colombia QA fixture', () => {
    const original = window.location.hash
    try {
      window.location.hash = '#/shape-high-point?qa=colombia'
      render(<ShapeHighPointQuiz />)
      fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
      expect(screen.getByText('Pico Simón Bolívar')).toBeTruthy()
      expect(screen.getByText(/December 2024 dGPS/)).toBeTruthy()
    } finally { window.location.hash = original }
  })

  it('keeps unresolved challenge text and attributes generic', () => {
    const { container } = render(<ShapeHighPointQuiz questionFactory={single(denmarkQuestion)} />)
    expect(screen.getByRole('img', { name: 'Country silhouette, marked point' })).toBeTruthy()
    const values = [denmark.code, denmark.name, ...denmark.aliases, denmarkQuestion.highPoint.label, ...denmarkQuestion.highPoint.aliases]
    const markup = [container.textContent ?? '', ...Array.from(container.querySelectorAll('*')).flatMap((element) => Array.from(element.attributes).map((attribute) => attribute.value))].join(' ').toLocaleLowerCase()
    for (const value of values) expect(markup).not.toContain(value.toLocaleLowerCase())
  })

  it('renders stable visible marker strokes and a generic outside treatment', () => {
    const inside = render(<ShapeHighPointQuiz questionFactory={single(denmarkQuestion)} />)
    const insideMarker = inside.container.querySelector('.high-point-marker')!
    expect(insideMarker.classList.contains('high-point-marker-outside')).toBe(false)
    expect(insideMarker.querySelectorAll('circle')).toHaveLength(2)
    expect(insideMarker.querySelector('circle')?.getAttribute('stroke-width')).toBe('3px')
    expect(insideMarker.querySelector('circle')?.getAttribute('vector-effect')).toBe('non-scaling-stroke')
    inside.unmount()
    const outside = render(<ShapeHighPointQuiz questionFactory={single(outsideQuestion)} />)
    expect(outside.container.querySelector('.high-point-marker.high-point-marker-outside')).toBeTruthy()
  })

  it('wires both required credits onto an OSM-derived high-fidelity silhouette', () => {
    render(<ShapeHighPointQuiz questionFactory={single(monacoQuestion)} />)
    expect(screen.getByRole('link', { name: 'geoBoundaries' }).getAttribute('href')).toBe('/geoquiz/country-shape-credits.html')
    expect(screen.getByText(/ODbL 1\.0/)).toBeTruthy()
    expect(screen.getByRole('link', { name: '© OpenStreetMap contributors' })).toBeTruthy()
  })

  it('keeps every production target, answer, alias, and entity code out of unresolved markup', () => {
    const token = (value: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${value.toLocaleLowerCase().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}])`, 'u')
    for (const question of shapeHighPointQuestions()) {
      const { container, unmount } = render(<ShapeHighPointQuiz questionFactory={single(question)} />)
      const markup = [container.textContent ?? '', ...Array.from(container.querySelectorAll('*')).flatMap((element) => Array.from(element.attributes).map((attribute) => attribute.value))].join(' ').toLocaleLowerCase()
      for (const value of [question.entity.code, question.entity.name, ...question.entity.aliases, question.highPoint.label, ...question.highPoint.aliases]) expect(markup, `${question.entity.code} leaked ${value}`).not.toMatch(token(value))
      unmount()
    }
  })

  it('checks practice answers, exposes red reveal metadata, and focuses deliberate Next', () => {
    vi.useFakeTimers(); const { container } = render(<ShapeHighPointQuiz questionFactory={single(denmarkQuestion)} />)
    fireEvent.change(input(), { target: { value: 'wrong' } }); fireEvent.submit(input().closest('form')!); flush(); expect(screen.getByText(/Not recognized/)).toBeTruthy(); expect(document.activeElement).toBe(input())
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' })); flush()
    expect(container.querySelector('.high-point-revealed.shape-high-point-card--resolved')).toBeTruthy(); expect(screen.getByText('Møllehøj')).toBeTruthy(); expect(screen.getByText('Denmark')).toBeTruthy(); expect(document.activeElement).toBe(screen.getByRole('button', { name: /Next country/ }))
    fireEvent.click(screen.getByRole('button', { name: /Next country/ })); flush(); expect(screen.getByRole('heading', { name: 'Deck complete' })).toBeTruthy()
  })

  it('keeps the longest production reveal note as a full-width fact row with Next still available', () => {
    vi.useFakeTimers()
    const { container } = render(<ShapeHighPointQuiz questionFactory={single(colombiaQuestion)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' })); flush()
    const note = screen.getByText(colombiaQuestion.highPoint.note!)
    expect(colombiaQuestion.highPoint.note).toHaveLength(216)
    expect(note.closest('.high-point-note')).toBeTruthy()
    expect(container.querySelector('.shape-high-point-card--resolved .high-point-reveal-details .high-point-note')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Next country/ })).toBeTruthy()
  })

  it('uses IME-safe timed matching, records the scoped score, and handles reveal acknowledgement', () => {
    vi.useFakeTimers(); const first = render(<ShapeHighPointQuiz questionFactory={single(denmarkQuestion)} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.compositionStart(input()); fireEvent.change(input(), { target: { value: 'Møllehøj' } }); expect(screen.getByRole('heading', { name: 'Shape highest points' })).toBeTruthy()
    fireEvent.compositionEnd(input(), { currentTarget: input() }); flush(); expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
    const dataVersion = timedScoreDataVersion('shape-high-point-v1-entities-3-high-points-2026.08.20-shapes-2')
    const stored = JSON.parse(window.localStorage.getItem(scoreboardKey({ quizId: 'shape-high-point', filters: { continent: 'All' }, dataVersion })) ?? '{}')
    expect(stored.entries).toHaveLength(1)
    expect(stored.entries[0].dataVersion).toBe(dataVersion)
    first.unmount()
    const rerendered = render(<ShapeHighPointQuiz questionFactory={single(franceQuestion)} />)
    fireEvent.click(rerendered.getByLabelText('Timed')); fireEvent.click(rerendered.getByRole('button', { name: 'Start timed run' })); fireEvent.click(rerendered.getByRole('button', { name: 'Reveal answer' }))
    expect(rerendered.getByRole('heading', { name: 'Answer revealed' })).toBeTruthy(); expect(rerendered.getByText('France')).toBeTruthy(); expect(rerendered.getByText('Mont Blanc')).toBeTruthy(); fireEvent.click(rerendered.getByRole('button', { name: 'Continue' })); flush(); expect(rerendered.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
  })

  it('keeps typed state on the sole timed pending question and survives failed storage', () => {
    vi.useFakeTimers(); vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') }); render(<ShapeHighPointQuiz questionFactory={single(denmarkQuestion)} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' })); fireEvent.change(input(), { target: { value: 'typing' } }); fireEvent.click(screen.getByRole('button', { name: 'Skip' })); flush()
    expect(input().value).toBe('typing'); expect(screen.getByText('Skipped. This is the only pending country.')).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' })); fireEvent.click(screen.getByRole('button', { name: 'Continue' })); flush(); expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
  })

  it('keeps a timed highest-point answer unchanged and action guards inert while paused', () => {
    vi.useFakeTimers(); render(<ShapeHighPointQuiz questionFactory={single(denmarkQuestion)} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.change(input(), { target: { value: 'Mølle' } }); fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    fireEvent.change(input(), { target: { value: 'Møllehøj' } }); fireEvent.compositionEnd(input()); fireEvent.click(screen.getByRole('button', { name: 'Skip' })); fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    expect(input().value).toBe('Mølle'); expect(screen.getByRole('heading', { name: 'Paused' })).toBeTruthy()
  })
})
