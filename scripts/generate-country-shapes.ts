import capitals from '../src/data/capitals.json' with { type: 'json' }
import atlas50m from 'world-atlas/countries-50m.json' with { type: 'json' }
import atlas10m from 'world-atlas/countries-10m.json' with { type: 'json' }
import sourceManifest from './country-shape-sources.json' with { type: 'json' }
import overrideManifest from './geoboundaries-shape-overrides.json' with { type: 'json' }
import { feature } from 'topojson-client'
import type { GeometryObject, Topology } from 'topojson-specification'
import { readFile, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { alignRingsToLongitudeDomain, isNonDegenerateRing, round, type CountryShapeDataset, type EncodedRing, type GeographicPosition, validateCountryShapeDataset } from '../src/core/countryShapes'

type Entity = { code: string }
type Capital = { entities: Entity[] }
type SourcePart = { sourceId: string | null; sourceName: string }
export type SourceMapping = SourcePart & { code: string; resolution: '50m' | '10m'; mergeSource?: SourcePart; auditNote?: string }
type SourceFeature = { id?: string | number; properties: { name: string }; geometry: { type: string; coordinates: unknown } }
type GeoBoundariesMetadata = { boundaryID: string; boundaryYearRepresented: string; boundarySource: string; boundaryLicense: string; boundarySourceURL: string }
export type GeoBoundariesOverride = Readonly<{ code: string; provider: 'geoBoundaries 6.0'; commit: '9469f09592ced973a3448cf66b6100b741b64c0d'; variant: 'simplified' | 'full'; artifact: string; localArtifact: string; sha256: string; boundaryId: string; representedYear: string; source: string; sourceUrl: string; license: string; licenseLabel: 'Public domain' | 'CC BY 2.5' | 'CC BY 3.0 IGO' | 'CC BY 4.0' | 'ODbL 1.0'; metadataUrl: string; osmContributors: boolean; checked: '2026-08-21' }>

const GEOBOUNDARIES_COMMIT = '9469f09592ced973a3448cf66b6100b741b64c0d' as const
const GEOBOUNDARIES_COHORT = 'AND ATG BHR BRB DMA FSM GRD KIR KNA LCA LIE MDV MHL MCO MLT NRU PLW SGP SMR STP SYC TON TUV VAT VCT'.split(' ')
const FULL_GEOBOUNDARIES_CODES = new Set(['MCO', 'NRU', 'VAT'])
// Keep vendored inputs tied to this module, so direct generation is independent
// of the shell directory from which it is invoked.
const scriptsDirectory = import.meta.dirname
const vendorDirectory = join(scriptsDirectory, 'vendor/geoboundaries-6.0')
const geoBoundariesOverrides = overrideManifest.overrides as GeoBoundariesOverride[]
const licenseDetails = {
  'Public Domain': ['Public domain', 'https://creativecommons.org/publicdomain/mark/1.0/'],
  'Creative Commons Attribution 2.5 Generic': ['CC BY 2.5', 'https://creativecommons.org/licenses/by/2.5/'],
  'Creative Commons Attribution 3.0 Intergovernmental Organisations (CC BY 3.0 IGO)': ['CC BY 3.0 IGO', 'https://creativecommons.org/licenses/by/3.0/igo/'],
  'Creative Commons Attribution 4.0 (CC BY 4.0)': ['CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'],
  'Open Data Commons Open Database License 1.0': ['ODbL 1.0', 'https://opendatacommons.org/licenses/odbl/1-0/'],
} as const

function geoBoundariesOverrideFor(code: string): GeoBoundariesOverride | undefined { return geoBoundariesOverrides.find((override) => override.code === code) }

function sourceFeaturesFrom(atlas: unknown, resolution: string): SourceFeature[] {
  const topology = atlas as Topology<Record<string, GeometryObject>>
  const countries = topology.objects.countries
  if (!countries) throw new Error(`world-atlas countries-${resolution}.json topology is missing its countries object.`)
  return (feature(topology, countries) as unknown as { features: SourceFeature[] }).features
}

const sourceFeaturesByResolution = { '50m': sourceFeaturesFrom(atlas50m, '50m'), '10m': sourceFeaturesFrom(atlas10m, '10m') }
const expectedCodes = new Set((capitals as Capital[]).flatMap((capital) => capital.entities.map((entity) => entity.code)))
const mappings = sourceManifest.mappings as SourceMapping[]

function sourceTuple(mapping: Pick<SourceMapping, 'sourceId' | 'sourceName'>): string {
  return `${mapping.sourceId ?? 'none'}\u0000${mapping.sourceName}`
}

export function validateSourceManifest(candidateMappings: readonly SourceMapping[] = mappings): string[] {
  const failures: string[] = []
  if (sourceManifest.version !== 2 || sourceManifest.geoBoundariesOverridesManifest !== 'geoboundaries-shape-overrides.json') failures.push('invalid source manifest version or geoBoundaries registry reference')
  const mappingCodes = new Set(candidateMappings.map((mapping) => mapping.code))
  const tuples = new Set<string>()
  if (candidateMappings.length !== expectedCodes.size || mappingCodes.size !== candidateMappings.length) failures.push('source mapping must contain each study entity exactly once')
  for (const code of expectedCodes) if (!mappingCodes.has(code)) failures.push(`source mapping missing study entity ${code}`)
  for (const mapping of candidateMappings) {
    const sourceParts = [mapping, ...(mapping.mergeSource ? [mapping.mergeSource] : [])]
    const candidates = sourceFeaturesByResolution[mapping.resolution]
    for (const source of sourceParts) {
      const tuple = sourceTuple(source)
      if (tuples.has(tuple)) failures.push(`duplicate resolved source tuple ${tuple}`)
      tuples.add(tuple)
      if (!candidates.some((candidate) => sourceTuple({ sourceId: candidate.id === undefined ? null : String(candidate.id).padStart(3, '0'), sourceName: candidate.properties.name }) === tuple)) failures.push(`${mapping.code}: source tuple is absent from countries-${mapping.resolution}`)
    }
    if (mapping.mergeSource && (mapping.code !== 'SOM' || mapping.mergeSource.sourceId !== null || mapping.mergeSource.sourceName !== 'Somaliland' || !mapping.auditNote)) failures.push(`${mapping.code}: only the audited SOM Somaliland merge is allowed`)
    if (mapping.code === 'TUV' ? mapping.resolution !== '10m' : mapping.resolution !== '50m') failures.push(`${mapping.code}: source resolution must preserve the approved 196/1 fidelity policy`)
  }
  if (candidateMappings.filter((mapping) => mapping.resolution === '50m').length !== 196 || candidateMappings.filter((mapping) => mapping.resolution === '10m').map((mapping) => mapping.code).join(',') !== 'TUV') failures.push('invalid 50m/10m source resolution coverage')
  return failures
}

export function validateGeoBoundariesOverrides(candidateOverrides: readonly GeoBoundariesOverride[] = geoBoundariesOverrides): string[] {
  const failures: string[] = []
  if (overrideManifest.version !== 1) failures.push('geoBoundaries override manifest version must be 1')
  if (candidateOverrides.length !== GEOBOUNDARIES_COHORT.length || new Set(candidateOverrides.map(({ code }) => code)).size !== GEOBOUNDARIES_COHORT.length || GEOBOUNDARIES_COHORT.some((code) => !candidateOverrides.some((override) => override.code === code))) failures.push('geoBoundaries override cohort must be exact')
  for (const override of candidateOverrides) {
    const expectedArtifact = `https://github.com/wmgeolab/geoBoundaries/raw/${GEOBOUNDARIES_COMMIT}/releaseData/gbOpen/${override.code}/ADM0/geoBoundaries-${override.code}-ADM0${override.variant === 'simplified' ? '_simplified' : ''}.geojson`
    const expectedLocalArtifact = `vendor/geoboundaries-6.0/${override.code}.${override.variant}.geojson`
    const licenseDetail = licenseDetails[override.license as keyof typeof licenseDetails]
    if (override.provider !== 'geoBoundaries 6.0' || override.commit !== GEOBOUNDARIES_COMMIT || override.checked !== '2026-08-21' || !licenseDetail || override.licenseLabel !== licenseDetail[0] || !/^[a-f0-9]{64}$/.test(override.sha256) || override.artifact !== expectedArtifact || override.localArtifact !== expectedLocalArtifact || !override.boundaryId.startsWith(`${override.code}-ADM0-`) || (FULL_GEOBOUNDARIES_CODES.has(override.code) !== (override.variant === 'full')) || override.metadataUrl !== `https://www.geoboundaries.org/api/current/gbOpen/${override.code}/ADM0/`) failures.push(`${override.code}: invalid geoBoundaries registry record`)
    const artifactPath = join(scriptsDirectory, override.localArtifact)
    const metadataPath = join(vendorDirectory, `${override.code}.metadata.json`)
    try {
      const actualHash = createHash('sha256').update(readFileSync(artifactPath)).digest('hex')
      if (actualHash !== override.sha256) failures.push(`${override.code}: local artifact SHA-256 differs from registry`)
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf8')) as GeoBoundariesMetadata
      if (metadata.boundaryID !== override.boundaryId || metadata.boundaryYearRepresented !== override.representedYear || metadata.boundarySource !== override.source || metadata.boundaryLicense !== override.license || `https://${metadata.boundarySourceURL}` !== override.sourceUrl) failures.push(`${override.code}: local metadata differs from registry provenance`)
      if (override.osmContributors !== (metadata.boundarySource === 'OpenStreetMap, Wambacher')) failures.push(`${override.code}: invalid OpenStreetMap attribution flag`)
    } catch { failures.push(`${override.code}: missing or unreadable local geoBoundaries artifact`) }
  }
  return failures
}

function isPosition(value: unknown): value is GeographicPosition {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number'
}

function polygonsFromGeometry(geometry: SourceFeature['geometry']): GeographicPosition[][][] {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : undefined
  if (!polygons || !Array.isArray(polygons)) throw new Error(`Unsupported country geometry '${geometry.type}'.`)
  return polygons.map((polygon) => {
    if (!Array.isArray(polygon)) throw new Error('Country polygon is malformed.')
    return polygon.map((ring) => {
      if (!Array.isArray(ring) || !ring.every(isPosition)) throw new Error('Country ring is malformed.')
      return ring.map(([longitude, latitude]) => [longitude, latitude])
    })
  })
}

function matchingFeature(mapping: Pick<SourceMapping, 'code' | 'resolution'>, source: SourcePart): SourceFeature {
  const matching = sourceFeaturesByResolution[mapping.resolution].filter((candidate) => candidate.properties.name === source.sourceName && (source.sourceId === null ? candidate.id === undefined : String(candidate.id).padStart(3, '0') === source.sourceId))
  if (matching.length !== 1) throw new Error(`${mapping.code}: source mapping must resolve exactly one ${source.sourceName} feature.`)
  return matching[0]
}

export function sourcePolygonsForEntity(code: string): [number, number][][][] {
  const override = geoBoundariesOverrideFor(code)
  if (override) {
    const artifact = JSON.parse(readFileSync(join(scriptsDirectory, override.localArtifact), 'utf8')) as { features?: SourceFeature[] }
    if (!artifact.features || artifact.features.length !== 1) throw new Error(`${code}: geoBoundaries artifact must contain exactly one feature.`)
    const polygons = polygonsFromGeometry(artifact.features[0].geometry)
    const aligned = alignRingsToLongitudeDomain(polygons.flat()); let index = 0
    return polygons.map((polygon) => polygon.map(() => aligned[index++]).filter(isNonDegenerateRing)).filter((polygon) => polygon.length)
  }
  const mapping = mappings.find((candidate) => candidate.code === code)
  if (!mapping) throw new Error(`Unknown study entity ${code}.`)
  const polygons = [mapping, ...(mapping.mergeSource ? [mapping.mergeSource] : [])].flatMap((source) => polygonsFromGeometry(matchingFeature(mapping, source).geometry))
  const alignedRings = alignRingsToLongitudeDomain(polygons.flat())
  let ringIndex = 0
  return polygons.map((polygon) => polygon.map(() => alignedRings[ringIndex++]).filter(isNonDegenerateRing)).filter((polygon) => polygon.length)
}

function encodeRing(ring: readonly (readonly [number, number])[], west: number, north: number, coordinateScale: number, rejectLoss: boolean): EncodedRing {
  const integer = (value: number) => Object.is(value, -0) ? 0 : value
  const rawCoordinates = ring.slice(0, -1).map(([longitude, latitude]) => [integer(Math.round((longitude - west) * coordinateScale)), integer(Math.round((north - latitude) * coordinateScale))] as const)
  const coordinates = rawCoordinates.filter((coordinate, index) => index === 0 || coordinate[0] !== rawCoordinates[index - 1][0] || coordinate[1] !== rawCoordinates[index - 1][1])
  if (rejectLoss && coordinates.length !== rawCoordinates.length) throw new Error('High-fidelity source vertices collapsed during coordinate encoding.')
  if (coordinates.length < 3) throw new Error('Country ring collapses during coordinate encoding.')
  const encoded: number[] = [coordinates[0][0], coordinates[0][1]]
  for (let index = 1; index < coordinates.length; index += 1) encoded.push(coordinates[index][0] - coordinates[index - 1][0], coordinates[index][1] - coordinates[index - 1][1])
  if (encoded.some((value, index) => index >= 2 && index % 2 === 0 && value === 0 && encoded[index + 1] === 0)) throw new Error('Country ring has a zero delta after canonical encoding.')
  return encoded
}

export function generateCountryShapeDataset(): CountryShapeDataset {
  const manifestFailures = validateSourceManifest()
  if (manifestFailures.length) throw new Error(`Source mapping validation failed:\n- ${manifestFailures.join('\n- ')}`)
  const requiredMappings: Record<string, readonly [string | null, string]> = { ISR: ['376', 'Israel'], PSE: ['275', 'Palestine'], TWN: ['158', 'Taiwan'], VAT: ['336', 'Vatican'], XKX: [null, 'Kosovo'], TUV: ['798', 'Tuvalu'] }
  for (const [code, [sourceId, sourceName]] of Object.entries(requiredMappings)) {
    const mapping = mappings.find((candidate) => candidate.code === code)
    if (!mapping || mapping.sourceId !== sourceId || mapping.sourceName !== sourceName) throw new Error(`${code}: required source mapping has changed.`)
  }
  const overrideFailures = validateGeoBoundariesOverrides()
  if (overrideFailures.length) throw new Error(`geoBoundaries override validation failed:\n- ${overrideFailures.join('\n- ')}`)
  const shapes: Record<string, CountryShapeDataset['shapes'][string]> = {}
  for (const mapping of mappings) {
    const override = geoBoundariesOverrideFor(mapping.code)
    const polygons = sourcePolygonsForEntity(mapping.code)
    if (!polygons.length) throw new Error(`${mapping.code}: source geometry has no nondegenerate polygon.`)
    const positions = polygons.flat(2)
    const precision = override ? 5 : 3
    const coordinateScale = override ? 100000 : 1000
    const west = round(Math.min(...positions.map(([longitude]) => longitude)), precision)
    const east = round(Math.max(...positions.map(([longitude]) => longitude)), precision)
    const south = round(Math.min(...positions.map(([, latitude]) => latitude)), precision)
    const north = round(Math.max(...positions.map(([, latitude]) => latitude)), precision)
    if (!(east > west && north > south)) throw new Error(`${mapping.code}: source geometry has degenerate bounds.`)
    shapes[mapping.code] = { coordinateScale, bounds: [west, south, east, north], viewBox: [0, 0, round(east - west, precision), round(north - south, precision)], polygons: polygons.map((polygon) => polygon.map((ring) => encodeRing(ring, west, north, coordinateScale, Boolean(override)))), attribution: override ? { provider: 'geoBoundaries', licenseLabel: override.licenseLabel, osmContributors: override.osmContributors } : undefined }
  }
  const dataset: CountryShapeDataset = { version: 3, source: { package: 'world-atlas@2.0.2', datasets: [{ resolution: '50m', count: 172, dataset: 'Natural Earth v4.1.0 Admin-0 countries' }], checked: '2026-08-20' }, overrides: geoBoundariesOverrides, shapes: Object.fromEntries(Object.entries(shapes).sort(([first], [second]) => first.localeCompare(second))) }
  const failures = validateCountryShapeDataset(dataset, expectedCodes)
  if (failures.length) throw new Error(`Generated country shapes are invalid:\n- ${failures.join('\n- ')}`)
  return dataset
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
const creditColumnLabels = ['Code', 'Provider', 'Upstream source', 'Year', 'Source URI', 'Pinned artifact', 'Commit / SHA-256', 'Transformation', 'Licence / attribution'] as const
const creditCell = (label: typeof creditColumnLabels[number], value: string) => `<td data-label="${label}">${value}</td>`

/** Deterministic, local disclosure for the separately licensed override layer. */
export function generateCountryShapeCredits(): string {
  const failures = validateGeoBoundariesOverrides()
  if (failures.length) throw new Error(`geoBoundaries override validation failed:\n- ${failures.join('\n- ')}`)
  const rows = geoBoundariesOverrides.map((override) => {
    const [, licenseUrl] = licenseDetails[override.license as keyof typeof licenseDetails]
    const osm = override.osmContributors ? ' <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>' : ''
    return `<tr id="${override.code}">${creditCell('Code', override.code)}${creditCell('Provider', escapeHtml(override.provider))}${creditCell('Upstream source', escapeHtml(override.source))}${creditCell('Year', escapeHtml(override.representedYear))}${creditCell('Source URI', `<a href="${escapeHtml(override.sourceUrl)}">upstream source</a>`)}${creditCell('Pinned artifact', `<a href="${escapeHtml(override.artifact)}">pinned GeoJSON</a>`)}${creditCell('Commit / SHA-256', `<code>${override.commit}</code><br><code>${override.sha256}</code>`)}${creditCell('Transformation', `${escapeHtml(override.variant)}; locally vendored and delta-encoded at 100,000 units per degree for display only.`)}${creditCell('Licence / attribution', `<a href="${licenseUrl}">${escapeHtml(override.license)}</a>${osm}`)}</tr>`
  }).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="favicon.svg" type="image/svg+xml"><title>Country shape credits · Geoquiz</title><style>body{font-family:system-ui,sans-serif;margin:2rem;line-height:1.45;color:#17243b}table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{border:1px solid #b8c5d8;padding:.55rem;text-align:left;vertical-align:top}code,a{min-width:0;overflow-wrap:anywhere;word-break:break-word}code{font-size:.75rem}a{color:#164f96}@media(max-width:700px){body{margin:1rem}table,tbody,tr,td{display:block}table{font-size:.9rem}thead{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}tbody{display:grid;gap:1rem}tr{border:1px solid #b8c5d8;border-radius:.5rem;overflow:hidden}td{display:grid;grid-template-columns:minmax(6.5rem,40%) minmax(0,1fr);gap:.5rem;border:0;border-top:1px solid #d7e0eb;min-width:0}td:first-child{border-top:0}td::before{content:attr(data-label);font-weight:700;color:#36547a}td>*{min-width:0}}</style></head><body><h1>Country shape credits</h1><p>These 25 display-only microstate silhouettes are derived from version-pinned geoBoundaries 6.0 gbOpen ADM0 data. They are locally bundled, transformed into Geoquiz’s compact delta-encoded format, and do not determine answer, sovereignty, or boundary policy.</p><table><thead><tr>${creditColumnLabels.map((label) => `<th>${label}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></body></html>\n`
}

const outputUrl = new URL('../src/data/country-shapes.json', import.meta.url)
const creditsOutputUrl = new URL('../public/country-shape-credits.html', import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const generatedText = `${JSON.stringify(generateCountryShapeDataset())}\n`
  const generatedCredits = generateCountryShapeCredits()
  if (process.argv.includes('--check')) {
    if (await readFile(outputUrl, 'utf8') !== generatedText) throw new Error('Country shapes are out of date. Run npm run generate:country-shapes.')
    if (await readFile(creditsOutputUrl, 'utf8') !== generatedCredits) throw new Error('Country shape credits are out of date. Run npm run generate:country-shapes.')
    console.log('Country shapes are deterministic and current.')
  } else {
    await writeFile(outputUrl, generatedText)
    await writeFile(creditsOutputUrl, generatedCredits)
    console.log(`Wrote ${Object.keys(JSON.parse(generatedText).shapes).length} compact local country silhouettes.`)
  }
}
