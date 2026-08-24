import dataset from '../data/country-shapes.json' with { type: 'json' }
import capitals from '../data/capitals.json' with { type: 'json' }
import sourceManifest from '../../scripts/country-shape-sources.json' with { type: 'json' }
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { generateCountryShapeCredits, generateCountryShapeDataset, sourcePolygonsForEntity, validateGeoBoundariesOverrides, validateSourceManifest, type GeoBoundariesOverride, type SourceMapping } from '../../scripts/generate-country-shapes'
import { alignRingsToLongitudeDomain, coordinateRelationToShape, countryShapeToSanitizedGeoJson, createShapeCoordinateFrame, decodeRing, decodeShapePaths, decodeShapePolygons, getCountryShape, isNonDegenerateRing, projectCoordinateToFrame, projectCoordinateToShape, unwrapRingAtAntimeridian, validateCountryShapeDataset, type CountryShapeDataset, type GeographicPosition } from './countryShapes'

const shapes = dataset as unknown as CountryShapeDataset

function pointInRing(point: readonly [number, number], ring: readonly (readonly [number, number])[]): boolean {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x, y] = ring[index]
    const [previousX, previousY] = ring[previous]
    if ((y > point[1]) !== (previousY > point[1]) && point[0] < (previousX - x) * (point[1] - y) / (previousY - y) + x) inside = !inside
  }
  return inside
}

