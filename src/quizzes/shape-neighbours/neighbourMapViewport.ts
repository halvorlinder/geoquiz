import type { CountryShape } from '../../core/countryShapes'

export type NeighbourMapFocus = Readonly<{
  center: readonly [latitude: number, longitude: number]
  bounds: readonly [south: number, west: number, north: number, east: number]
  maxZoom: number
}>

const MINIMUM_SPAN_DEGREES = 0.14
const PADDING_RATIO = 0.42
// 17 keeps the 0.1° microstates visually meaningful without turning the map
// into an arbitrary close-up for ordinary countries.
const MAX_ZOOM = 17

/**
 * Calculates a stable question frame from the target only. Deliberately does
 * not accept revealed layers: tiny targets must not shrink when Austria or a
 * similarly large neighbour is added to the map.
 */
export function neighbourTargetFocus(shape: CountryShape): NeighbourMapFocus {
  const [west, south, east, north] = shape.bounds
  const width = Math.max(east - west, MINIMUM_SPAN_DEGREES)
  const height = Math.max(north - south, MINIMUM_SPAN_DEGREES)
  const centerLongitude = (west + east) / 2
  const centerLatitude = (south + north) / 2
  const paddedWidth = width * (1 + PADDING_RATIO * 2)
  const paddedHeight = height * (1 + PADDING_RATIO * 2)
  return {
    center: [centerLatitude, centerLongitude],
    bounds: [
      centerLatitude - paddedHeight / 2,
      centerLongitude - paddedWidth / 2,
      centerLatitude + paddedHeight / 2,
      centerLongitude + paddedWidth / 2,
    ],
    maxZoom: MAX_ZOOM,
  }
}
