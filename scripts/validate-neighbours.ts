import capitals from '../src/data/capitals.json' with { type: 'json' }
import neighbourDataJson from '../src/data/neighbours.json' with { type: 'json' }
import {
  NEIGHBOUR_DATA_VERSION,
  getEligibleNeighbourEntityCodes,
  getNeighbourCodes,
  hasEligibleLandNeighbours,
  type NeighbourData,
} from '../src/core/neighbours.ts'

type Capital = { entities: Array<{ code: string }> }

const data = neighbourDataJson as unknown as NeighbourData
const failures: string[] = []
const expectedChecked = '2026-08-20'
const expectedVersion = 1
const expectedEdgeCount = 317
const expectedEligibleCount = 157
const expectedZeroNeighbourCodes = [
  'ATG', 'AUS', 'BHR', 'BHS', 'BRB', 'COM', 'CPV', 'CUB', 'CYP', 'DMA', 'FJI', 'FSM',
  'GRD', 'ISL', 'JAM', 'JPN', 'KIR', 'KNA', 'LCA', 'LKA', 'MDG', 'MDV', 'MHL', 'MLT',
  'MUS', 'NRU', 'NZL', 'PHL', 'PLW', 'SGP', 'SLB', 'STP', 'SYC', 'TON', 'TTO',
  'TUV', 'TWN', 'VCT', 'VUT', 'WSM',
]
const expectedCodes = new Set((capitals as Capital[]).flatMap((capital) => capital.entities.map((entity) => entity.code)))
const allowedScopes = new Set(['ordinary', 'exclave', 'integral-territory'])
const sourceIds = new Set<string>()

if (data.version !== expectedVersion || NEIGHBOUR_DATA_VERSION !== expectedVersion) failures.push('version must be 1')
if (data.checked !== expectedChecked) failures.push(`checked date must be ${expectedChecked}`)
for (const source of data.sourceCatalog) {
  if (!source.id || sourceIds.has(source.id)) failures.push('source catalog IDs must be unique and non-empty')
  sourceIds.add(source.id)
  if (!source.title || !source.description || source.checked !== expectedChecked) failures.push(`source ${source.id}: title, description, and checked date are required`)
  try {
    const url = new URL(source.url)
    if (!['http:', 'https:'].includes(url.protocol)) failures.push(`source ${source.id}: URL must be http(s)`)
  } catch {
    failures.push(`source ${source.id}: URL must be valid`)
  }
}

const roster = new Set(data.entityCodes)
if (roster.size !== data.entityCodes.length || roster.size !== expectedCodes.size) failures.push(`entity roster must contain exactly ${expectedCodes.size} unique codes`)
for (const code of expectedCodes) if (!roster.has(code)) failures.push(`missing capital study code ${code}`)
for (const code of roster) if (!expectedCodes.has(code)) failures.push(`unexpected neighbour study code ${code}`)
if (data.entityCodes.join(',') !== [...data.entityCodes].sort().join(',')) failures.push('entity codes must be sorted')

const edgeKeys = new Set<string>()
for (const boundary of data.boundaries) {
  const [left, right] = boundary.codes
  const edgeKey = `${left},${right}`
  if (!Array.isArray(boundary.codes) || boundary.codes.length !== 2 || !left || !right || left >= right) failures.push(`edge ${edgeKey}: codes must be two distinct lexicographically ordered codes`)
  if (!roster.has(left) || !roster.has(right)) failures.push(`edge ${edgeKey}: codes must be in the entity roster`)
  if (boundary.boundaryType !== 'land' || !allowedScopes.has(boundary.scope)) failures.push(`edge ${edgeKey}: unsupported boundary type or scope`)
  if (!Array.isArray(boundary.sourceRefs) || !boundary.sourceRefs.length || new Set(boundary.sourceRefs).size !== boundary.sourceRefs.length || boundary.sourceRefs.some((source) => !sourceIds.has(source))) failures.push(`edge ${edgeKey}: needs deduplicated valid source references`)
  if (boundary.note !== undefined && (typeof boundary.note !== 'string' || !boundary.note.trim() || boundary.note.length > 180)) failures.push(`edge ${edgeKey}: note must be concise text`)
  if (edgeKeys.has(edgeKey)) failures.push(`duplicate edge ${edgeKey}`)
  edgeKeys.add(edgeKey)
}
if (data.boundaries.map((edge) => edge.codes.join(',')).join('|') !== [...edgeKeys].sort().join('|')) failures.push('boundaries must be deterministically sorted')

const exclusions = new Set<string>()
const excludedKeys: string[] = []
for (const excluded of data.excludedContacts) {
  const [left, right] = excluded.codes
  const key = [left, right].sort().join(',')
  if (!Array.isArray(excluded.codes) || excluded.codes.length !== 2 || !left || !right || left >= right || !roster.has(left) || !roster.has(right) || !excluded.reason) failures.push(`invalid excluded contact ${key}`)
  if (!Array.isArray(excluded.sourceRefs) || !excluded.sourceRefs.length || new Set(excluded.sourceRefs).size !== excluded.sourceRefs.length || excluded.sourceRefs.some((source) => !sourceIds.has(source))) failures.push(`excluded contact ${key}: needs deduplicated valid source references`)
  if (edgeKeys.has(key)) failures.push(`excluded contact ${key} must not be an edge`)
  if (exclusions.has(key)) failures.push(`duplicate excluded contact ${key}`)
  exclusions.add(key)
  excludedKeys.push(key)
}
if (excludedKeys.join('|') !== [...excludedKeys].sort().join('|')) failures.push('excluded contacts must be deterministically sorted')

