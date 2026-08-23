import { describe, expect, it } from 'vitest'
import type { StudyEntity } from './entity'
import { studyEntities } from './entity'
import { matchNeighbourAnswer } from './entityAnswerMatching'
import { normalizeAnswer } from './answerMatching'

const entities: StudyEntity[] = [
  { code: 'AAA', name: 'Alpha Republic', aliases: ['Álpha'], continent: 'Europe', capitals: [] },
  { code: 'BBB', name: 'Beta State', aliases: [], continent: 'Europe', capitals: [] },
  { code: 'CCC', name: 'Delta', aliases: [], continent: 'Europe', capitals: [] },
  { code: 'DDD', name: 'Delto', aliases: [], continent: 'Europe', capitals: [] },
]

describe('entity neighbour answer matching', () => {
  it('normalizes aliases, detects duplicates, and rejects codes', () => {
    expect(matchNeighbourAnswer(' ALPHA ', ['AAA'], [], entities)).toMatchObject({ status: 'correct-new', entity: entities[0] })
    expect(matchNeighbourAnswer('álpha', ['AAA'], ['AAA'], entities)).toMatchObject({ status: 'duplicate' })
    expect(matchNeighbourAnswer('AAA', ['AAA'], [], entities)).toEqual({ status: 'invalid' })
  })

  it('keeps known non-neighbours out and blocks timed prefixes and ambiguous typos', () => {
    expect(matchNeighbourAnswer('Beta State', ['AAA'], [], entities)).toMatchObject({ status: 'known-non-neighbour' })
    expect(matchNeighbourAnswer('alp', ['AAA'], [], entities, { timed: true })).toEqual({ status: 'invalid' })
    expect(matchNeighbourAnswer('Deltx', ['AAA', 'CCC', 'DDD'], [], entities, { timed: true })).toEqual({ status: 'ambiguous' })
  })

  it('resolves strict-prefix names from the current missing neighbour context', () => {
    const niger = studyEntities.find((entity) => entity.code === 'NER')!
    const nigeria = studyEntities.find((entity) => entity.code === 'NGA')!
    const guinea = studyEntities.find((entity) => entity.code === 'GIN')!
    const guineaBissau = studyEntities.find((entity) => entity.code === 'GNB')!
    const dominica = studyEntities.find((entity) => entity.code === 'DMA')!
    const dominicanRepublic = studyEntities.find((entity) => entity.code === 'DOM')!
    for (const entity of [niger, guinea]) {
      expect(matchNeighbourAnswer(entity.name, [entity.code], [], studyEntities, { timed: true })).toMatchObject({ status: 'correct-new', entity })
    }
    expect(matchNeighbourAnswer(niger.name, [nigeria.code], [], studyEntities, { timed: true })).toEqual({ status: 'invalid' })
    expect(matchNeighbourAnswer(niger.name, [nigeria.code], [niger.code], studyEntities, { timed: true })).toMatchObject({ status: 'duplicate', entity: niger })
    expect(matchNeighbourAnswer(niger.name, [nigeria.code], [], studyEntities)).toMatchObject({ status: 'known-non-neighbour', entity: niger })
    expect(nigeria.name).toBe('Nigeria')
    expect(guineaBissau.name).toBe('Guinea-Bissau')
    expect([niger.name, guinea.name, dominica.name]).toEqual(['Niger', 'Guinea', 'Dominica'])
    expect([nigeria.name, guineaBissau.name, dominicanRepublic.name]).toEqual(['Nigeria', 'Guinea-Bissau', 'Dominican Republic'])
  })

  it('never treats another production entity spelling as a correct neighbour answer', () => {
    for (const target of studyEntities) {
      for (const other of studyEntities) {
        if (target.code === other.code) continue
        for (const spelling of [other.name, ...other.aliases]) {
          expect(matchNeighbourAnswer(spelling, [target.code], [], studyEntities).status, `${spelling} must not answer ${target.name}`).not.toBe('correct-new')
        }
      }
    }
  }, 30_000)

  it('has exactly the three curated normalized strict-prefix pairs', () => {
    const pairs = studyEntities.flatMap((left) => studyEntities.filter((right) => left.code !== right.code && normalizeAnswer(left.name) !== normalizeAnswer(right.name) && normalizeAnswer(right.name).startsWith(normalizeAnswer(left.name))).map((right) => [left.code, right.code]))
    expect(pairs).toEqual([['DMA', 'DOM'], ['GIN', 'GNB'], ['NER', 'NGA']])
  })

  it('rejects every study code and accepts controlled aliases and typos', () => {
    for (const entity of studyEntities) expect(matchNeighbourAnswer(entity.code, [entity.code], [], studyEntities)).toEqual({ status: 'invalid' })
    const cote = studyEntities.find((entity) => entity.code === 'CIV')!
    expect(matchNeighbourAnswer('  Côte   d’Ivoire ', [cote.code], [], studyEntities)).toMatchObject({ status: 'correct-new', entity: cote })
    expect(matchNeighbourAnswer('Cote d Ivoir', [cote.code], [], studyEntities)).toMatchObject({ status: 'correct-new', entity: cote })
    expect(matchNeighbourAnswer('Cote d Ivoirxxxx', [cote.code], [], studyEntities)).toEqual({ status: 'invalid' })
  })

  it('keeps equivalent Guinea prefix contexts explicit', () => {
    const guinea = studyEntities.find((entity) => entity.code === 'GIN')!, bissau = studyEntities.find((entity) => entity.code === 'GNB')!
    expect(matchNeighbourAnswer(guinea.name, [bissau.code], [], studyEntities, { timed: true })).toEqual({ status: 'invalid' })
    expect(matchNeighbourAnswer(guinea.name, [guinea.code, bissau.code], [], studyEntities, { timed: true })).toMatchObject({ status: 'correct-new', entity: guinea })
    expect(matchNeighbourAnswer(guinea.name, [bissau.code], [], studyEntities)).toMatchObject({ status: 'known-non-neighbour', entity: guinea })
  })
})
