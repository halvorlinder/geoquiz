import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { scoreboardKey } from '../../core/scoreboard/scoreboard'
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
const input = () => screen.getByLabelText('Highest point') as HTMLInputElement
const flush = () => act(() => vi.runOnlyPendingTimers())

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); window.localStorage.clear() })

describe('ShapeHighPointQuiz', () => {
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
    fireEvent.change(input(), { target: { value: 'wrong' } }); fireEvent.submit(input().closest('form')!); expect(screen.getByText(/Not recognized/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' })); flush()
    expect(container.querySelector('.high-point-revealed')).toBeTruthy(); expect(screen.getByText('Møllehøj')).toBeTruthy(); expect(screen.getByText('Denmark')).toBeTruthy(); expect(document.activeElement).toBe(screen.getByRole('button', { name: /Next country/ }))
    fireEvent.click(screen.getByRole('button', { name: /Next country/ })); flush(); expect(screen.getByRole('heading', { name: 'Deck complete' })).toBeTruthy()
  })

  it('uses IME-safe timed matching, records the scoped score, and handles reveal acknowledgement', () => {
    vi.useFakeTimers(); const first = render(<ShapeHighPointQuiz questionFactory={single(denmarkQuestion)} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.compositionStart(input()); fireEvent.change(input(), { target: { value: 'Møllehøj' } }); expect(screen.getByRole('heading', { name: 'Shape highest points' })).toBeTruthy()
    fireEvent.compositionEnd(input(), { currentTarget: input() }); flush(); expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
    expect(JSON.parse(window.localStorage.getItem(scoreboardKey({ quizId: 'shape-high-point', filters: { continent: 'All' }, dataVersion: 'test' })) ?? '{}').entries).toHaveLength(1)
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
})
