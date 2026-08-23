import { describe, expect, it } from 'vitest'
import { flagRecordById } from '../../core/flags'
import { flagTerritoryContinents } from '../../core/flagTerritoryContinentPolicy'
import { flagAnswerCorpus, flagCountryQuestions, flagRecordContinent, isFlagCountryAnswerCorrect, isTimedFlagCountryAnswerAccepted, isTimedFlagCountryExactSubmitAccepted, matchFlagCountryAnswer } from './flagCountry'

describe('flag country catalog composition', () => {
  it('uses the exact sovereign/territory scopes and explicit continent policy', () => {
    expect(flagCountryQuestions('without-territories')).toHaveLength(197)
    expect(flagCountryQuestions('with-territories')).toHaveLength(235)
    expect(flagCountryQuestions('only-territories')).toHaveLength(38)
    expect(Object.keys(flagTerritoryContinents)).toHaveLength(38)
    expect(flagCountryQuestions('only-territories').every((question) => flagRecordContinent(question.flag) === question.continent)).toBe(true)
  })
  it('keeps all scope-plus-continent counts stable after scope composition', () => {
    const counts = (scope: Parameters<typeof flagCountryQuestions>[0]) => Object.fromEntries(['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'].map((continent) => [continent, flagCountryQuestions(scope, continent as never).length]))
    expect(counts('without-territories')).toEqual({ Africa: 54, Asia: 48, Europe: 46, 'North America': 23, 'South America': 12, Oceania: 14 })
    expect(counts('with-territories')).toEqual({ Africa: 57, Asia: 50, Europe: 52, 'North America': 38, 'South America': 13, Oceania: 25 })
    expect(counts('only-territories')).toEqual({ Africa: 3, Asia: 2, Europe: 6, 'North America': 15, 'South America': 1, Oceania: 11 })
  })
})

describe('flag-country answer matching', () => {
  it('normalizes, permits controlled typos, rejects exact other answers, and waits for prefixes', () => {
    const target = flagRecordById('USA')
    expect(isFlagCountryAnswerCorrect('United States of America', target)).toBe(true)
    expect(isFlagCountryAnswerCorrect('Untied States', target)).toBe(true)
    expect(matchFlagCountryAnswer('Canada', target)).toBe('known-other')
    expect(isTimedFlagCountryAnswerAccepted('United', target)).toBe(false)
    // The exact sovereign spelling is also the start of United States Virgin
    // Islands, so timed mode deliberately waits for its unambiguous alias.
    expect(isTimedFlagCountryAnswerAccepted('United States', target)).toBe(false)
    expect(isTimedFlagCountryAnswerAccepted('United States of America', target)).toBe(true)
    expect(isTimedFlagCountryAnswerAccepted('USA', target)).toBe(true)
    expect(matchFlagCountryAnswer('USA', target)).toBe('correct')
  })
  it('does not auto-complete a short exact answer that is a prefix of another known record', () => {
    const target = flagRecordById('NER')
    expect(isTimedFlagCountryAnswerAccepted('Niger', target)).toBe(false)
    expect(isFlagCountryAnswerCorrect('Niger', target)).toBe(true)
  })
  it('unions sovereign entity aliases without creating cross-record collisions', () => {
    expect(isFlagCountryAnswerCorrect('DR Congo', flagRecordById('COD'))).toBe(true)
    expect(isFlagCountryAnswerCorrect('Congo-Kinshasa', flagRecordById('COD'))).toBe(true)
    expect(isFlagCountryAnswerCorrect('Congo-Brazzaville', flagRecordById('COG'))).toBe(true)
    expect(isFlagCountryAnswerCorrect('The Bahamas', flagRecordById('BHS'))).toBe(true)
    expect(isFlagCountryAnswerCorrect('The Gambia', flagRecordById('GMB'))).toBe(true)
    expect(isFlagCountryAnswerCorrect('DPRK', flagRecordById('PRK'))).toBe(true)
    const owners = new Map<string, Set<string>>()
    for (const { record, name } of flagAnswerCorpus()) {
      const ids = owners.get(name) ?? new Set<string>()
      ids.add(record.id)
      owners.set(name, ids)
    }
    expect([...owners.values()].every((ids) => ids.size === 1)).toBe(true)
  })
  it('provides an exact Enter path for every otherwise-prefix-safe target without accepting other records', () => {
    for (const question of flagCountryQuestions('with-territories')) {
      const names = flagAnswerCorpus().filter(({ record }) => record.id === question.id).map(({ name }) => name)
      expect(names.some((name) => isTimedFlagCountryAnswerAccepted(name, question.flag) || isTimedFlagCountryExactSubmitAccepted(name, question.flag))).toBe(true)
    }
    for (const [id, answer] of [['DMA', 'Dominica'], ['GIN', 'Guinea'], ['NER', 'Niger'], ['GBR', 'UK'], ['USA', 'United States']] as const) {
      const target = flagRecordById(id)
      expect(isTimedFlagCountryAnswerAccepted(answer, target)).toBe(false)
      expect(isTimedFlagCountryExactSubmitAccepted(answer, target)).toBe(true)
    }
    expect(isTimedFlagCountryExactSubmitAccepted('Dominica', flagRecordById('DOM'))).toBe(false)
    expect(isTimedFlagCountryExactSubmitAccepted('Guinea', flagRecordById('GNB'))).toBe(false)
    expect(isTimedFlagCountryExactSubmitAccepted('Niger', flagRecordById('NGA'))).toBe(false)
    expect(isTimedFlagCountryAnswerAccepted('United Kingdom', flagRecordById('GBR'))).toBe(true)
  })
})
