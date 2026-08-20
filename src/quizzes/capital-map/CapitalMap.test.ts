import { describe, expect, it } from 'vitest'
import { MAP_PAN_BOUNDS, MAP_VIEWPORT_OPTIONS, TARGET_FOCUS_COMPACT_ZOOM, TARGET_FOCUS_WIDE_ZOOM, WORLD_BOUNDS, targetFocusZoom } from './mapViewport'

describe('capital-map viewport policy', () => {
  it('uses a regional target zoom appropriate to the map width', () => {
    expect(targetFocusZoom(899)).toBe(TARGET_FOCUS_COMPACT_ZOOM)
    expect(targetFocusZoom(900)).toBe(TARGET_FOCUS_WIDE_ZOOM)
  })

  it('keeps a safe initial world fallback and permits antimeridian targets to center', () => {
    expect(MAP_VIEWPORT_OPTIONS.minZoom).toBe(0)
    expect(MAP_VIEWPORT_OPTIONS.worldCopyJump).toBe(false)
    expect(MAP_VIEWPORT_OPTIONS.maxBoundsViscosity).toBe(1)
    expect(WORLD_BOUNDS).toEqual([[-58, -180], [82, 180]])
    expect(MAP_PAN_BOUNDS).toEqual([[-85, -270], [85, 270]])
  })
})
