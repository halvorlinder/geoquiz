import { describe, expect, it } from 'vitest'
import { getHighPoint } from '../../core/highPoints'
import { auditShapeHighPointJoins, shapeHighPointQuestionCounts, shapeHighPointQuestions } from './shapeHighPoint'

describe('shape-high-point question catalog', () => {
  it('joins exactly every study entity with approved continent counts and a visible exact marker', () => {
    const audit = auditShapeHighPointJoins()
    // Exact source points are unchanged; more faithful microstate geometry moves
    // four display-only classifications from outside to inside.
    expect(audit).toEqual({ total: 197, failures: [], relations: { inside: 157, edge: 0, outside: 40 } })
    expect(shapeHighPointQuestionCounts()).toEqual({ All: 197, Africa: 54, Asia: 48, Europe: 46, 'North America': 23, 'South America': 12, Oceania: 14 })
    for (const question of shapeHighPointQuestions()) {
      const source = getHighPoint(question.entity.code)!
      expect(question.highPoint.latitude).toBe(source.latitude)
      expect(question.highPoint.longitude).toBe(source.longitude)
      expect(question.marker[0]).toBeGreaterThan(0)
      expect(question.marker[0]).toBeLessThan(question.frame.width)
      expect(question.marker[1]).toBeGreaterThan(0)
      expect(question.marker[1]).toBeLessThan(question.frame.height)
    }
  })

  it('keeps antimeridian study cases finite and visible without changing source coordinates', () => {
    const byCode = new Map(shapeHighPointQuestions().map((question) => [question.entity.code, question]))
    for (const code of ['FJI', 'KIR', 'NZL', 'RUS', 'USA']) {
      const question = byCode.get(code)!
      expect(question.marker.every(Number.isFinite)).toBe(true)
      expect(question.frame.width).toBeGreaterThan(0)
      expect(question.frame.height).toBeGreaterThan(0)
    }
  })
})
