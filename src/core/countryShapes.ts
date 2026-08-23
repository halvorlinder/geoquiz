export type GeographicPosition = readonly [longitude: number, latitude: number]
export type EncodedRing = readonly number[]

export type CountryShape = {
  /** Integer coordinate units per geographic degree for this individual shape. */
  coordinateScale?: 1000 | 100000
  /** Geographic bounds in an unwrapped longitude domain. */
  bounds: readonly [west: number, south: number, east: number, north: number]
  /** Zero-origin width and height in geographic-degree SVG units. */
  viewBox: readonly [x: 0, y: 0, width: number, height: number]
  /** Polygon → rings → integer delta-encoded local coordinates at coordinateScale units. */
  polygons: readonly (readonly EncodedRing[])[]
  /** Present only for the separately licensed geoBoundaries override layer. */
  attribution?: Readonly<{ provider: 'geoBoundaries'; licenseLabel: 'Public domain' | 'CC BY 2.5' | 'CC BY 3.0 IGO' | 'CC BY 4.0' | 'ODbL 1.0'; osmContributors: boolean }>
}

export type CountryShapeDataset = {
  version: 3
  source: {
    package: 'world-atlas@2.0.2'
    datasets: readonly {
      resolution: '50m' | '10m'
      count: number
      dataset: 'Natural Earth v4.1.0 Admin-0 countries'
    }[]
    checked: '2026-08-20'
  }
  overrides: readonly Readonly<{
    code: string
    provider: 'geoBoundaries 6.0'
    commit: '9469f09592ced973a3448cf66b6100b741b64c0d'
    variant: 'simplified' | 'full'
    artifact: string
    localArtifact: string
    sha256: string
    boundaryId: string
    representedYear: string
    source: string
    sourceUrl: string
    license: string
    licenseLabel: 'Public domain' | 'CC BY 2.5' | 'CC BY 3.0 IGO' | 'CC BY 4.0' | 'ODbL 1.0'
    metadataUrl: string
    osmContributors: boolean
    checked: '2026-08-21'
  }>[]
  /** Entity codes are data keys, never renderer labels. */
  shapes: Readonly<Record<string, CountryShape>>
}

/**
 * A display frame for a silhouette and one exact WGS84 coordinate. Unlike the
 * legacy silhouette projection, it never clamps a coordinate to the shape.
 */
export type ShapeCoordinateFrame = Readonly<{
  west: number
  south: number
  east: number
  north: number
  width: number
  height: number
  /** Translation from a shape's local SVG coordinates into this frame. */
  shapeOffset: readonly [x: number, y: number]
}>

export type ShapePointRelation = 'inside' | 'edge' | 'outside'

const EPSILON = 1e-9
const NATURAL_EARTH_SCALE = 1000

export function samePosition(first: GeographicPosition, second: GeographicPosition): boolean {
  return Math.abs(first[0] - second[0]) < EPSILON && Math.abs(first[1] - second[1]) < EPSILON
}

export function isValidPosition(position: GeographicPosition): boolean {
  return Number.isFinite(position[0]) && Number.isFinite(position[1]) && position[1] >= -90 && position[1] <= 90
}

function isWgs84Position(position: GeographicPosition): boolean {
  return isValidPosition(position) && position[0] >= -180 && position[0] <= 180
}

export function unwrapRingAtAntimeridian(ring: readonly GeographicPosition[]): [number, number][] {
  if (ring.length < 4 || !samePosition(ring[0], ring.at(-1) as GeographicPosition)) throw new Error('Country shape rings must be closed and contain at least four positions.')
  if (!ring.every(isWgs84Position)) throw new Error('Country shape rings must contain finite WGS84 positions.')
  const output: [number, number][] = [[ring[0][0], ring[0][1]]]
  for (const [longitude, latitude] of ring.slice(1, -1)) {
    const previousLongitude = output.at(-1)![0]
    output.push([longitude + 360 * Math.round((previousLongitude - longitude) / 360), latitude])
  }
  output.push([output[0][0], output[0][1]])
  if (output.some((point, index) => index > 0 && Math.abs(point[0] - output[index - 1][0]) > 180 + EPSILON)) throw new Error('Antimeridian normalization left a cross-world segment.')
  return output
}

