import countryShapesData from '../../data/country-shapes.json'
import { getCountryShape, type CountryShapeDataset } from '../../core/countryShapes'
import { describe, expect, it } from 'vitest'
import { neighbourTargetFocus } from './neighbourMapViewport'

const shapes = countryShapesData as unknown as CountryShapeDataset

describe('neighbour target focus', () => {
  it('uses target geometry only and gives microstates a material stable frame', () => {
    const liechtenstein = neighbourTargetFocus(getCountryShape(shapes, 'LIE')!)
    const vatican = neighbourTargetFocus(getCountryShape(shapes, 'VAT')!)
    const monaco = neighbourTargetFocus(getCountryShape(shapes, 'MCO')!)
    expect(liechtenstein.maxZoom).toBe(17)
    expect(liechtenstein.bounds[2] - liechtenstein.bounds[0]).toBeGreaterThanOrEqual(0.14)
    expect(vatican.bounds[3] - vatican.bounds[1]).toBeGreaterThanOrEqual(0.14)
    expect(monaco.bounds[3] - monaco.bounds[1]).toBeGreaterThanOrEqual(0.14)
    // There is intentionally no revealed-neighbour input, so Austria and
    // Switzerland cannot influence this frame.
    expect(neighbourTargetFocus(getCountryShape(shapes, 'LIE')!)).toEqual(liechtenstein)
  })
})
