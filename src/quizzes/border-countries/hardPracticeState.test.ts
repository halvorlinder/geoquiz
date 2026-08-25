import { describe, expect, it } from 'vitest'
import { blankHardPracticeState, discloseCorrect, hardDisclosureFor, hardPracticeCountsCorrect, isHardPracticeComplete, revealAllHardEndpoints, revealOneHardEndpoint } from './hardPracticeState'

const codes = ['AAA', 'BBB'] as const

describe('Hard Practice disclosure state', () => {
  it('records either first correct answer without revealing the other endpoint', () => {
    const state=discloseCorrect(blankHardPracticeState(), 'BBB')
    expect(hardDisclosureFor(state,'BBB')).toBe('correct')
    expect(hardDisclosureFor(state,'AAA')).toBeUndefined()
    expect(isHardPracticeComplete(state,codes)).toBe(false)
  })
  it('reveals the stable first unresolved endpoint once, then the remaining endpoint after a correct answer', () => {
    const first=revealOneHardEndpoint(blankHardPracticeState(),codes)
    expect(hardDisclosureFor(first,'AAA')).toBe('revealed')
    expect(revealOneHardEndpoint(first,codes)).toBe(first)
    const afterCorrect=discloseCorrect(blankHardPracticeState(),'AAA')
    expect(hardDisclosureFor(revealOneHardEndpoint(afterCorrect,codes),'BBB')).toBe('revealed')
  })
  it('marks mixed and full reveal paths complete but ineligible for a fully-correct score', () => {
    const mixed=discloseCorrect(revealOneHardEndpoint(blankHardPracticeState(),codes),'BBB')
    expect(isHardPracticeComplete(mixed,codes)).toBe(true)
    expect(hardPracticeCountsCorrect(mixed,codes)).toBe(false)
    const full=revealAllHardEndpoints(blankHardPracticeState(),codes)
    expect(isHardPracticeComplete(full,codes)).toBe(true)
    expect(hardPracticeCountsCorrect(full,codes)).toBe(false)
  })
  it('keeps a completely correct pair eligible', () => {
    const state=discloseCorrect(discloseCorrect(blankHardPracticeState(),'AAA'),'BBB')
    expect(isHardPracticeComplete(state,codes)).toBe(true)
    expect(hardPracticeCountsCorrect(state,codes)).toBe(true)
  })
})
