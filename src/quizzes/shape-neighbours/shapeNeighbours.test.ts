import { describe, expect, it } from 'vitest'
import { getEligibleNeighbourEntityCodes, getNeighbourCodes } from '../../core/neighbours'
import { studyEntities } from '../../core/entity'
import { shapeNeighbourQuestionCounts, shapeNeighboursQuestions } from './shapeNeighbours'

describe('shape neighbour question catalog', () => {
  it('has the approved 157-question eligible deck and continent counts', () => {
    expect(shapeNeighboursQuestions()).toHaveLength(157)
    expect(shapeNeighbourQuestionCounts()).toEqual({ All: 157, Africa: 48, Asia: 40, Europe: 44, 'North America': 12, 'South America': 12, Oceania: 1 })
  })

  it('uses only curated reciprocal neighbour sets and excludes zero-neighbour entities', () => {
    const questions = shapeNeighboursQuestions()
    expect(new Set(questions.map((question) => question.entity.code))).toEqual(new Set(getEligibleNeighbourEntityCodes()))
    for (const question of questions) {
      expect(question.neighbourCodes).toEqual(getNeighbourCodes(question.entity.code))
      for (const code of question.neighbourCodes) expect(getNeighbourCodes(code)).toContain(question.entity.code)
    }
    expect(questions.some((question) => question.entity.code === 'CYP')).toBe(false)
    expect(studyEntities.filter((entity) => !getEligibleNeighbourEntityCodes().includes(entity.code)).some((entity) => entity.code === 'CYP')).toBe(true)
  })

  it('keeps cross-continent required answers when filtering targets', () => {
    const europe = shapeNeighboursQuestions(undefined, 'Europe')
    const russia = europe.find((question) => question.entity.code === 'RUS')
    expect(russia?.neighbourCodes).toContain('KAZ')
  })
})
