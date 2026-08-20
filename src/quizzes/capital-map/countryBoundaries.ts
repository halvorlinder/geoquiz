import countriesTopologyJson from 'world-atlas/countries-110m.json'
import { mesh } from 'topojson-client'
import type { GeometryObject, Topology } from 'topojson-specification'

type Coordinate = [longitude: number, latitude: number]

type MultiLineStringGeometry = {
  type: 'MultiLineString'
  coordinates: Coordinate[][]
}

const ANTIMERIDIAN = 180
const EPSILON = 1e-9

function coordinatesMatch(first: Coordinate, second: Coordinate): boolean {
  return Math.abs(first[0] - second[0]) < EPSILON && Math.abs(first[1] - second[1]) < EPSILON
}

function appendCoordinate(line: Coordinate[], coordinate: Coordinate) {
  if (!coordinatesMatch(line.at(-1) ?? coordinate, coordinate)) line.push(coordinate)
}

/**
 * Break a geographic line at the antimeridian before Leaflet turns it into screen
 * segments. Without the break, a -180° to +180° coordinate transition becomes a
 * visible line across the entire map.
 */
export function splitLineAtAntimeridian(coordinates: readonly Coordinate[]): Coordinate[][] {
  if (coordinates.length < 2) return []

  const splitLines: Coordinate[][] = []
  let currentLine: Coordinate[] = [[coordinates[0][0], coordinates[0][1]]]

  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1]
    const next = coordinates[index]
    const longitudeDelta = next[0] - previous[0]

    if (Math.abs(longitudeDelta) <= ANTIMERIDIAN) {
      appendCoordinate(currentLine, [next[0], next[1]])
      continue
    }

    // +180° and -180° describe the same meridian. Preserve a vertical seam
    // segment on both projected sides, rather than fabricating a cross-world
    // segment or dropping a legitimate section of coastline.
    if (Math.abs(Math.abs(longitudeDelta) - 360) < EPSILON) {
      appendCoordinate(currentLine, [previous[0], next[1]])
      if (currentLine.length >= 2) splitLines.push(currentLine)
      currentLine = [[next[0], previous[1]]]
      appendCoordinate(currentLine, [next[0], next[1]])
      continue
    }

    const crossesEastward = previous[0] > next[0]
    const crossingLongitude = crossesEastward ? ANTIMERIDIAN : -ANTIMERIDIAN
    const wrappedNextLongitude = next[0] + (crossesEastward ? 360 : -360)
    const interpolation = (crossingLongitude - previous[0]) / (wrappedNextLongitude - previous[0])
    const crossingLatitude = previous[1] + (next[1] - previous[1]) * interpolation
    const nearSeam = [crossingLongitude, crossingLatitude] as Coordinate
    const farSeam = [-crossingLongitude, crossingLatitude] as Coordinate

    appendCoordinate(currentLine, nearSeam)
    if (currentLine.length >= 2) splitLines.push(currentLine)
    currentLine = [farSeam]
    appendCoordinate(currentLine, [next[0], next[1]])
  }

  if (currentLine.length >= 2) splitLines.push(currentLine)
  return splitLines
}

export function makeAntimeridianSafeBoundaryLines(geometry: MultiLineStringGeometry): MultiLineStringGeometry {
  return {
    type: 'MultiLineString',
    coordinates: geometry.coordinates.flatMap(splitLineAtAntimeridian),
  }
}

// The conversion happens once when this module is evaluated. The resulting one-piece
// MultiLineString lets Leaflet draw country and coast boundaries as one lightweight layer.
const countriesTopology = countriesTopologyJson as unknown as Topology<Record<string, GeometryObject>>
const countries = countriesTopology.objects.countries

if (!countries) {
  throw new Error('The bundled world atlas is missing its countries object.')
}

export const COUNTRY_OUTLINES_PANE = 'country-outlines'
export const COUNTRY_OUTLINES_PANE_Z_INDEX = 350
export const sourceCountryBoundaryLines = mesh(countriesTopology, countries) as unknown as MultiLineStringGeometry
export const countryBoundaryLines = makeAntimeridianSafeBoundaryLines(sourceCountryBoundaryLines)
