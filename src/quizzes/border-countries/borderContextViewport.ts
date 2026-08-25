import type { BorderPosition } from './borderCountries'

export type BorderContextFocus = Readonly<{
  bounds: readonly [number, number, number, number]
  maxZoom: number
  padding: readonly [number, number]
  minimumScreenSpan: number
}>

export const BORDER_CONTEXT_MAP_HEIGHT = 260
export const BORDER_CONTEXT_MAP_PADDING = 20
export const BORDER_CONTEXT_MAP_WIDTHS = [390, 1440] as const
const WEB_MERCATOR_LIMIT = 85.05112878
const MAX_ZOOM = 18
const MINIMUM_FRAME_SPAN = .001
const SCREEN_SPACE_FLOOR = 96

function mercatorY(latitude: number) {
  const safeLatitude = Math.max(-WEB_MERCATOR_LIMIT, Math.min(WEB_MERCATOR_LIMIT, latitude))
  return (1 - Math.log(Math.tan(Math.PI / 4 + safeLatitude * Math.PI / 360)) / Math.PI) / 2
}

function projectedPoint([longitude, latitude]: BorderPosition, zoom: number): readonly [number, number] {
  const size = 256 * 2 ** zoom
  return [((longitude + 180) / 360) * size, mercatorY(latitude) * size]
}

function projectedDistance(points: readonly BorderPosition[], zoom: number) {
  return points.slice(1).reduce((total, point, index) => {
    const previous = projectedPoint(points[index], zoom)
    const current = projectedPoint(point, zoom)
    return total + Math.hypot(current[0] - previous[0], current[1] - previous[1])
  }, 0)
}

/** Mirrors Leaflet's integer, padded `fitBounds` zoom choice for this local map. */
export function borderContextFitZoom(focus: BorderContextFocus, width: number) {
  const [south, west, north, east] = focus.bounds
  const [paddingX, paddingY] = focus.padding
  const availableWidth = width - paddingX * 2
  const availableHeight = BORDER_CONTEXT_MAP_HEIGHT - paddingY * 2
  const westPoint = projectedPoint([west, south], 0)
  const eastPoint = projectedPoint([east, north], 0)
  const boundsWidth = Math.max(eastPoint[0] - westPoint[0], Number.EPSILON)
  const boundsHeight = Math.max(Math.abs(eastPoint[1] - westPoint[1]), Number.EPSILON)
  return Math.max(0, Math.min(focus.maxZoom, Math.floor(Math.log2(Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight)))))
}

/** The true on-screen selected-run length at Leaflet's integer fit zoom. */
export function borderContextScreenSpan(path: readonly BorderPosition[], focus: BorderContextFocus, width: number) {
  return projectedDistance(path, borderContextFitZoom(focus, width))
}

/** A stable, line-first frame. It intentionally never expands to the known-country silhouette. */
function focusForPositions(path: readonly BorderPosition[], requireScreenFloor: boolean): BorderContextFocus {
  if (
    path.length < 2 ||
    path.some(([longitude, latitude]) => !Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(latitude) > WEB_MERCATOR_LIMIT) ||
    path.slice(1).some((point, index) => Math.abs(point[0] - path[index][0]) > 180)
  ) throw new Error('Border context requires a finite non-cross-world selected run.')

  const west = Math.min(...path.map(point => point[0]))
  const east = Math.max(...path.map(point => point[0]))
  const south = Math.min(...path.map(point => point[1]))
  const north = Math.max(...path.map(point => point[1]))
  const longitudeSpan = Math.max(east - west, MINIMUM_FRAME_SPAN)
  const latitudeSpan = Math.max(north - south, MINIMUM_FRAME_SPAN)
  const longitudeCenter = (west + east) / 2
  const latitudeCenter = (south + north) / 2
  // Leaflet's explicit 20px fit padding supplies the visual buffer. Keeping this
  // frame exact prevents a second, geographic padding from dropping a large run
  // below its canonical on-screen floor after integer zoom snapping.
  const frameMultiplier = .50000001
  const bounds = Object.freeze([
    Math.max(-WEB_MERCATOR_LIMIT, latitudeCenter - latitudeSpan * frameMultiplier),
    longitudeCenter - longitudeSpan * frameMultiplier,
    Math.min(WEB_MERCATOR_LIMIT, latitudeCenter + latitudeSpan * frameMultiplier),
    longitudeCenter + longitudeSpan * frameMultiplier,
  ] as [number, number, number, number])
  const base = Object.freeze({ bounds, maxZoom: MAX_ZOOM, padding: Object.freeze([BORDER_CONTEXT_MAP_PADDING, BORDER_CONTEXT_MAP_PADDING] as [number, number]) })
  const minimumScreenSpan = Math.min(...BORDER_CONTEXT_MAP_WIDTHS.map(width => borderContextScreenSpan(path, base as BorderContextFocus, width)))
  if (requireScreenFloor && minimumScreenSpan < SCREEN_SPACE_FLOOR) throw new Error('Selected run cannot meet the 96px local-map floor with the canonical Leaflet fit.')
  return Object.freeze({ ...base, minimumScreenSpan })
}
/** A stable line-first frame for one independently selectable section. */
export function selectedBorderFocus(path: readonly BorderPosition[]): BorderContextFocus { return focusForPositions(path,true) }
/** A union frame for every independently mounted run. It intentionally does
 * not require every distant tiny section to meet the single-run screen floor;
 * the map's Focus next section control restores that local fit. */
export function allBorderRunsFocus(runs: readonly (readonly BorderPosition[])[]): BorderContextFocus {
  if(!runs.length)throw new Error('Border context requires at least one selected run.')
  return focusForPositions(runs.flat(),false)
}