export function alignRingsToLongitudeDomain(rings: readonly (readonly GeographicPosition[])[]): [number, number][][] {
  const normalized = rings.map(unwrapRingAtAntimeridian)
  const anchor = normalized[0]?.reduce((total, position) => total + position[0], 0) / (normalized[0]?.length ?? 1)
  if (!Number.isFinite(anchor)) throw new Error('Country shape must contain at least one ring.')
  return normalized.map((ring) => {
    const center = ring.reduce((total, position) => total + position[0], 0) / ring.length
    const shift = 360 * Math.round((anchor - center) / 360)
    return ring.map(([longitude, latitude]) => [longitude + shift, latitude])
  })
}

export function isNonDegenerateRing(ring: readonly GeographicPosition[]): boolean {
  return ring.length >= 4 && samePosition(ring[0], ring.at(-1) as GeographicPosition) && Math.abs(polygonArea(ring.slice(0, -1))) > EPSILON
}

export function getCountryShape(dataset: CountryShapeDataset, code: string): CountryShape | undefined {
  return Object.hasOwn(dataset.shapes, code) ? dataset.shapes[code] : undefined
}

export function decodeRing(ring: EncodedRing): [number, number][] | undefined {
  if (ring.length < 6 || ring.length % 2 || ring.some((value) => !Number.isSafeInteger(value))) return undefined
  const points: [number, number][] = []
  let x = ring[0]
  let y = ring[1]
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) return undefined
  points.push([x, y])
  for (let index = 2; index < ring.length; index += 2) {
    x += ring[index]
    y += ring[index + 1]
    if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) return undefined
    points.push([x, y])
  }
  return points
}

function formatUnit(value: number, coordinateScale: number): string {
  const text = String(value / coordinateScale)
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text
}

/** Decodes one selected silhouette into compound SVG path strings. */
export function decodeShapePaths(shape: CountryShape): string[] {
  const coordinateScale = shape.coordinateScale ?? NATURAL_EARTH_SCALE
  return decodeShapePolygons(shape).map((polygon) => polygon.map((points) => {
    return `M ${points.map(([x, y]) => `${formatUnit(x, coordinateScale)} ${formatUnit(y, coordinateScale)}`).join(' L ')} Z`
  }).join(' '))
}

export function decodeShapePolygons(shape: CountryShape): [number, number][][][] {
  return shape.polygons.map((polygon) => polygon.map((ring) => {
    const points = decodeRing(ring)
    if (!points) throw new Error('Invalid encoded country shape ring.')
    return points
  }))
}

export function projectCoordinateToShape(shape: CountryShape, position: GeographicPosition): [number, number] | undefined {
  if (!isValidPosition(position)) return undefined
  const [west, south, east, north] = shape.bounds
  const [, , width, height] = shape.viewBox
  const midpoint = (west + east) / 2
  const longitude = position[0] + 360 * Math.round((midpoint - position[0]) / 360)
  const tolerance = 0.51 / (shape.coordinateScale ?? NATURAL_EARTH_SCALE)
  if (longitude < west - tolerance || longitude > east + tolerance || position[1] < south - tolerance || position[1] > north + tolerance) return undefined
  return [round(Math.min(width, Math.max(0, longitude - west)), 5), round(Math.min(height, Math.max(0, north - position[1])), 5)]
}

/**
 * Creates a padded unwrapped frame around both the audited silhouette bounds
 * and the supplied exact coordinate. The coordinate is not snapped or clamped.
 */
export function createShapeCoordinateFrame(shape: CountryShape, position: GeographicPosition, padding = 0.12): ShapeCoordinateFrame | undefined {
  if (!isValidPosition(position) || !Number.isFinite(padding) || padding < 0) return undefined
  const [west, south, east, north] = shape.bounds
  const midpoint = (west + east) / 2
  const longitude = position[0] + 360 * Math.round((midpoint - position[0]) / 360)
  const rawWest = Math.min(west, longitude)
  const rawEast = Math.max(east, longitude)
  const rawSouth = Math.min(south, position[1])
  const rawNorth = Math.max(north, position[1])
  const span = Math.max(rawEast - rawWest, rawNorth - rawSouth, 0.01)
  const inset = span * padding
  const frameWest = rawWest - inset
  const frameEast = rawEast + inset
  const frameSouth = rawSouth - inset
  const frameNorth = rawNorth + inset
  return Object.freeze({
    west: frameWest, south: frameSouth, east: frameEast, north: frameNorth,
    width: frameEast - frameWest, height: frameNorth - frameSouth,
    shapeOffset: Object.freeze([west - frameWest, frameNorth - north] as [number, number]),
  })
}

