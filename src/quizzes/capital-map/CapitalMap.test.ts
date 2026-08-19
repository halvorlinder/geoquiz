import { describe, expect, it } from 'vitest'
import { MAP_VIEWPORT_OPTIONS, WORLD_BOUNDS } from './mapViewport'

describe('capital-map viewport policy', () => {
  it('allows the full constrained world to fit on narrow viewports', () => {
    expect(MAP_VIEWPORT_OPTIONS.minZoom).toBe(0)
    expect(MAP_VIEWPORT_OPTIONS.worldCopyJump).toBe(false)
    expect(MAP_VIEWPORT_OPTIONS.maxBoundsViscosity).toBe(1)
    expect(WORLD_BOUNDS).toEqual([[-58, -180], [82, 180]])
  })
})
