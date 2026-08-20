import { describe, expect, it } from 'vitest'
import { countryBoundaryLines, makeAntimeridianSafeBoundaryLines, sourceCountryBoundaryLines, splitLineAtAntimeridian } from './countryBoundaries'

function hasArtificialJump(coordinates: ReadonlyArray<readonly number[]>): boolean {
  return coordinates.some((coordinate, index) => index > 0 && Math.abs(coordinate[0] - coordinates[index - 1][0]) > 180)
}

describe('country boundary antimeridian handling', () => {
  it("splits the bundled mesh's seam jumps before Leaflet renders them", () => {
    expect(sourceCountryBoundaryLines.coordinates.some(hasArtificialJump)).toBe(true)
    expect(countryBoundaryLines.coordinates.length).toBeGreaterThan(sourceCountryBoundaryLines.coordinates.length)

    for (const line of countryBoundaryLines.coordinates) {
      expect(hasArtificialJump(line)).toBe(false)
      for (const coordinate of line) {
        expect(Number.isFinite(coordinate[0])).toBe(true)
        expect(Number.isFinite(coordinate[1])).toBe(true)
      }
    }
  })

  it('interpolates a crossing at both sides of the antimeridian', () => {
    expect(splitLineAtAntimeridian([[170, 10], [-170, 30]])).toEqual([
      [[170, 10], [180, 20]],
      [[-180, 20], [-170, 30]],
    ])
    expect(splitLineAtAntimeridian([[-170, 30], [170, 10]])).toEqual([
      [[-170, 30], [-180, 20]],
      [[180, 20], [170, 10]],
    ])
  })

  it('handles exact +180°/-180° transitions without a cross-world stroke', () => {
    const geometry = makeAntimeridianSafeBoundaryLines({
      type: 'MultiLineString',
      coordinates: [[[170, 0], [180, 5], [-180, 5], [-170, 10]]],
    })

    expect(geometry.coordinates).toEqual([
      [[170, 0], [180, 5]],
      [[-180, 5], [-170, 10]],
    ])
    expect(geometry.coordinates.flat().every((coordinate) => Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]))).toBe(true)
  })

  it('preserves a north-south seam segment on both sides of an eastward transition', () => {
    expect(splitLineAtAntimeridian([[180, 5], [-180, 8], [-170, 10]])).toEqual([
      [[180, 5], [180, 8]],
      [[-180, 5], [-180, 8], [-170, 10]],
    ])
  })

  it('preserves a north-south seam segment on both sides of a westward transition', () => {
    expect(splitLineAtAntimeridian([[-180, 8], [180, 5], [170, 0]])).toEqual([
      [[-180, 8], [-180, 5]],
      [[180, 8], [180, 5], [170, 0]],
    ])
  })

  it('does not emit a zero-length segment for equal-latitude seam points', () => {
    expect(splitLineAtAntimeridian([[180, 5], [-180, 5]])).toEqual([])
  })
})