/** Projects an exact WGS84 point into a frame that was created for it. */
export function projectCoordinateToFrame(frame: ShapeCoordinateFrame, shape: CountryShape, position: GeographicPosition): [number, number] | undefined {
  if (!isValidPosition(position)) return undefined
  const [west, , east] = shape.bounds
  const midpoint = (west + east) / 2
  const longitude = position[0] + 360 * Math.round((midpoint - position[0]) / 360)
  const x = longitude - frame.west
  const y = frame.north - position[1]
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > frame.width || y > frame.height) return undefined
  return [x, y]
}

function pointOnSegment(point: readonly [number, number], start: readonly [number, number], end: readonly [number, number]): boolean {
  // The decoded geometry uses the shape's coordinate scale (0.001° for the
  // Natural Earth base and 0.00001° for audited overrides). This deliberately
  // tiny tolerance only absorbs floating-point arithmetic; it never rounds a
  // nearby WGS84 coordinate onto a simplified outline.
  const tolerance = 1e-6
  const [x, y] = point; const [startX, startY] = start; const [endX, endY] = end
  const deltaX = endX - startX; const deltaY = endY - startY
  const lengthSquared = deltaX * deltaX + deltaY * deltaY
  if (lengthSquared === 0) return Math.hypot(x - startX, y - startY) <= tolerance
  const fraction = ((x - startX) * deltaX + (y - startY) * deltaY) / lengthSquared
  if (fraction < -tolerance || fraction > 1 + tolerance) return false
  return Math.hypot(x - (startX + fraction * deltaX), y - (startY + fraction * deltaY)) <= tolerance
}

function pointInEncodedRing(point: readonly [number, number], ring: readonly (readonly [number, number])[]): ShapePointRelation {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index]; const before = ring[previous]
    if (pointOnSegment(point, before, current)) return 'edge'
    if ((current[1] > point[1]) !== (before[1] > point[1]) && point[0] < (before[0] - current[0]) * (point[1] - current[1]) / (before[1] - current[1]) + current[0]) inside = !inside
  }
  return inside ? 'inside' : 'outside'
}

/**
 * Classifies a coordinate against the encoded SVG fill using even-odd holes.
 * This is display geometry only; it never changes the supplied coordinate.
 */
export function coordinateRelationToShape(shape: CountryShape, position: GeographicPosition): ShapePointRelation {
  if (!isValidPosition(position)) return 'outside'
  const [west, , east, north] = shape.bounds
  const midpoint = (west + east) / 2
  const longitude = position[0] + 360 * Math.round((midpoint - position[0]) / 360)
  // Keep full WGS84 precision here. `projectCoordinateToShape` is intentionally
  // rounded/clamped for display overlays and is not a fill-classification API.
  const coordinateScale = shape.coordinateScale ?? NATURAL_EARTH_SCALE
  const point: [number, number] = [(longitude - west) * coordinateScale, (north - position[1]) * coordinateScale]
  let edge = false
  let anyInside = false
  for (const polygon of decodeShapePolygons(shape)) {
    let inside = false
    for (const ring of polygon) {
      const relation = pointInEncodedRing(point, ring)
      if (relation === 'edge') edge = true
      if (relation === 'inside') inside = !inside
    }
    if (inside) anyInside = true
  }
  return edge ? 'edge' : anyInside ? 'inside' : 'outside'
}

export function round(value: number, precision = 3): number {
  const result = Math.round(value * 10 ** precision) / 10 ** precision
  return Object.is(result, -0) ? 0 : result
}

function polygonArea(vertices: readonly (readonly [number, number])[]): number {
  return vertices.reduce((area, [x, y], index) => {
    const [nextX, nextY] = vertices[(index + 1) % vertices.length]
    return area + x * nextY - nextX * y
  }, 0) / 2
}