for (const code of roster) {
  const neighbours = getNeighbourCodes(code)
  if (!neighbours) {
    failures.push(`known code ${code} must return a neighbour list`)
    continue
  }
  if (neighbours.join(',') !== [...neighbours].sort().join(',')) failures.push(`${code}: neighbours must be sorted`)
  for (const neighbour of neighbours) {
    if (neighbour === code || !getNeighbourCodes(neighbour)?.includes(code)) failures.push(`${code}: adjacency must be reciprocal and non-self`)
  }
  if (hasEligibleLandNeighbours(code) !== (neighbours.length > 0)) failures.push(`${code}: eligibility must agree with adjacency`)
}

const sensitive: Record<string, readonly string[]> = {
  PSE: ['EGY', 'ISR', 'JOR'],
  XKX: ['ALB', 'MKD', 'MNE', 'SRB'],
  CYP: [],
  MAR: ['DZA', 'ESP'],
}
for (const [code, expected] of Object.entries(sensitive)) {
  const actual = getNeighbourCodes(code) ?? []
  if (actual.join(',') !== expected.join(',')) failures.push(`${code}: expected ${expected.join(',') || '(none)'}, found ${actual.join(',') || '(none)'}`)
}
const requiredEdges = [
  'ISR,SYR', 'GEO,RUS', 'RUS,UKR', 'ARM,AZE', 'CHN,IND', 'IND,PAK', 'AFG,PAK',
  'GUY,VEN', 'GUY,SUR', 'BLZ,GTM', 'ERI,ETH', 'SDN,SSD', 'HRV,SRB',
  'POL,RUS', 'LTU,RUS', 'AZE,TUR', 'AGO,COG', 'BRA,FRA', 'FRA,SUR', 'ESP,MAR', 'BWA,ZMB',
  'LTU,LVA', 'MLI,MRT', 'MLI,NER', 'MNG,RUS', 'OMN,SAU', 'OMN,YEM', 'QAT,SAU', 'HRV,MNE',
]
for (const edge of requiredEdges) if (!edgeKeys.has(edge)) failures.push(`missing required edge ${edge}`)
for (const edge of ['ESP,GBR', 'CYP,GBR', 'CAN,DNK', 'MAR,MRT']) if (edgeKeys.has(edge)) failures.push(`excluded edge ${edge} must not be present`)
const notedSensitiveEdges: Record<string, string> = {
  'AFG,PAK': 'pakistan-un-map',
  'ARM,AZE': 'armenia-azerbaijan-un-filing',
  'BLZ,GTM': 'belize-guatemala-icj',
  'CHN,IND': 'china-india-lac-agreement',
  'ERI,ETH': 'eritrea-ethiopia-pca',
  'GEO,RUS': 'georgia-border-police',
  'GUY,SUR': 'guyana-frontiers',
  'GUY,VEN': 'guyana-venezuela-icj',
  'HRV,SRB': 'croatia-serbia-border-crossings',
  'IND,PAK': 'pakistan-un-map',
  'ISR,SYR': 'israel-syria-un-map',
  'RUS,UKR': 'russia-ukraine-un-map',
  'SDN,SSD': 'sudan-south-sudan-un-map',
}
for (const [key, sourceRef] of Object.entries(notedSensitiveEdges)) {
  const edge = data.boundaries.find((boundary) => boundary.codes.join(',') === key)
  if (!edge?.note?.trim() || !edge.sourceRefs.includes(sourceRef)) failures.push(`sensitive edge ${key} needs a neutral note and ${sourceRef}`)
}

const eligible = getEligibleNeighbourEntityCodes()
if (eligible.join(',') !== [...eligible].sort().join(',')) failures.push('eligible codes must be sorted')
if (eligible.some((code) => !hasEligibleLandNeighbours(code))) failures.push('eligible codes may not include zero-neighbour entities')
const zeroCodes = data.entityCodes.filter((code) => !hasEligibleLandNeighbours(code))
if (data.boundaries.length !== expectedEdgeCount) failures.push(`expected ${expectedEdgeCount} edges, found ${data.boundaries.length}`)
if (eligible.length !== expectedEligibleCount) failures.push(`expected ${expectedEligibleCount} eligible entities, found ${eligible.length}`)
if (zeroCodes.join(',') !== expectedZeroNeighbourCodes.join(',')) failures.push('zero-neighbour roster differs from the approved snapshot')
if (failures.length) throw new Error(`Neighbour data validation failed:\n- ${failures.join('\n- ')}`)

console.log(`Validated ${data.entityCodes.length} study entities, ${data.boundaries.length} land-boundary edges, ${eligible.length} eligible entities, and ${zeroCodes.length} zero-neighbour entities.`)
