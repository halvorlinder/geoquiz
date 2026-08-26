import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Capital } from '../../core/capital'
import type { StudyEntity } from '../../core/entity'
import { scoreboardKey } from '../../core/scoreboard/scoreboard'
import { timedScoreDataVersion } from '../../core/session/timedScoreVersion'
import { CountryCapitalQuiz } from './CountryCapitalQuiz'
import { countryCapitalData, countryCapitalQuestions } from './countryCapital'

const capitals: Capital[] = [
  { id: 'alpha', capital: 'Alpha City', aliases: [], latitude: 0, longitude: 0, coordinateSource: 'test', checked: '2026-08-20', entities: [{ code: 'TST', country: 'Testland', sourceRef: 'test', checked: '2026-08-20' }] },
  { id: 'beta', capital: 'Beta City', aliases: [], latitude: 0, longitude: 0, coordinateSource: 'test', checked: '2026-08-20', entities: [{ code: 'TST', country: 'Testland', sourceRef: 'test', checked: '2026-08-20' }] },
  { id: 'gamma', capital: 'Gamma City', aliases: [], latitude: 0, longitude: 0, coordinateSource: 'test', checked: '2026-08-20', entities: [{ code: 'OTH', country: 'Otherland', sourceRef: 'test', checked: '2026-08-20' }] },
]
const entities: StudyEntity[] = [{ code: 'TST', name: 'Testland', aliases: [], abbreviations: [], continent: 'Europe', capitals: [{ id: 'alpha', role: 'Legislative' }, { id: 'beta', role: 'Executive' }] }]
const twoEntities: StudyEntity[] = [...entities, { code: 'OTH', name: 'Otherland', aliases: [], abbreviations: [], continent: 'Europe', capitals: [{ id: 'gamma', role: 'Capital' }] }]
const jerusalem: Capital = { id: 'jerusalem', capital: 'Jerusalem', aliases: [], latitude: 0, longitude: 0, coordinateSource: 'test', checked: '2026-08-20', entities: [{ code: 'ISR', country: 'Israel', sourceRef: 'test', checked: '2026-08-20' }, { code: 'PSE', country: 'State of Palestine', sourceRef: 'test', checked: '2026-08-20' }] }
const sharedCapitalEntities: StudyEntity[] = [
  { code: 'ISR', name: 'Israel', aliases: [], abbreviations: [], continent: 'Asia', capitals: [{ id: 'jerusalem', role: 'Capital' }] },
  { code: 'PSE', name: 'State of Palestine', aliases: [], abbreviations: [], continent: 'Asia', capitals: [{ id: 'jerusalem', role: 'Capital' }] },
]

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  window.localStorage.clear()
})

