import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flagRecordById } from '../../core/flags'
import { normalizeAnswer } from '../../core/answerMatching'
import { scoreboardKey } from '../../core/scoreboard/scoreboard'
import { flagAnswerNames, flagCountryQuestions } from './flagCountry'
import { FLAG_COUNTRY_DATA_VERSION, FlagCountryQuiz } from './FlagCountryQuiz'

const questions = (ids: readonly string[]) => flagCountryQuestions('with-territories').filter((question) => ids.includes(question.id))
const current = () => {
  const image = screen.getByRole('img', { name: 'Flag to identify' })
  return flagRecordById(image.getAttribute('src')!.match(/\/([A-Z]{2,3}(?:-[A-Z]{2})?)\.svg$/)![1])
}

afterEach(() => { window.localStorage.clear() })

describe('FlagCountryQuiz', () => {
  it('renders one generic, local current-flag image without unresolved answer text', () => {
    render(<FlagCountryQuiz />)
    const image = screen.getByRole('img', { name: 'Flag to identify' })
    expect(image.getAttribute('src')).toMatch(/^\/geoquiz\/flags\/v1\/[A-Z]{2,3}(?:-[A-Z]{2})?\.svg$/)
    expect(document.querySelectorAll('img')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Check answer' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reveal answer' })).toBeTruthy()
    const id = image.getAttribute('src')!.match(/\/([A-Z]{2,3}(?:-[A-Z]{2})?)\.svg$/)![1]
    const target = flagRecordById(id)
    const unresolved = image.closest('.flag-country-card')!
    expect(unresolved.textContent?.toLocaleLowerCase('en-US')).not.toContain(target.name.toLocaleLowerCase('en-US'))
  })
  it('offers territory wording and starts timed runs without a check button', () => {
    render(<FlagCountryQuiz />)
    fireEvent.change(screen.getByLabelText('Territory scope'), { target: { value: 'with-territories' } })
    expect(screen.getByText(/country or territory questions/i)).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Timed'))
    fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    expect(screen.queryByRole('button', { name: 'Check answer' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy()
  })

  it('auto-advances an unambiguous timed answer and focuses the next input', async () => {
    render(<FlagCountryQuiz questionFactory={() => questions(['CAN', 'MEX'])} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const first = current(); const input = screen.getByLabelText('country') as HTMLInputElement
    fireEvent.change(input, { target: { value: first.name } })
    expect(current().id).not.toBe(first.id)
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    expect(document.activeElement).toBe(screen.getByLabelText('country'))
    expect(screen.getByRole('status').textContent).toContain('Correct')
  })

  it('keeps timed drafts by question ID while Skip rotates, including a single pending question', () => {
    const view = render(<FlagCountryQuiz questionFactory={() => questions(['CAN', 'MEX'])} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const first = current(); const input = screen.getByLabelText('country') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'draft A' } }); fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    const second = current(); fireEvent.change(screen.getByLabelText('country'), { target: { value: 'draft B' } }); fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(current().id).toBe(first.id); expect((screen.getByLabelText('country') as HTMLInputElement).value).toBe('draft A')
    fireEvent.click(screen.getByRole('button', { name: 'Skip' })); expect(current().id).toBe(second.id); expect((screen.getByLabelText('country') as HTMLInputElement).value).toBe('draft B')
    view.unmount(); render(<FlagCountryQuiz questionFactory={() => questions(['CAN'])} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    fireEvent.change(screen.getByLabelText('country'), { target: { value: 'only draft' } }); fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect((screen.getByLabelText('country') as HTMLInputElement).value).toBe('only draft')
  })

  it('suppresses timed matching during IME composition until compositionEnd', () => {
    render(<FlagCountryQuiz questionFactory={() => questions(['CAN', 'MEX'])} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const first = current(); const input = screen.getByLabelText('country')
    fireEvent.compositionStart(input); fireEvent.change(input, { target: { value: first.name } }); expect(current().id).toBe(first.id)
    fireEvent.compositionEnd(input, { currentTarget: { value: first.name } }); expect(current().id).not.toBe(first.id)
  })

  it('keeps every production flag name, accepted spelling, and stable ID out of unresolved markup except its local src', () => {
    const token = (value: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${normalizeAnswer(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'iu')
    for (const question of flagCountryQuestions('with-territories')) {
      const view = render(<FlagCountryQuiz questionFactory={() => [question]} />)
      const card = screen.getByRole('img', { name: 'Flag to identify' }).closest('.flag-country-card')!
      const forbidden = [question.flag.id, question.flag.name, ...flagAnswerNames(question.flag)]
      for (const value of forbidden) expect(token(value).test(normalizeAnswer(card.textContent ?? ''))).toBe(false)
      for (const element of card.querySelectorAll('*')) for (const attribute of element.getAttributeNames()) {
        if (attribute === 'src') continue
        const value = normalizeAnswer(element.getAttribute(attribute) ?? '')
        for (const forbiddenValue of forbidden) expect(token(forbiddenValue).test(value)).toBe(false)
      }
      expect(card.querySelectorAll('img')).toHaveLength(1)
      view.unmount()
    }
  })

  it('keeps practice incorrect, resolves correct/reveal answers, and focuses the deliberate Next action', () => {
    vi.useFakeTimers()
    const firstRender = render(<FlagCountryQuiz questionFactory={() => questions(['CAN'])} />)
    const input = screen.getByLabelText('country')
    fireEvent.change(input, { target: { value: 'wrong' } }); fireEvent.submit(input.closest('form')!)
    act(() => vi.runOnlyPendingTimers())
    expect(screen.getByText(/Not recognized yet/)).toBeTruthy()
    expect(document.activeElement).toBe(input)
    fireEvent.change(input, { target: { value: 'Canada' } }); fireEvent.submit(input.closest('form')!)
    expect(screen.getByText('Canada')).toBeTruthy()
    expect(document.querySelector('.flag-country-card')?.className).toContain('flag-correct')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Next flag/ }))
    fireEvent.click(screen.getByRole('button', { name: /Next flag/ }))
    expect(screen.getByRole('heading', { name: 'Deck complete' })).toBeTruthy()
    firstRender.unmount()
    render(<FlagCountryQuiz questionFactory={() => questions(['CAN'])} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    expect(screen.getByText('Canada')).toBeTruthy()
    expect(document.querySelector('.flag-country-card')?.className).toContain('flag-revealed')
  })

  it('uses exact Enter once for prefix answers and ignores held-repeat submissions after the next question renders', () => {
    render(<FlagCountryQuiz questionFactory={() => questions(['DMA', 'NER'])} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const first = current(); const input = screen.getByLabelText('country') as HTMLInputElement
    fireEvent.change(input, { target: { value: first.name } }); input.focus()
    fireEvent.keyDown(window, { key: 'Enter' }); fireEvent.submit(input.closest('form')!)
    const secondInput = screen.getByLabelText('country') as HTMLInputElement
    const second = current(); expect(second.id).not.toBe(first.id)
    fireEvent.change(secondInput, { target: { value: second.name } }); secondInput.focus()
    expect(fireEvent.keyDown(window, { key: 'Enter', repeat: true })).toBe(false)
    expect(current().id).toBe(second.id)
    expect((screen.getByLabelText('country') as HTMLInputElement).value).toBe(second.name)
    fireEvent.keyUp(window, { key: 'Enter' })
  })

  it('accepts an exact prefix answer through direct requestSubmit without a keyboard latch', () => {
    render(<FlagCountryQuiz questionFactory={() => questions(['DMA', 'NER'])} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const answer = current(); const input = screen.getByLabelText('country') as HTMLInputElement
    fireEvent.change(input, { target: { value: answer.name } })
    act(() => { input.closest('form')!.requestSubmit() })
    expect(current().id).not.toBe(answer.id)
  })

  it('shows a focused timed reveal acknowledgement and safely completes when storage is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new DOMException('blocked', 'SecurityError') } })
    try {
      render(<FlagCountryQuiz questionFactory={() => questions(['CAN'])} />)
      fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
      fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
      expect(screen.getByRole('heading', { name: 'Answer revealed' })).toBeTruthy()
      expect(screen.getByText('Canada')).toBeTruthy()
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continue' }).closest('section'))
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
    } finally {
      if (descriptor) Object.defineProperty(window, 'localStorage', descriptor)
    }
  })

  it('persists a completed timed board under the exact flag-country filter key', () => {
    render(<FlagCountryQuiz questionFactory={() => questions(['CAN'])} />)
    fireEvent.change(screen.getByLabelText('Question set'), { target: { value: 'North America' } })
    fireEvent.change(screen.getByLabelText('Territory scope'), { target: { value: 'with-territories' } })
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const input = screen.getByLabelText('country or territory'); fireEvent.change(input, { target: { value: 'Canada' } })
    const key = scoreboardKey({ quizId: 'flag-country', filters: { continent: 'North America', territoryScope: 'with-territories' }, dataVersion: FLAG_COUNTRY_DATA_VERSION })
    const payload = JSON.parse(window.localStorage.getItem(key) ?? '{}')
    expect(payload.entries[0]).toMatchObject({ correctCount: 1, revealedCount: 0, totalCount: 1, dataVersion: FLAG_COUNTRY_DATA_VERSION })
  })

  it('keeps timed completion nonfatal when localStorage setItem throws quota errors', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    try {
      render(<FlagCountryQuiz questionFactory={() => questions(['CAN'])} />)
      fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
      fireEvent.change(screen.getByLabelText('country'), { target: { value: 'Canada' } })
      expect(screen.getByRole('heading', { name: 'Timed run complete' })).toBeTruthy()
      expect(setItem).toHaveBeenCalled()
    } finally { setItem.mockRestore() }
  })

  it('guards double Skip and Reveal so each action consumes only one outcome', () => {
    render(<FlagCountryQuiz questionFactory={() => questions(['CAN', 'MEX'])} />)
    fireEvent.click(screen.getByLabelText('Timed')); fireEvent.click(screen.getByRole('button', { name: 'Start timed run' }))
    const before = current().id
    const skip = screen.getByRole('button', { name: 'Skip' }); skip.focus(); expect(fireEvent.keyDown(skip, { key: 'Enter', repeat: true })).toBe(false); expect(fireEvent.keyDown(skip, { key: ' ', repeat: true })).toBe(false)
    expect(current().id).toBe(before); fireEvent.click(skip)
    expect(current().id).not.toBe(before)
    const reveal = screen.getByRole('button', { name: 'Reveal answer' }); reveal.focus(); expect(fireEvent.keyDown(reveal, { key: 'Enter', repeat: true })).toBe(false); expect(fireEvent.keyDown(reveal, { key: ' ', repeat: true })).toBe(false)
    expect(screen.queryByRole('heading', { name: 'Answer revealed' })).toBeNull(); fireEvent.click(reveal)
    expect(screen.getAllByRole('heading', { name: 'Answer revealed' })).toHaveLength(1)
  })
})
