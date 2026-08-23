import { describe, expect, it } from 'vitest'
import { allHighPoints, getHighPoint } from '../../core/highPoints'
import { isHighPointAnswerCorrect, isTimedHighPointAnswerAccepted, matchHighPointAnswer } from './highPointAnswerMatching'

const corpus = allHighPoints()
const record = (code: string) => getHighPoint(code)!

describe('high-point answer matching', () => {
  it('normalizes exact names and permits controlled typos for the target only', () => {
    expect(isHighPointAnswerCorrect('mollehoj', record('DNK'), corpus)).toBe(true)
    expect(isHighPointAnswerCorrect('Møllehøi', record('DNK'), corpus)).toBe(true)
    expect(isHighPointAnswerCorrect('Mount Everest', record('NPL'), corpus)).toBe(true)
  })

  it('rejects another known answer and ambiguous fuzzy collisions', () => {
    expect(matchHighPointAnswer('Teide', record('PRT'), corpus)).toMatchObject({ accepted: false, reason: 'collision' })
    expect(isHighPointAnswerCorrect('Mount Everst', record('NPL'), corpus)).toBe(true)
    expect(isHighPointAnswerCorrect('Mount Everst', record('CHN'), corpus)).toBe(true)
  })

  it('keeps timed matching prefix-safe across the complete corpus', () => {
    expect(isTimedHighPointAnswerAccepted('Pico', record('PRT'), corpus)).toBe(false)
    expect(isTimedHighPointAnswerAccepted('Pico', record('PRT'), [record('PRT')])).toBe(true)
    expect(isTimedHighPointAnswerAccepted('Mount Eve', record('NPL'), corpus)).toBe(false)
  })

  it('permits exact shared-feature labels for every declared member only', () => {
    expect(isTimedHighPointAnswerAccepted('Mont Blanc', record('FRA'), corpus)).toBe(true)
    expect(isTimedHighPointAnswerAccepted('Mont Blanc', record('ITA'), corpus)).toBe(true)
    expect(isHighPointAnswerCorrect('Mont Blanc', record('CHE'), corpus)).toBe(false)
  })
})
