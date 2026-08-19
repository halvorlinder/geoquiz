import capitals from '../src/data/capitals.json' with { type: 'json' }

type Entity = { code: string; country: string; sourceRef: string; checked: string }
type Capital = { id: string; capital: string; latitude: number; longitude: number; aliases?: string[]; entities: Entity[]; coordinateSource: string; checked: string }

const expectedEntities = 197
const expectedAssociations = 201
const expectedPlaces = 200
const checkedDate = '2026-08-19'
// Versioned v1 roster: 193 UN members plus VAT, PSE, XKX, and TWN.
const expectedIso3 = new Set('AFG AGO ALB AND ARE ARG ARM ATG AUS AUT AZE BDI BEL BEN BFA BGD BGR BHR BHS BIH BLR BLZ BOL BRA BRB BRN BTN BWA CAF CAN CHE CHL CHN CIV CMR COD COG COL COM CPV CRI CUB CYP CZE DEU DJI DMA DNK DOM DZA ECU EGY ERI ESP EST ETH FIN FJI FRA FSM GAB GBR GEO GHA GIN GMB GNB GNQ GRC GRD GTM GUY HND HRV HTI HUN IDN IND IRL IRN IRQ ISL ISR ITA JAM JOR JPN KAZ KEN KGZ KHM KIR KNA KOR KWT LAO LBN LBR LBY LCA LIE LKA LSO LTU LUX LVA MAR MCO MDA MDG MDV MEX MHL MKD MLI MLT MMR MNE MNG MOZ MRT MUS MWI MYS NAM NER NGA NIC NLD NOR NPL NRU NZL OMN PAK PAN PER PHL PLW PNG POL PRK PRT PRY PSE QAT ROU RUS RWA SAU SDN SEN SGP SLB SLE SLV SMR SOM SRB SSD STP SUR SVK SVN SWE SWZ SYC SYR TCD TGO THA TJK TKM TLS TON TTO TUN TUR TUV TWN TZA UGA UKR URY USA UZB VAT VCT VEN VNM VUT WSM XKX YEM ZAF ZMB ZWE'.split(' '))
const data = capitals as Capital[]
const failures: string[] = []
if (expectedIso3.size !== expectedEntities) failures.push(`versioned ISO roster must contain ${expectedEntities} codes`)
const ids = new Set<string>()
const names = new Set<string>()
const coordinates = new Set<string>()
const associations = new Map<string, Capital[]>()
const normalizedNames = new Map<string, string>()
const entityNames = new Set<string>()
// Common English names that differ from the selected display labels are still
// entity names and must never become answer aliases for a capital city.
const entityNameVariants = new Set(['Turkey', 'Czech Republic', 'Cape Verde'].map(normalized))

function normalized(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

for (const [index, place] of data.entries()) {
  const label = `place ${index + 1}`
  if (!place.id || ids.has(place.id)) failures.push(`${label}: id must be unique`)
  if (!place.capital || names.has(place.capital)) failures.push(`${label}: capital name must be unique`)
  ids.add(place.id)
  names.add(place.capital)
  if (!Number.isFinite(place.latitude) || place.latitude < -90 || place.latitude > 90) failures.push(`${label}: invalid latitude`)
  if (!Number.isFinite(place.longitude) || place.longitude < -180 || place.longitude > 180) failures.push(`${label}: invalid longitude`)
  const coordinate = `${place.latitude},${place.longitude}`
  if (coordinates.has(coordinate)) failures.push(`${label}: duplicate coordinates ${coordinate}`)
  coordinates.add(coordinate)
  if (!place.coordinateSource || place.checked !== checkedDate) failures.push(`${label}: coordinate source and checked date are required`)
  if (!place.entities.length) failures.push(`${label}: needs an associated entity`)
  for (const entity of place.entities) {
    if (!entity.code || !entity.country || !entity.sourceRef || entity.checked !== checkedDate) failures.push(`${label}: invalid entity provenance`)
    const prior = associations.get(entity.code) ?? []
    associations.set(entity.code, [...prior, place])
    entityNames.add(normalized(entity.country))
  }
  for (const name of [place.capital, ...(place.aliases ?? [])]) {
    const key = normalized(name)
    const existingId = normalizedNames.get(key)
    if (existingId && existingId !== place.id) failures.push(`${label}: normalized answer '${name}' collides with ${existingId}`)
    normalizedNames.set(key, place.id)
  }
}

for (const name of entityNames) entityNameVariants.add(name)

for (const place of data) {
  for (const alias of place.aliases ?? []) {
    const normalizedAlias = normalized(alias)
    if (entityNameVariants.has(normalizedAlias) && normalized(place.capital) !== normalizedAlias) {
      failures.push(`${place.id}: alias '${alias}' is an entity name, not a capital answer`)
    }
  }
}

if (data.length !== expectedPlaces) failures.push(`expected ${expectedPlaces} unique places, found ${data.length}`)
if (associations.size !== expectedEntities) failures.push(`expected ${expectedEntities} distinct ISO3 entity codes, found ${associations.size}`)
for (const requiredCode of ['VAT', 'PSE', 'XKX', 'TWN']) {
  if (!associations.has(requiredCode)) failures.push(`missing required study entity ${requiredCode}`)
}
for (const code of expectedIso3) if (!associations.has(code)) failures.push(`missing expected entity ${code}`)
for (const code of associations.keys()) if (!expectedIso3.has(code)) failures.push(`unexpected entity ${code}`)
const associationCount = [...associations.values()].reduce((total, places) => total + places.length, 0)
if (associationCount !== expectedAssociations) failures.push(`expected ${expectedAssociations} entity-to-capital associations, found ${associationCount}`)

for (const [code, places] of associations) {
  const expected = code === 'BOL' || code === 'SWZ' ? 2 : code === 'ZAF' ? 3 : 1
  if (places.length !== expected) failures.push(`${code}: expected ${expected} capital association(s), found ${places.length}`)
}

const jerusalem = data.find((place) => place.capital === 'Jerusalem')
if (!jerusalem || jerusalem.entities.map((entity) => entity.code).sort().join(',') !== 'ISR,PSE') failures.push('Jerusalem must be the one shared ISR/PSE place')
const snapshots: Record<string, string> = {
  GNQ: 'Ciudad de la Paz', KAZ: 'Astana', LKA: 'Sri Jayawardenepura Kotte', PLW: 'Ngerulmud', IDN: 'Jakarta',
}
for (const [code, expectedCapital] of Object.entries(snapshots)) {
  const actual = associations.get(code)?.[0]?.capital
  if (actual !== expectedCapital) failures.push(`${code}: expected snapshot ${expectedCapital}, found ${actual ?? 'none'}`)
}

if (failures.length) throw new Error(`Capital data validation failed:\n- ${failures.join('\n- ')}`)
console.log(`Validated ${data.length} places, ${associationCount} associations, and ${associations.size} study entities.`)
