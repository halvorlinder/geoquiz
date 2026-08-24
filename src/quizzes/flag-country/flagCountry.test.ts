import { describe, expect, it } from 'vitest'
import { flagRecordById } from '../../core/flags'
import { flagTerritoryContinents } from '../../core/flagTerritoryContinentPolicy'
import { flagAnswerCorpus, flagCountryQuestions, flagExactAnswerOwners, flagRecordContinent, isFlagCountryAnswerCorrect, isTimedFlagCountryAnswerAccepted, isTimedFlagCountryExactSubmitAccepted, matchFlagCountryAnswer } from './flagCountry'

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
    for (const candidate of flagAnswerCorpus()) {
      const owners = flagExactAnswerOwners(candidate.name)
      expect(owners, `${candidate.name} must have one runtime exact-answer owner`).toEqual([candidate.record.id])
    }
  })

  it('shares the complete exact-only abbreviation roster with sovereign flags', () => {
    const roster: Readonly<Record<string, readonly string[]>> = {
      ARE: ['UAE'], BIH: ['BiH'], CAF: ['CAR'], COD: ['DRC'], FSM: ['FSM'], GBR: ['UK'], KOR: ['ROK'],
      NZL: ['NZ'], PNG: ['PNG'], PRK: ['DPRK'], SAU: ['KSA'], USA: ['US', 'USA'], ZAF: ['RSA'],
    }
    for (const [id, abbreviations] of Object.entries(roster)) {
      const target = flagRecordById(id)
      for (const abbreviation of abbreviations) {
        for (const submitted of [abbreviation, abbreviation.split('').join('.'), abbreviation.split('').join('-'), abbreviation.split('').join(' ')]) {
          expect(isFlagCountryAnswerCorrect(submitted, target), `${submitted} must answer ${id}`).toBe(true)
          if (!((id === 'GBR' && abbreviation === 'UK') || (id === 'USA' && abbreviation === 'US'))) expect(isTimedFlagCountryAnswerAccepted(submitted, target), `${submitted} must auto-accept for ${id}`).toBe(true)
        }
        expect(matchFlagCountryAnswer(`${abbreviation}x`, target), `${abbreviation} typo must not be fuzzy`).toBe('invalid')
      }
    }
    const exactOnly = flagAnswerCorpus().filter((candidate) => candidate.exactOnly)
    expect(exactOnly.map(({ record, name }) => `${record.id}:${name}`)).toEqual([
      'ARE:uae', 'BIH:bih', 'CAF:car', 'COD:drc', 'FSM:fsm', 'GBR:uk', 'KOR:rok', 'NZL:nz', 'PNG:png', 'PRK:dprk', 'SAU:ksa', 'USA:us', 'USA:usa', 'ZAF:rsa',
    ])
  })

  it('requires exact Enter for the UK and US prefix abbreviations while auto-accepting other abbreviations', () => {
    for (const submitted of ['UK', 'U.K.', 'U K', 'U-K']) {
      expect(matchFlagCountryAnswer(submitted, flagRecordById('GBR'), { timed: true })).toBe('prefix')
      expect(isTimedFlagCountryAnswerAccepted(submitted, flagRecordById('GBR'))).toBe(false)
      expect(isTimedFlagCountryExactSubmitAccepted(submitted, flagRecordById('GBR'))).toBe(true)
    }
    for (const submitted of ['US', 'U.S.', 'U S', 'U-S']) {
      expect(matchFlagCountryAnswer(submitted, flagRecordById('USA'), { timed: true })).toBe('prefix')
      expect(isTimedFlagCountryAnswerAccepted(submitted, flagRecordById('USA'))).toBe(false)
      expect(isTimedFlagCountryExactSubmitAccepted(submitted, flagRecordById('USA'))).toBe(true)
    }
    expect(isTimedFlagCountryAnswerAccepted('UAE', flagRecordById('ARE'))).toBe(true)
    expect(isTimedFlagCountryAnswerAccepted('USA', flagRecordById('USA'))).toBe(true)
  })

  it('never lets an abbreviation answer another flag target in the full catalog', () => {
    const abbreviations = flagAnswerCorpus().filter((candidate) => candidate.exactOnly)
    for (const target of flagCountryQuestions('with-territories')) for (const candidate of abbreviations) {
      if (candidate.record.id === target.id) continue
      expect(matchFlagCountryAnswer(candidate.name, target.flag), `${candidate.name} must not answer ${target.id}`).not.toBe('correct')
    }
  })
  it('rejects every non-curated production entity code in compact punctuation variants', () => {
    const codeIdenticalCurated = new Set(['BIH', 'FSM', 'PNG', 'USA'])
    for (const target of flagCountryQuestions('without-territories')) {
      for (const submitted of [target.id, target.id.split('').join('.'), `${target.id}.`, target.id.split('').join('-'), target.id.split('').join(' ')]) {
        if (codeIdenticalCurated.has(target.id)) expect(matchFlagCountryAnswer(submitted, target.flag), `${submitted} is an explicitly curated abbreviation`).toBe('correct')
        else {
          expect(matchFlagCountryAnswer(submitted, target.flag), `${submitted} must not become an identifier answer`).toBe('invalid')
          expect(isTimedFlagCountryExactSubmitAccepted(submitted, target.flag)).toBe(false)
        }
      }
    }
    expect(matchFlagCountryAnswer('TUR', flagRecordById('TUR'))).toBe('invalid')
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