export function validateCountryShapeDataset(dataset: CountryShapeDataset, expectedCodes: ReadonlySet<string>): string[] {
  const failures: string[] = []
  if (dataset.version !== 3) failures.push('dataset version must be 3')
  const sources = new Map(dataset.source.datasets.map((source) => [source.resolution, source.count]))
  if (dataset.source.package !== 'world-atlas@2.0.2' || dataset.source.checked !== '2026-08-20') failures.push('invalid source provenance')
  if (sources.get('50m') !== 172 || sources.size !== 1 || [...sources.values()].reduce((total, count) => total + count, 0) !== 172) failures.push('invalid Natural Earth source coverage')
  const overrideCodes = new Set(dataset.overrides.map((override) => override.code))
  const expectedOverrideCodes = new Set('AND ATG BHR BRB DMA FSM GRD KIR KNA LCA LIE MDV MHL MCO MLT NRU PLW SGP SMR STP SYC TON TUV VAT VCT'.split(' '))
  if (overrideCodes.size !== 25 || overrideCodes.size !== dataset.overrides.length || [...expectedOverrideCodes].some((code) => !overrideCodes.has(code)) || [...overrideCodes].some((code) => !expectedOverrideCodes.has(code))) failures.push('invalid high-fidelity override cohort')
  for (const override of dataset.overrides) {
    if (override.provider !== 'geoBoundaries 6.0' || override.commit !== '9469f09592ced973a3448cf66b6100b741b64c0d' || !/^https:\/\//.test(override.artifact) || !/^[a-f0-9]{64}$/.test(override.sha256) || !/^https:\/\/www\.geoboundaries\.org\/api\/current\/gbOpen\/[A-Z]{3}\/ADM0\/$/.test(override.metadataUrl) || override.checked !== '2026-08-21') failures.push(`${override.code}: invalid geoBoundaries provenance`)
    if ((['MCO', 'NRU', 'VAT'].includes(override.code)) !== (override.variant === 'full')) failures.push(`${override.code}: invalid geoBoundaries source variant`)
  }
  const codes = Object.keys(dataset.shapes)
  if (codes.length !== expectedCodes.size) failures.push(`expected ${expectedCodes.size} shapes, found ${codes.length}`)
  for (const code of codes) {
    const shape = dataset.shapes[code]
    if (!/^[A-Z]{3}$/.test(code)) failures.push(`invalid entity code '${code}'`)
    const expectedOverride = dataset.overrides.find((override) => override.code === code)
    if (shape.coordinateScale !== (expectedOverride ? 100000 : NATURAL_EARTH_SCALE)) failures.push(`${code}: invalid coordinate scale`)
    if (Boolean(shape.attribution) !== Boolean(expectedOverride) || (shape.attribution && (!expectedOverride || shape.attribution.licenseLabel !== expectedOverride.licenseLabel || shape.attribution.osmContributors !== expectedOverride.osmContributors))) failures.push(`${code}: invalid attribution mapping`)
    const [west, south, east, north] = shape.bounds
    const [x, y, width, height] = shape.viewBox
    if (![west, south, east, north, x, y, width, height].every(Number.isFinite) || south < -90 || north > 90 || east <= west || east - west > 360 || north <= south || x !== 0 || y !== 0 || width <= 0 || height <= 0 || Math.abs(width - (east - west)) > EPSILON || Math.abs(height - (north - south)) > EPSILON) failures.push(`${code}: invalid bounds or viewBox`)
    if (!shape.polygons.length) failures.push(`${code}: has no polygons`)
    for (const polygon of shape.polygons) {
      if (!polygon.length) failures.push(`${code}: has an empty polygon`)
      for (const ring of polygon) {
        const points = decodeRing(ring)
        if (!points) { failures.push(`${code}: invalid integer delta ring`); continue }
        const distinct = new Set(points.map(([pathX, pathY]) => `${pathX},${pathY}`))
        if (distinct.size < 3 || Math.abs(polygonArea(points)) < EPSILON) failures.push(`${code}: degenerate encoded ring`)
        if (points.some(([pathX, pathY]) => pathX < 0 || pathY < 0 || pathX > Math.round(width * shape.coordinateScale!) || pathY > Math.round(height * shape.coordinateScale!))) failures.push(`${code}: encoded ring is outside its viewBox`)
        for (let index = 2; index < ring.length; index += 2) if (ring[index] === 0 && ring[index + 1] === 0) failures.push(`${code}: has a zero delta`)
      }
    }
  }
  for (const code of expectedCodes) if (!(code in dataset.shapes)) failures.push(`missing shape for ${code}`)
  for (const code of codes) if (!expectedCodes.has(code)) failures.push(`unexpected shape for ${code}`)
  return failures
}
