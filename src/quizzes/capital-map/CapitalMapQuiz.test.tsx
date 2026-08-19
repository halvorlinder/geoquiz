import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Capital } from '../../core/capital'
import { CapitalMapQuiz } from './CapitalMapQuiz'

vi.mock('./CapitalMap', () => ({
  CapitalMap: () => <div data-testid="capital-map" />,
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

function answer(value: string) {
  const input = screen.getByRole('textbox', { name: 'Capital city' })
  fireEvent.change(input, { target: { value } })
  fireEvent.submit(input.closest('form')!)
  return input
}

afterEach(() => vi.useRealTimers())

describe('CapitalMapQuiz interaction and focus flow', () => {
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
  })
})
