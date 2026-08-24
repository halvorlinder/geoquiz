import { describe, expect, it } from 'vitest'
import { borderContextGeometry } from './borderContextGeometry'
import { borderQuestions, borderShape } from './borderCountries'

describe('borderContextGeometry', () => {
  it('keeps Overture positive outer rings, assigns contained negative holes, and exposes no properties', () => {
    const outerA = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]] as const
    const holeA = [[1, 1], [1, 2], [2, 2], [2, 1], [1, 1]] as const
    const outerB = [[8, 0], [10, 0], [10, 2], [8, 2], [8, 0]] as const
    const geometry = borderContextGeometry([outerA, holeA, outerB])
    expect(geometry.properties).toEqual({})
    expect(geometry.geometry.type).toBe('MultiPolygon')
    expect(geometry.geometry.coordinates).toEqual([[outerA, holeA], [outerB]])
  })

  it('uses the exact Overture override rings for both sides of an overridden Easy card', () => {
    const question = borderQuestions('easy', 'All', () => 0).find(value => value.codes.join(',') === 'ITA,VAT')!
    for (const code of question.codes) {
      const shape = borderShape(code, question.source)!
      const feature = borderContextGeometry(shape)
      expect(feature.properties).toEqual({})
      expect(JSON.stringify(feature.geometry.coordinates)).toContain(question.path[0][0].toFixed(7).replace(/0+$/, ''))
    }
  })
})