describe('country shape geometry', () => {
  it('covers every capital-study entity exactly once with valid compact data', () => {
    const expectedCodes = new Set(capitals.flatMap((capital) => capital.entities.map((entity) => entity.code)))
    expect(expectedCodes.size).toBe(197)
    expect(validateCountryShapeDataset(shapes, expectedCodes)).toEqual([])
  })

  it('matches the deterministic build-time conversion and approved fidelity sources', () => {
    expect(generateCountryShapeDataset()).toEqual(shapes)
    expect(validateSourceManifest()).toEqual([])
    expect(shapes.source.datasets).toEqual([{ resolution: '50m', count: 172, dataset: 'Natural Earth v4.1.0 Admin-0 countries' }])
    expect(shapes.overrides).toHaveLength(25)
    expect(validateGeoBoundariesOverrides()).toEqual([])
    for (const code of 'AND ATG BHR BRB DMA FSM GRD KIR KNA LCA LIE MDV MHL MCO MLT NRU PLW SGP SMR STP SYC TON TUV VAT VCT'.split(' ')) expect(shapes.shapes[code].coordinateScale).toBe(100000)
    for (const code of Object.keys(shapes.shapes).filter((code) => !shapes.overrides.some((override) => override.code === code))) expect(shapes.shapes[code].coordinateScale).toBe(1000)
    expect(shapes.overrides.filter((override) => override.variant === 'full').map((override) => override.code)).toEqual(['MCO', 'NRU', 'VAT'])
    expect(sourceManifest.mappings.find((mapping) => mapping.code === 'SOM')).toMatchObject({ sourceName: 'Somalia', mergeSource: { sourceName: 'Somaliland', sourceId: null } })
    const duplicateTuple = structuredClone(sourceManifest.mappings) as unknown as SourceMapping[]
    duplicateTuple[1] = { ...duplicateTuple[1], sourceId: duplicateTuple[0].sourceId, sourceName: duplicateTuple[0].sourceName, resolution: duplicateTuple[0].resolution }
    expect(validateSourceManifest(duplicateTuple)).toEqual(expect.arrayContaining([expect.stringContaining('duplicate resolved source tuple')]))
  })

  it('locks every audited geoBoundaries registry field against local artifacts and provenance', () => {
    const registry = structuredClone(shapes.overrides) as GeoBoundariesOverride[]
    const mutation = (code: string, update: Partial<GeoBoundariesOverride>) => registry.map((override) => override.code === code ? { ...override, ...update } : override)
    expect(validateGeoBoundariesOverrides(mutation('MCO', { sha256: '0'.repeat(64) }))).toEqual(expect.arrayContaining(['MCO: local artifact SHA-256 differs from registry']))
    expect(validateGeoBoundariesOverrides(mutation('MCO', { representedYear: '1900' }))).toEqual(expect.arrayContaining(['MCO: local metadata differs from registry provenance']))
    expect(validateGeoBoundariesOverrides(mutation('MCO', { source: 'unapproved source' }))).toEqual(expect.arrayContaining(['MCO: local metadata differs from registry provenance']))
    expect(validateGeoBoundariesOverrides(mutation('MCO', { boundaryId: 'MCO-ADM0-0' }))).toEqual(expect.arrayContaining(['MCO: local metadata differs from registry provenance']))
    expect(validateGeoBoundariesOverrides(mutation('MCO', { license: 'unapproved licence' }))).toEqual(expect.arrayContaining(['MCO: local metadata differs from registry provenance']))
    expect(validateGeoBoundariesOverrides(mutation('MCO', { variant: 'simplified' }))).toEqual(expect.arrayContaining(['MCO: invalid geoBoundaries registry record']))
    expect(validateGeoBoundariesOverrides(registry.filter((override) => override.code !== 'MCO'))).toEqual(expect.arrayContaining(['geoBoundaries override cohort must be exact']))
    expect(validateGeoBoundariesOverrides(mutation('SGP', { osmContributors: true }))).toEqual(expect.arrayContaining(['SGP: invalid OpenStreetMap attribution flag']))
  })

  it('generates one complete local credits disclosure from the pinned override registry', () => {
    const credits = generateCountryShapeCredits()
    expect(readFileSync(resolve(process.cwd(), 'public/country-shape-credits.html'), 'utf8')).toBe(credits)
    expect(credits).toContain('Country shape credits')
    expect(credits).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">')
    expect(credits).toContain('<link rel="icon" href="favicon.svg" type="image/svg+xml">')
    expect(credits).toContain('@media(max-width:700px)')
    expect(credits).toContain('table,tbody,tr,td{display:block}')
    expect(credits).toContain('grid-template-columns:minmax(6.5rem,40%) minmax(0,1fr)')
    expect(credits).toContain('content:attr(data-label)')
    expect(credits).toContain('overflow-wrap:anywhere')
    expect(credits).toContain('word-break:break-word')
    const labels = ['Code', 'Provider', 'Upstream source', 'Year', 'Source URI', 'Pinned artifact', 'Commit / SHA-256', 'Transformation', 'Licence / attribution']
    for (const label of labels) {
      expect(credits).toContain(`<th>${label}</th>`)
      expect(credits.match(new RegExp(`<td data-label="${label}">`, 'g'))).toHaveLength(shapes.overrides.length)
    }
    expect(credits.match(/<td data-label="/g)).toHaveLength(shapes.overrides.length * labels.length)
    for (const override of shapes.overrides) {
      expect(credits).toContain(`id="${override.code}"`)
      expect(credits).toContain(override.provider)
      expect(credits).toContain(override.source)
      expect(credits).toContain(override.representedYear)
      expect(credits).toContain(override.sourceUrl)
      expect(credits).toContain(override.sha256)
      expect(credits).toContain(override.artifact)
      expect(credits).toContain(override.commit)
      expect(credits).toContain(override.license)
    }
    expect(credits).toContain('locally vendored and delta-encoded at 100,000 units per degree for display only.')
    expect(credits).toContain('https://creativecommons.org/publicdomain/mark/1.0/')
    expect(credits).toContain('https://creativecommons.org/licenses/by/2.5/')
    expect(credits).toContain('https://creativecommons.org/licenses/by/3.0/igo/')
    expect(credits).toContain('https://creativecommons.org/licenses/by/4.0/')
    expect(credits).toContain('https://opendatacommons.org/licenses/odbl/1-0/')
    expect(credits.match(/© OpenStreetMap contributors/g)?.length).toBe(shapes.overrides.filter((override) => override.osmContributors).length)
    expect(credits.slice(credits.indexOf('id="SGP"'), credits.indexOf('id="SMR"'))).not.toContain('OpenStreetMap contributors')
  })

  it('runs the generator from an unrelated working directory', () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), 'geoquiz-country-shapes-'))
    try {
      execFileSync(resolve(process.cwd(), 'node_modules/.bin/tsx'), [resolve(process.cwd(), 'scripts/generate-country-shapes.ts'), '--check'], { cwd: temporaryDirectory, stdio: 'pipe' })
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true })
    }
  })

  it('looks up only known codes and decodes grouped compound paths', () => {
    expect(getCountryShape(shapes, 'NOR')).toBeTruthy()
    expect(getCountryShape(shapes, 'NOT-A-CODE')).toBeUndefined()
    expect(getCountryShape(shapes, '__proto__')).toBeUndefined()
    expect(getCountryShape(shapes, 'constructor')).toBeUndefined()
    expect(getCountryShape(shapes, 'toString')).toBeUndefined()
    const southAfrica = getCountryShape(shapes, 'ZAF')!
    expect(southAfrica.polygons).toHaveLength(2)
    expect(southAfrica.polygons[0]).toHaveLength(2)
    expect(decodeShapePaths(southAfrica)).toHaveLength(2)
    expect(decodeShapePaths(southAfrica)[0]).toContain('Z M')
  })

  it('retains integral source components needed for study cases', () => {
    const artifactContains = (code: string, coordinate: readonly [number, number]) => {
      const shape = getCountryShape(shapes, code)!
      const local = projectCoordinateToShape(shape, coordinate)!
      const point: [number, number] = [Math.round(local[0] * 1000), Math.round(local[1] * 1000)]
      return decodeShapePolygons(shape).some((polygon) => pointInRing(point, polygon[0]))
    }
    expect(artifactContains('ESP', [-16.64, 28.27])).toBe(true) // Canaries / Teide
    expect(artifactContains('PRT', [-28.4, 38.47])).toBe(true) // Azores / Pico
    expect(artifactContains('GNQ', [8.7, 3.6])).toBe(true) // Bioko
    const vanuatu = getCountryShape(shapes, 'VUT')!
    const portVila = projectCoordinateToShape(vanuatu, [168.3, -17.75])!
    const portVilaUnits: [number, number] = [Math.round(portVila[0] * 1000), Math.round(portVila[1] * 1000)]
    expect(decodeShapePolygons(vanuatu).some((polygon) => {
      const points = polygon.flat()
      return portVilaUnits[0] >= Math.min(...points.map(([x]) => x)) && portVilaUnits[0] <= Math.max(...points.map(([x]) => x)) && portVilaUnits[1] >= Math.min(...points.map(([, y]) => y)) && portVilaUnits[1] <= Math.max(...points.map(([, y]) => y))
    })).toBe(true)
  })

  it('keeps audited high-fidelity detail and archipelago extents without fabricated insets', () => {
    const vertices = (code: string) => decodeShapePolygons(getCountryShape(shapes, code)!).flat().reduce((total, ring) => total + ring.length, 0)
    expect(vertices('MCO')).toBeGreaterThanOrEqual(839)
    expect(vertices('NRU')).toBeGreaterThanOrEqual(219)
    expect(vertices('VAT')).toBeGreaterThanOrEqual(153)
    const maldives = getCountryShape(shapes, 'MDV')!
    expect(maldives.polygons.length).toBeGreaterThanOrEqual(643)
    expect(maldives.bounds[3] - maldives.bounds[1]).toBeGreaterThan(7)
    const tuvalu = getCountryShape(shapes, 'TUV')!
    expect(tuvalu.bounds[2] - tuvalu.bounds[0]).toBeGreaterThan(3)
  })

  it('round-trips every source polygon and quantized coordinate into the checked-in artifact', () => {
    for (const code of Object.keys(shapes.shapes)) {
      const shape = getCountryShape(shapes, code)!
      const sourcePolygons = sourcePolygonsForEntity(code)
      const decoded = decodeShapePolygons(shape)
      expect(decoded).toHaveLength(sourcePolygons.length)
      for (let polygonIndex = 0; polygonIndex < sourcePolygons.length; polygonIndex += 1) {
        expect(decoded[polygonIndex]).toHaveLength(sourcePolygons[polygonIndex].length)
        for (let ringIndex = 0; ringIndex < sourcePolygons[polygonIndex].length; ringIndex += 1) {
          const integer = (value: number) => Object.is(value, -0) ? 0 : value
          const expected = sourcePolygons[polygonIndex][ringIndex].slice(0, -1).map(([longitude, latitude]) => [integer(Math.round((longitude - shape.bounds[0]) * shape.coordinateScale!)), integer(Math.round((shape.bounds[3] - latitude) * shape.coordinateScale!))])
          expect(decoded[polygonIndex][ringIndex]).toEqual(expected)
        }
      }
    }
  })

  it('unwraps antimeridian crossings and aligns components compactly', () => {
    const crossing = unwrapRingAtAntimeridian([[179, 0], [-179, 0], [-179, 1], [179, 1], [179, 0]])
    expect(crossing.map(([longitude]) => longitude)).toEqual([179, 181, 181, 179, 179])
    const aligned = alignRingsToLongitudeDomain([[[170, 0], [171, 0], [171, 1], [170, 1], [170, 0]], [[-179, 0], [-178, 0], [-178, 1], [-179, 1], [-179, 0]]])
    expect(Math.min(...aligned[1].map(([longitude]) => longitude))).toBeGreaterThan(180)
    expect(isNonDegenerateRing([[0, 0], [1, 0], [2, 0], [0, 0]])).toBe(false)
  })

  it('converts encoded shapes to closed, property-free geographic map features', () => {
    const germany = countryShapeToSanitizedGeoJson(getCountryShape(shapes, 'DEU')!)
    const denmark = countryShapeToSanitizedGeoJson(getCountryShape(shapes, 'DNK')!)
    expect(germany.properties).toEqual({})
    const flatten = (feature: typeof germany): readonly (readonly GeographicPosition[])[] => feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates as readonly (readonly GeographicPosition[])[]
      : feature.geometry.coordinates.flat() as readonly (readonly GeographicPosition[])[]
    for (const ring of flatten(germany)) {
      expect(ring[0]).toEqual(ring.at(-1))
      for (let index = 1; index < ring.length; index += 1) expect(Math.abs(ring[index][0] - ring[index - 1][0])).toBeLessThanOrEqual(180)
    }
    const latitude = (feature: typeof germany) => flatten(feature).flat().reduce((total, point) => total + point[1], 0) / flatten(feature).flat().length
    expect(latitude(denmark)).toBeGreaterThan(latitude(germany))
    const fiji = countryShapeToSanitizedGeoJson(getCountryShape(shapes, 'FJI')!)
    for (const ring of flatten(fiji)) for (let index = 1; index < ring.length; index += 1) expect(Math.abs(ring[index][0] - ring[index - 1][0])).toBeLessThanOrEqual(180)
  })

  it('projects canonical longitudes but rejects materially out-of-bounds positions', () => {
    const fiji = getCountryShape(shapes, 'FJI')!
    expect(projectCoordinateToShape(fiji, [-181, -18])).toBeTruthy()
    expect(projectCoordinateToShape(fiji, [0, 0])).toBeUndefined()
    const bahrain = getCountryShape(shapes, 'BHR')!
    expect(projectCoordinateToShape(bahrain, [50.55, 26.1])).toBeTruthy()
    expect(projectCoordinateToShape(bahrain, [52, 26.1])).toBeUndefined()
  })

  it('frames exact source points without clamping and classifies actual even-odd fill', () => {
    const somalia = getCountryShape(shapes, 'SOM')!
    expect(somalia.polygons).toHaveLength(2)
    expect(coordinateRelationToShape(somalia, [46.2, 9.1])).toBe('inside')
    const vatican = getCountryShape(shapes, 'VAT')!
    const exact: [number, number] = [12.4533033370972, 41.9022450997085]
    expect(projectCoordinateToShape(vatican, exact)).toBeTruthy()
    const frame = createShapeCoordinateFrame(vatican, exact)!
    const marker = projectCoordinateToFrame(frame, vatican, exact)!
    expect(marker[0]).toBeGreaterThan(0)
    expect(marker[0]).toBeLessThan(frame.width)
    expect(marker[1]).toBeGreaterThan(0)
    expect(marker[1]).toBeLessThan(frame.height)
    expect(coordinateRelationToShape(vatican, exact)).toBe('inside')
  })

  it('classifies exact fill boundaries before inside/outside without rounded display projection', () => {
    const withHole = {
      bounds: [0, 0, 1, 1] as const, viewBox: [0, 0, 1, 1] as const,
      polygons: [[[
        0, 0, 1000, 0, 0, 1000, -1000, 0,
      ], [
        300, 300, 400, 0, 0, 400, -400, 0,
      ]]],
    }
    expect(coordinateRelationToShape(withHole, [0, 0.5])).toBe('edge')
    expect(coordinateRelationToShape(withHole, [0.3, 0.5])).toBe('edge')
    expect(coordinateRelationToShape(withHole, [0.5, 0.5])).toBe('outside')
    expect(coordinateRelationToShape(withHole, [0.9996, 0.5])).toBe('inside')
    // This coordinate used to round/clamp to the right edge through
    // projectCoordinateToShape; exact fill classification must keep it out.
    expect(coordinateRelationToShape(withHole, [1.0004, 0.5])).toBe('outside')
  })

  it('rejects malformed encoded grammar, bounds, and missing keys', () => {
    const expectedCodes = new Set(capitals.flatMap((capital) => capital.entities.map((entity) => entity.code)))
    const invalid = structuredClone(shapes) as unknown as { shapes: Record<string, { bounds: number[]; viewBox: number[]; polygons: number[][][] }> }
    invalid.shapes.AFG.viewBox = [1, 0, 0, -1]
    invalid.shapes.AFG.polygons = [[[0, 0, Number.NaN, 2], [0, 0, 1]]]
    delete invalid.shapes.ALB
    invalid.shapes.BAD = invalid.shapes.AFG
    const failures = validateCountryShapeDataset(invalid as unknown as CountryShapeDataset, expectedCodes).join('\n')
    expect(failures).toMatch(/invalid bounds or viewBox|invalid integer delta ring|missing shape|unexpected shape/)
  })

  it('rejects cumulative integer overflow even when later deltas would cancel it', () => {
    const maximum = Number.MAX_SAFE_INTEGER
    expect(decodeRing([maximum, 0, 1, 0])).toBeUndefined()
    expect(decodeRing([maximum - 1, 0, 2, 0, -2, 0])).toBeUndefined()
    expect(() => decodeShapePaths({ bounds: [0, 0, 1, 1], viewBox: [0, 0, 1, 1], polygons: [[[maximum, 0, 1, 0]]] })).toThrow('Invalid encoded country shape ring.')
  })
})
