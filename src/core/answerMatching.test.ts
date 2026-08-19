import { describe, expect, it } from 'vitest'
import capitals from '../data/capitals.json'
import { allowedDistance, checkCapitalAnswer, damerauLevenshtein, normalizeAnswer } from './answerMatching'
import type { Capital } from './capital'

const data = capitals as Capital[]

describe('answer normalization', () => {
  it('normalizes case, spacing, punctuation, and diacritics', () => {
    expect(normalizeAnswer("  N'Djaména  ")).toBe('n djamena')
    expect(normalizeAnswer('São---Tomé')).toBe('sao tome')
  })

  it('counts a transposition as one edit', () => {
    expect(damerauLevenshtein('oslo', 'olso')).toBe(1)
    expect(damerauLevenshtein('swhington', 'washington')).toBe(2)
    expect(allowedDistance(3)).toBe(0)
    expect(allowedDistance(4)).toBe(1)
    expect(allowedDistance(5)).toBe(1)
    expect(allowedDistance(12)).toBe(2)
  })

  it('has identity of indiscernibles and symmetric distances', () => {
    const values = ['', 'a', 'aa', 'Tunis', 'Tunniss', 'Talllinnn', 'swhington', 'washington']
    for (const left of values) {
      for (const right of values) {
        const distance = damerauLevenshtein(left, right)
        expect(distance === 0, `${left} / ${right}`).toBe(left === right)
        expect(distance, `${left} / ${right}`).toBe(damerauLevenshtein(right, left))
      }
    }
  })

  it('is symmetric for every normalized dataset capital name', () => {
    const names = data.map((capital) => normalizeAnswer(capital.capital))
    for (const left of names) {
      for (const right of names) {
        expect(damerauLevenshtein(left, right), `${left} / ${right}`).toBe(damerauLevenshtein(right, left))
      }
    }
  })

  it('handles repeated-letter insertions and reference vectors correctly', () => {
    expect(damerauLevenshtein('aa', 'a')).toBe(1)
    expect(damerauLevenshtein('tunniss', 'tunis')).toBe(2)
    expect(damerauLevenshtein('berrlinn', 'berlin')).toBe(2)
    expect(damerauLevenshtein('talllinnn', 'tallinn')).toBe(2)
    expect(damerauLevenshtein('kinngstonn', 'kingston')).toBe(2)
    expect(damerauLevenshtein('swhington', 'washington')).toBe(2)
    expect(damerauLevenshtein('kitten', 'sitting')).toBe(3)
  })
})

describe('capital answers', () => {
  const metadata = { entities: [], coordinateSource: 'test', checked: '2026-08-19' }
  const oslo: Capital = { ...metadata, id: 'oslo', capital: 'Oslo', latitude: 59.9, longitude: 10.7 }
  const rome: Capital = { ...metadata, id: 'rome', capital: 'Rome', latitude: 41.9, longitude: 12.5 }
  const kingston: Capital = { ...metadata, id: 'kingston', capital: 'Kingston', latitude: 18, longitude: -76.8 }

  it('accepts canonical names, aliases, and small typos', () => {
    const target: Capital = { ...kingston, aliases: ['Kingston, Jamaica'] }
    expect(checkCapitalAnswer('kingstno', target, [target])).toMatchObject({ status: 'correct' })
    expect(checkCapitalAnswer('KINGSTON, JAMAICA', target, [target])).toMatchObject({ status: 'correct' })
  })

  it('accepts one edit for four-letter capital names', () => {
    expect(checkCapitalAnswer('osl', oslo, [oslo, rome])).toMatchObject({ status: 'correct' })
    expect(checkCapitalAnswer('olso', oslo, [oslo, rome])).toMatchObject({ status: 'correct' })
  })

  it('never accepts another capital as a typo', () => {
    expect(checkCapitalAnswer('Rome', oslo, [oslo, rome])).toEqual({ status: 'incorrect' })
  })

  it('rejects a nearby exact canonical answer for another capital before fuzzy matching', () => {
    const romeData = data.find((capital) => capital.capital === 'Rome')!
    const lomeData = data.find((capital) => normalizeAnswer(capital.capital) === 'lome')!
    expect(checkCapitalAnswer('Lome', romeData, data)).toEqual({ status: 'incorrect' })
    expect(damerauLevenshtein(normalizeAnswer(lomeData.capital), normalizeAnswer(romeData.capital))).toBe(1)
  })

  it('never accepts entity names as capital aliases', () => {
    const ankara = data.find((capital) => capital.capital === 'Ankara')!
    const prague = data.find((capital) => capital.capital === 'Prague')!
    const praia = data.find((capital) => capital.capital === 'Praia')!
    expect(checkCapitalAnswer('Turkey', ankara, data)).toEqual({ status: 'incorrect' })
    expect(checkCapitalAnswer('Czech Republic', prague, data)).toEqual({ status: 'incorrect' })
    expect(checkCapitalAnswer('Cape Verde', praia, data)).toEqual({ status: 'incorrect' })
  })

  it('rejects clearly unrelated input', () => {
    expect(checkCapitalAnswer('Bergen', oslo, [oslo, rome])).toEqual({ status: 'incorrect' })
  })

  it('does not let repeated-letter corruption bypass short-answer tolerance', () => {
    const tunis = data.find((capital) => capital.capital === 'Tunis')!
    const berlin = data.find((capital) => capital.capital === 'Berlin')!
    const tallinn = data.find((capital) => capital.capital === 'Tallinn')!
    const kingstonData = data.find((capital) => capital.capital === 'Kingston')!
    expect(checkCapitalAnswer('Tunniss', tunis, data)).toEqual({ status: 'incorrect' })
    expect(checkCapitalAnswer('Berrlinn', berlin, data)).toEqual({ status: 'incorrect' })
    expect(checkCapitalAnswer('Talllinnn', tallinn, data)).toEqual({ status: 'incorrect' })
    expect(checkCapitalAnswer('Kinngstonn', kingstonData, data)).toEqual({ status: 'incorrect' })
  })

  it('does not permit exact known non-target names across the full dataset', () => {
    for (const target of data) {
      for (const other of data) {
      if (target.id === other.id) continue
        expect(checkCapitalAnswer(other.capital, target, data).status, `${other.capital} must not answer ${target.capital}`).toBe('incorrect')
        for (const alias of other.aliases ?? []) {
          expect(checkCapitalAnswer(alias, target, data).status, `${alias} must not answer ${target.capital}`).toBe('incorrect')
        }
      }
    }
  })
})
