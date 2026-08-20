export const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-58, -180],
  [82, 180],
]

// The initial full-world view remains intentionally constrained. Regional target
// focus needs a finite Web-Mercator-safe latitude allowance and an extra 90° on
// either side of the antimeridian so southern and dateline capitals can center.
export const MAP_PAN_BOUNDS: [[number, number], [number, number]] = [
  [-85, -270],
  [85, 270],
]

export const MAP_VIEWPORT_OPTIONS = {
  minZoom: 0,
  maxZoom: 8,
  maxBoundsViscosity: 1,
  worldCopyJump: false,
} as const

export const TARGET_FOCUS_WIDE_ZOOM = 4
export const TARGET_FOCUS_COMPACT_ZOOM = 3

export function targetFocusZoom(mapWidth: number): number {
  return mapWidth >= 900 ? TARGET_FOCUS_WIDE_ZOOM : TARGET_FOCUS_COMPACT_ZOOM
}

export const MAP_LABEL = 'Interactive world map with one dot for every capital city. The gold ring marks the capital to name.'
