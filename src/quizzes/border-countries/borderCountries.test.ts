import { describe, expect, it } from 'vitest'
import { BORDER_DATA_VERSION, borderEntity, borderLineContainedInShape, borderQuestions } from './borderCountries'

describe('border-country decks', () => {
  it('keeps the complete curated pair roster in both modes', () => {
    const hard = borderQuestions('hard', 'All', () => 0)
    const easy = borderQuestions('easy', 'All', () => 0)
    expect(hard).toHaveLength(317); expect(easy).toHaveLength(317)
    expect(new Set(hard.map(question => question.codes.join(','))).size).toBe(317)
    expect(new Set(easy.map(question => question.codes.join(','))).size).toBe(317)
    expect(BORDER_DATA_VERSION).toContain('orientation-1')
  })
  it('orients Easy with its injected random source and respects selected continent', () => {
    const first = borderQuestions('easy', 'Europe', () => 0)
    const second = borderQuestions('easy', 'Europe', () => .99)
    expect(first).toHaveLength(second.length)
    for (const question of first) expect(borderEntity(question.knownCode!)?.continent).toBe('Europe')
    expect(first.some((question, index) => question.knownCode !== second[index].knownCode)).toBe(true)
  })
  it('locks the nine Overture overrides and selected Spain–Morocco primary run', () => {
    const overrides = borderQuestions('hard').filter(question => question.source !== 'current-shapes')
    expect(overrides.map(question => question.codes.join(','))).toEqual(['AND,ESP','AND,FRA','AUT,LIE','BWA,ZMB','CHE,LIE','ESP,MAR','FRA,MCO','ITA,SMR','ITA,VAT'])
    expect(overrides.find(question => question.codes.join(',') === 'ESP,MAR')?.path).toHaveLength(117)
    expect(overrides.find(question => question.codes.join(',') === 'BWA,ZMB')?.path).toHaveLength(2)
  })
  it('keeps every selected run exactly on both eligible Easy silhouettes', () => {
    for (const random of [() => 0, () => .99]) for (const question of borderQuestions('easy', 'All', random)) {
      expect(borderLineContainedInShape(question, question.knownCode!)).toBe(true)
    }
  })
})
