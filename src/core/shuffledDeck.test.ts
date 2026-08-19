import { describe, expect, it } from 'vitest'
import { advanceQuiz, isComplete, shuffled, startQuiz } from './shuffledDeck'

describe('shuffled deck', () => {
  it('uses every item exactly once', () => {
    const result = shuffled(['a', 'b', 'c', 'd'], () => 0)
    expect(result).toHaveLength(4)
    expect([...result].sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('tracks score, reveal state, and completion', () => {
    const initial = startQuiz(['a', 'b'], () => 0.5)
    expect(isComplete(initial)).toBe(false)
    const afterCorrect = advanceQuiz(initial, true)
    expect(afterCorrect.correct).toBe(1)
    expect(afterCorrect.index).toBe(1)
    const completed = advanceQuiz(afterCorrect, false)
    expect(isComplete(completed)).toBe(true)
    expect(completed.correct).toBe(1)
  })
})
