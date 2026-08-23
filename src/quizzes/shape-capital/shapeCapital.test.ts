import { describe, expect, it } from 'vitest'
import { shapeCapitalData, shapeCapitalQuestions } from './shapeCapital'

describe('shape-capital question catalog', () => {
  it('joins each of the 197 study entities to exactly one local silhouette and capital question', () => {
    const questions = shapeCapitalQuestions(shapeCapitalData.entities, shapeCapitalData.capitals)
    expect(questions).toHaveLength(197)
    expect(new Set(questions.map((question) => question.id))).toHaveLength(197)
    expect(new Set(questions.map((question) => question.shape))).toHaveLength(197)
    expect(Object.keys(shapeCapitalData.shapes.shapes)).toHaveLength(197)
    for (const question of questions) {
      expect(question.shape).toBe(shapeCapitalData.shapes.shapes[question.entity.code])
      expect(question.fields.length).toBeGreaterThan(0)
    }
  })

  it('uses the approved entity-continent policy and preserves all role-labelled capital fields', () => {
    const questionCount = (continent: Parameters<typeof shapeCapitalQuestions>[2]) => shapeCapitalQuestions(shapeCapitalData.entities, shapeCapitalData.capitals, continent).length
    expect(questionCount('All')).toBe(197)
    expect(questionCount('Africa')).toBe(54)
    expect(questionCount('Asia')).toBe(48)
    expect(questionCount('Europe')).toBe(46)
    expect(questionCount('North America')).toBe(23)
    expect(questionCount('South America')).toBe(12)
    expect(questionCount('Oceania')).toBe(14)
    const byCode = new Map(shapeCapitalQuestions(shapeCapitalData.entities, shapeCapitalData.capitals).map((question) => [question.entity.code, question]))
    expect(byCode.get('ZAF')?.fields.map(({ role, capital }) => [role, capital.capital]).sort()).toEqual([['Administrative', 'Pretoria'], ['Legislative', 'Cape Town'], ['Judicial', 'Bloemfontein']].sort())
    expect(byCode.get('BOL')?.fields.map(({ role, capital }) => [role, capital.capital]).sort()).toEqual([['Constitutional capital', 'Sucre'], ['Seat of government', 'La Paz']].sort())
    expect(byCode.get('SWZ')?.fields.map(({ role, capital }) => [role, capital.capital]).sort()).toEqual([['Administrative', 'Mbabane'], ['Royal and legislative', 'Lobamba']].sort())
  })
})