describe('CountryCapitalQuiz', () => {
  it('keeps answers out of challenge DOM, locks independent practice fields, and reveals unresolved fields', () => {
    const { container } = render(<CountryCapitalQuiz entities={entities} capitals={capitals} />)
    expect(container.textContent).not.toContain('Alpha City')
    expect(container.textContent).not.toContain('Beta City')
    const legislative = screen.getByLabelText('Legislative')
    const executive = screen.getByLabelText('Executive')
    fireEvent.change(legislative, { target: { value: 'Alpha City' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answers' }))
    expect((legislative as HTMLInputElement).disabled).toBe(true)
    expect((executive as HTMLInputElement).disabled).toBe(false)
    expect(screen.getByText('Correct', { selector: 'p' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
    expect((executive as HTMLInputElement).value).toBe('Beta City')
    expect(screen.getByText('Revealed', { selector: 'p' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Next country/ })).toBeTruthy()
  })

  it('keeps every production South Africa capital canonical name and alias out of markup and attributes before resolution', () => {
    const southAfrica = countryCapitalData.entities.filter((entity) => entity.code === 'ZAF')
    const question = countryCapitalQuestions(southAfrica, countryCapitalData.capitals)[0]
    const forbidden = question.fields.flatMap((field) => [field.capital.capital, ...(field.capital.aliases ?? [])])
    const { container } = render(<CountryCapitalQuiz entities={southAfrica} capitals={countryCapitalData.capitals} />)
    for (const value of forbidden) {
      expect(container.innerHTML.toLocaleLowerCase()).not.toContain(value.toLocaleLowerCase())
      for (const element of Array.from(container.querySelectorAll('*'))) {
        for (const attribute of Array.from(element.attributes)) {
          expect(attribute.value.toLocaleLowerCase(), `${attribute.name} leaked ${value}`).not.toContain(value.toLocaleLowerCase())
        }
      }
    }
  })

  it('marks a multi-role country challenge for the compact multi-field layout without exposing answers', () => {
    const southAfrica = countryCapitalData.entities.filter((entity) => entity.code === 'ZAF')
    const { container } = render(<CountryCapitalQuiz entities={southAfrica} capitals={countryCapitalData.capitals} />)
    const card = container.querySelector('.multi-field-card')
    expect(card).toBeTruthy()
    expect(card?.querySelectorAll('.country-capital-field')).toHaveLength(3)
    expect(card?.textContent).not.toContain('Pretoria')
    expect(card?.textContent).not.toContain('Cape Town')
    expect(card?.textContent).not.toContain('Bloemfontein')
  })

  it('keeps blank and incorrect practice answers editable until they independently match', () => {
    render(<CountryCapitalQuiz entities={entities} capitals={capitals} />)
    const legislative = screen.getByLabelText('Legislative') as HTMLInputElement
    fireEvent.click(screen.getByRole('button', { name: 'Check answers' }))
    expect(legislative.disabled).toBe(false)
    fireEvent.change(legislative, { target: { value: 'Wrong city' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answers' }))
    expect(legislative.disabled).toBe(false)
    expect(screen.getByText(/No new correct answers yet/)).toBeTruthy()
  })

  it('returns keyboard focus to the first unresolved field after wrong and partial practice checks', () => {
    vi.useFakeTimers()
    render(<CountryCapitalQuiz entities={entities} capitals={capitals} />)
    const legislative = screen.getByLabelText('Legislative') as HTMLInputElement
    const executive = screen.getByLabelText('Executive') as HTMLInputElement
    fireEvent.change(legislative, { target: { value: 'Wrong city' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answers' }))
    act(() => vi.runOnlyPendingTimers())
    expect(document.activeElement).toBe(legislative)
    expect(legislative.selectionStart).toBe(0)
    fireEvent.change(legislative, { target: { value: 'Alpha City' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check answers' }))
    act(() => vi.runOnlyPendingTimers())
    expect(document.activeElement).toBe(executive)
  })

  it('submits Practice fields through their native form with Enter', () => {
    render(<CountryCapitalQuiz entities={entities} capitals={capitals} />)
    const legislative = screen.getByLabelText('Legislative') as HTMLInputElement
    fireEvent.change(legislative, { target: { value: 'Alpha City' } })
    fireEvent.submit(legislative.closest('form')!)
    expect(legislative.disabled).toBe(true)
    expect(screen.getByText(/Complete the remaining fields/)).toBeTruthy()
  })

  it('starts timed only on request and completes a multi-field question in any order', () => {
    render(<CountryCapitalQuiz entities={entities} capitals={capitals} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    expect(screen.queryByRole('button', { name: 'Check answers' })).toBeNull()
    fireEvent.change(screen.getByLabelText('Executive'), { target: { value: 'Beta City' } })
    expect((screen.getByLabelText('Executive') as HTMLInputElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Legislative'), { target: { value: 'Alpha City' } })
    expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
  })

  it('pauses a timed multi-field question without changing its partial locks and resumes at the first unresolved field', async () => {
    render(<CountryCapitalQuiz entities={entities} capitals={capitals} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const legislative = screen.getByLabelText('Legislative') as HTMLInputElement
    const executive = screen.getByLabelText('Executive') as HTMLInputElement
    fireEvent.change(legislative, { target: { value: 'Alpha City' } })
    expect(legislative.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    fireEvent.change(executive, { target: { value: 'Beta City' } })
    fireEvent.compositionEnd(executive)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
    expect(executive.value).toBe('')
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Resume timed run' }))
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    expect(document.activeElement).toBe(executive)
    expect(legislative.disabled).toBe(true)
    expect(screen.getByLabelText('Executive')).toBe(executive)
  })

  it('uses natural role feedback after a timed Bolivia capital lock', () => {
    const bolivia = countryCapitalData.entities.filter((entity) => entity.code === 'BOL')
    render(<CountryCapitalQuiz entities={bolivia} capitals={countryCapitalData.capitals} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.change(screen.getByLabelText('Constitutional capital'), { target: { value: 'Sucre' } })
    expect(screen.getByText('Constitutional capital is correct. Continue with the remaining fields.')).toBeTruthy()
  })

  it('does not steal focus while incrementally typing an earlier or later pending role', () => {
    vi.useFakeTimers()
    render(<CountryCapitalQuiz entities={entities} capitals={capitals} />)
    act(() => vi.runOnlyPendingTimers())
    const executive = screen.getByLabelText('Executive') as HTMLInputElement
    executive.focus()
    fireEvent.change(executive, { target: { value: 'B' } })
    act(() => vi.runOnlyPendingTimers())
    expect(document.activeElement).toBe(executive)
    fireEvent.change(executive, { target: { value: 'Be' } })
    act(() => vi.runOnlyPendingTimers())
    expect(document.activeElement).toBe(executive)

    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    act(() => vi.runOnlyPendingTimers())
    const timedExecutive = screen.getByLabelText('Executive') as HTMLInputElement
    timedExecutive.focus()
    fireEvent.change(timedExecutive, { target: { value: 'B' } })
    act(() => vi.runOnlyPendingTimers())
    expect(document.activeElement).toBe(timedExecutive)
    fireEvent.change(timedExecutive, { target: { value: 'Be' } })
    act(() => vi.runOnlyPendingTimers())
    expect(document.activeElement).toBe(timedExecutive)
  })

  it('shows a final timed reveal acknowledgement before completion', () => {
    render(<CountryCapitalQuiz entities={entities} capitals={capitals} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
    expect(screen.getByRole('heading', { name: 'Answers revealed' })).toBeTruthy()
    const summary = screen.getByRole('region', { name: 'Answers revealed' })
    expect(document.activeElement).toBe(summary)
    expect(summary.getAttribute('aria-live')).toBeNull()
    expect(summary.querySelector('[aria-live]')).toBeNull()
    const description = document.getElementById(summary.getAttribute('aria-describedby') ?? '')
    expect(description?.textContent).toBe('Revealed — Testland: Legislative: Alpha City; Executive: Beta City.')
    expect(screen.queryByRole('heading', { name: 'Timed run complete' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
    expect(screen.getAllByText(/0 correct · 1 revealed · 1 total/)).toHaveLength(2)
  })

  it('does not leak a shared Jerusalem answer into the next country before acknowledgement', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const { container } = render(<CountryCapitalQuiz entities={sharedCapitalEntities} capitals={[jerusalem]} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    expect(screen.getByRole('heading', { name: 'Israel' })).toBeTruthy()
    expect(container.innerHTML).not.toContain('Jerusalem')
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
    expect(screen.getByRole('heading', { name: 'Answers revealed' })).toBeTruthy()
    expect(screen.getByText('Jerusalem')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'State of Palestine' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'State of Palestine' })).toBeTruthy()
    expect(container.innerHTML).not.toContain('Jerusalem')
  })

  it('keeps an intermediate reveal stopwatch running and freezes a final reveal stopwatch', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const { unmount } = render(<CountryCapitalQuiz entities={twoEntities} capitals={capitals} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    act(() => vi.advanceTimersByTime(1_000))
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
    expect(screen.getByLabelText('Elapsed time 0:01')).toBeTruthy()
    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.getByLabelText('Elapsed time 0:02')).toBeTruthy()
    unmount()

    render(<CountryCapitalQuiz entities={entities} capitals={capitals} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    act(() => vi.advanceTimersByTime(1_000))
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
    expect(screen.getByLabelText('Elapsed time 0:01')).toBeTruthy()
    act(() => vi.advanceTimersByTime(2_000))
    expect(screen.getByLabelText('Elapsed time 0:01')).toBeTruthy()
  })

  it('stores exactly one completed timed result in the country-capital continent board', () => {
    render(<StrictMode><CountryCapitalQuiz entities={entities} capitals={capitals} /></StrictMode>)
    fireEvent.change(screen.getByLabelText('Question set'), { target: { value: 'Europe' } })
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    const dataVersion = timedScoreDataVersion('country-capital-v1-entities-2-capital-data-v1')
    const europeKey = scoreboardKey({ quizId: 'country-capital', filters: { continent: 'Europe' }, dataVersion })
    const allKey = scoreboardKey({ quizId: 'country-capital', filters: { continent: 'All' }, dataVersion })
    const stored = JSON.parse(window.localStorage.getItem(europeKey) ?? '{}') as { entries?: Array<{ durationMs: number; correctCount: number; revealedCount: number; totalCount: number; dataVersion: string }> }
    expect(stored.entries).toHaveLength(1)
    expect(stored.entries?.[0]).toMatchObject({ durationMs: expect.any(Number), correctCount: 0, revealedCount: 1, totalCount: 1 })
    expect(stored.entries?.[0].dataVersion).toBe(dataVersion)
    expect(window.localStorage.getItem(allKey)).toBeNull()
  })

  it('finishes normally when browser storage rejects the completed-result write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage blocked') })
    render(<CountryCapitalQuiz entities={entities} capitals={capitals} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
  })

  it('rotates timed skips and restores typed, independently locked fields on return', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    render(<CountryCapitalQuiz entities={twoEntities} capitals={capitals} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.change(screen.getByLabelText('Legislative'), { target: { value: 'Alpha City' } })
    expect((screen.getByLabelText('Legislative') as HTMLInputElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    act(() => vi.runOnlyPendingTimers())
    expect(screen.getByRole('heading', { name: 'Otherland' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    act(() => vi.runOnlyPendingTimers())
    expect(screen.getByRole('heading', { name: 'Testland' })).toBeTruthy()
    const restored = screen.getByLabelText('Legislative') as HTMLInputElement
    expect(restored.value).toBe('Alpha City')
    expect(restored.disabled).toBe(true)
  })

  it('waits for IME composition to finish before auto-locking a timed field', () => {
    render(<CountryCapitalQuiz entities={entities} capitals={capitals} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const executive = screen.getByLabelText('Executive') as HTMLInputElement
    fireEvent.compositionStart(executive)
    fireEvent.change(executive, { target: { value: 'Beta City' } })
    expect(executive.disabled).toBe(false)
    fireEvent.compositionEnd(executive, { currentTarget: executive })
    expect((screen.getByLabelText('Executive') as HTMLInputElement).disabled).toBe(true)
  })

  it('keeps a one-question timed skip pending and guards a double practice Next activation', () => {
    vi.useFakeTimers()
    render(<CountryCapitalQuiz entities={entities} capitals={capitals} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    act(() => vi.runOnlyPendingTimers())
    expect(screen.getByRole('heading', { name: 'Testland' })).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Practice'))
    fireEvent.click(screen.getByRole('button', { name: 'Start / restart practice' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
    const next = screen.getByRole('button', { name: /Next country/ })
    fireEvent.click(next, { detail: 1 })
    fireEvent.click(next, { detail: 2 })
    expect(screen.getByRole('heading', { name: 'Deck complete' })).toBeTruthy()
  })

  it('ignores repeated timed mouse activations while later genuine controls still work', () => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    render(<CountryCapitalQuiz entities={twoEntities} capitals={capitals} />)
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }), { detail: 2 })
    expect(screen.getByRole('heading', { name: 'Testland' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }), { detail: 1 })
    act(() => vi.runOnlyPendingTimers())
    expect(screen.getByRole('heading', { name: 'Otherland' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }), { detail: 2 })
    expect(screen.getByRole('heading', { name: 'Otherland' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }), { detail: 1 })
    const continueButton = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(continueButton, { detail: 1 })
    fireEvent.click(continueButton, { detail: 2 })
    expect(screen.getByRole('heading', { name: 'Testland' })).toBeTruthy()
  })

  it('does not double-advance a still-mounted two-question practice Next control', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    render(<CountryCapitalQuiz entities={twoEntities} capitals={capitals} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answers' }))
    const next = screen.getByRole('button', { name: /Next country/ })
    fireEvent.click(next)
    fireEvent.click(next)
    expect(screen.getByRole('heading', { name: 'Otherland' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Deck complete' })).toBeNull()
  })
})
