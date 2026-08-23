import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { scoreboardKey } from '../../core/scoreboard/scoreboard'
import { shapeCapitalData, shapeCapitalQuestions } from './shapeCapital'
import { ShapeCapitalQuiz } from './ShapeCapitalQuiz'

const byCode = new Map(shapeCapitalData.entities.map((entity) => [entity.code, entity]))
const southAfrica = [byCode.get('ZAF')!]
const bolivia = [byCode.get('BOL')!]
const southernAfrica = [byCode.get('ZAF')!, byCode.get('SWZ')!]
const singapore = [byCode.get('SGP')!]

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  window.localStorage.clear()
})

function renderSouthAfrica() { return render(<ShapeCapitalQuiz entities={southAfrica} />) }

describe('ShapeCapitalQuiz', () => {
  it('renders a generic accessible silhouette and never exposes the unresolved entity in text or attributes', () => {
    const entity = southAfrica[0]
    const question = shapeCapitalQuestions(southAfrica, shapeCapitalData.capitals)[0]
    const forbidden = [entity.code, entity.name, ...entity.aliases, ...question.fields.flatMap((field) => [field.capital.capital, ...(field.capital.aliases ?? [])])]
    const { container } = renderSouthAfrica()
    expect(screen.getByRole('heading', { name: 'Country silhouette' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Country silhouette' })).toBeTruthy()
    for (const forbiddenValue of forbidden) {
      const normalized = forbiddenValue.toLocaleLowerCase()
      expect(container.textContent?.toLocaleLowerCase()).not.toContain(normalized)
      for (const element of Array.from(container.querySelectorAll('*'))) {
        for (const attribute of Array.from(element.attributes)) expect(attribute.value.toLocaleLowerCase(), `${attribute.name} leaked ${forbiddenValue}`).not.toContain(normalized)
      }
    }
  })

  it('keeps every production entity canonical name, alias, and code out of unresolved challenge markup', () => {
    for (const entity of shapeCapitalData.entities) {
      const { container, unmount } = render(<ShapeCapitalQuiz entities={[entity]} />)
      const text = container.textContent?.toLocaleLowerCase() ?? ''
      const attributes = Array.from(container.querySelectorAll('*')).flatMap((element) => Array.from(element.attributes).map((attribute) => attribute.value.toLocaleLowerCase()))
      const fields = shapeCapitalQuestions([entity], shapeCapitalData.capitals)[0].fields
      const forbidden = [entity.code, entity.name, ...entity.aliases, ...fields.flatMap((field) => [field.capital.capital, ...(field.capital.aliases ?? [])])]
      for (const value of forbidden) {
        const normalized = value.toLocaleLowerCase()
        const expression = new RegExp(`(^|[^\\p{L}\\p{N}])${normalized.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}])`, 'u')
        expect(text, `${entity.code} leaked through text`).not.toMatch(expression)
        for (const attribute of attributes) expect(attribute, `${entity.code} leaked through an attribute`).not.toMatch(expression)
      }
      unmount()
    }
  })

  it('wires the non-OSM geoBoundaries credit onto an overridden silhouette challenge', () => {
    render(<ShapeCapitalQuiz entities={singapore} />)
    expect(screen.getByRole('link', { name: 'geoBoundaries' }).getAttribute('href')).toBe('/geoquiz/country-shape-credits.html')
    expect(screen.getByText(/ODbL 1\.0/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: '© OpenStreetMap contributors' })).toBeNull()
  })

  it('uses identical independent multi-capital practice locks and reveal semantics', () => {
    renderSouthAfrica()
    const administrative = screen.getByLabelText('Administrative') as HTMLInputElement
    const legislative = screen.getByLabelText('Legislative') as HTMLInputElement
    fireEvent.change(administrative, { target: { value: 'Pretoria' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answers' }))
    expect(administrative.disabled).toBe(true)
    expect(legislative.disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
    expect(legislative.value).toBe('Cape Town')
    expect(screen.getByRole('button', { name: /Next country/ })).toBeTruthy()
  })

  it('auto-locks timed multi-capital fields, honours IME composition, and records the shape-capital board', () => {
    render(<StrictMode><ShapeCapitalQuiz entities={bolivia} /></StrictMode>)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const constitutional = screen.getByLabelText('Constitutional capital') as HTMLInputElement
    fireEvent.compositionStart(constitutional)
    fireEvent.change(constitutional, { target: { value: 'Sucre' } })
    expect(constitutional.disabled).toBe(false)
    fireEvent.compositionEnd(constitutional, { currentTarget: constitutional })
    expect((screen.getByLabelText('Constitutional capital') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText('Constitutional capital is correct. Continue with the remaining fields.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Seat of government'), { target: { value: 'La Paz' } })
    expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
    const key = scoreboardKey({ quizId: 'shape-capital', filters: { continent: 'All' }, dataVersion: 'test' })
    expect(JSON.parse(window.localStorage.getItem(key) ?? '{}').entries).toHaveLength(1)
  })

  it('keeps partial timed answers across circular skips and shows the entity only after reveal acknowledgement', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const { container } = render(<ShapeCapitalQuiz entities={southernAfrica} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.change(screen.getByLabelText('Administrative'), { target: { value: 'Pretoria' } })
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    act(() => vi.runOnlyPendingTimers())
    expect(screen.getByRole('heading', { name: 'Country silhouette' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    act(() => vi.runOnlyPendingTimers())
    expect((screen.getByLabelText('Administrative') as HTMLInputElement).value).toBe('Pretoria')
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
    expect(screen.getByRole('heading', { name: 'Answers revealed' })).toBeTruthy()
    expect(container.textContent).toContain('South Africa')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Country silhouette' })).toBeTruthy()
  })

  it('does not double-advance timed controls and remains complete if local storage rejects a result', () => {
    vi.useFakeTimers()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage blocked') })
    renderSouthAfrica()
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }), { detail: 2 })
    expect(screen.getByRole('heading', { name: 'Country silhouette' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }), { detail: 1 })
    expect(screen.getByRole('heading', { name: 'Answers revealed' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    act(() => vi.runOnlyPendingTimers())
    expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
  })
})
