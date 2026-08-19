export const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-58, -180],
  [82, 180],
]

export const MAP_VIEWPORT_OPTIONS = {
  minZoom: 0,
  maxZoom: 8,
  maxBoundsViscosity: 1,
  worldCopyJump: false,
} as const

export const MAP_LABEL = 'Interactive world map with one dot for every capital city. The gold ring marks the capital to name.'
