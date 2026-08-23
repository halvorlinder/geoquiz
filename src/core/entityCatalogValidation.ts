import { continentByEntityCode, expectedContinentEntityCount, type Continent } from './entityContinentPolicy'

type UnknownRecord = Record<string, unknown>
type SourceAssociation = { code: string; country: string }
type SourceCapital = { id: string; entities: SourceAssociation[] }

const expectedEntities = 197
const expectedAssociations = 201
const expectedPlaces = 200
const expectedCapitalRoles: Record<string, Record<string, string>> = {
  BOL: { sucre: 'Constitutional capital', 'la-paz': 'Seat of government' },
  SWZ: { mbabane: 'Administrative', lobamba: 'Royal and legislative' },
  ZAF: { pretoria: 'Administrative', 'cape-town': 'Legislative', bloemfontein: 'Judicial' },
}

function normalized(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function asSourceCapital(value: unknown): SourceCapital | undefined {
  if (!isRecord(value) || !isString(value.id) || !Array.isArray(value.entities)) return undefined
  const entities: SourceAssociation[] = []
  for (const entity of value.entities) {
    if (!isRecord(entity) || !isString(entity.code) || !isString(entity.country)) return undefined
    entities.push({ code: entity.code, country: entity.country })
  }
  return { id: value.id, entities }
}

/**
 * Validates the semantic cross-dataset policy. Runtime parsing in entity.ts
 * deliberately handles only the smaller structural contract needed by helpers.
 */
export function validateEntityCatalog(entityCatalog: unknown, capitals: unknown): string[] {
  const failures: string[] = []
  if (Object.keys(continentByEntityCode).length !== expectedContinentEntityCount) failures.push(`continent policy must contain ${expectedContinentEntityCount} entity codes`)
  if (!Array.isArray(capitals)) return ['capitals.json must be an array']

  const sourceCapitals: SourceCapital[] = []
  for (const [index, capital] of capitals.entries()) {
    const parsed = asSourceCapital(capital)
    if (!parsed) failures.push(`capital ${index + 1}: must have an id and entity code/country associations`)
    else sourceCapitals.push(parsed)
  }
  const sourceByCode = new Map<string, { name: string; ids: string[] }>()
  const capitalIds = new Set(sourceCapitals.map((capital) => capital.id))
  for (const capital of sourceCapitals) {
    for (const association of capital.entities) {
      const existing = sourceByCode.get(association.code)
      if (existing && existing.name !== association.country) failures.push(`${association.code}: capital associations use inconsistent canonical entity names`)
      const entity = existing ?? { name: association.country, ids: [] }
      entity.ids.push(capital.id)
      sourceByCode.set(association.code, entity)
    }
  }

  if (!isRecord(entityCatalog)) return [...failures, 'catalog must be an object']
  if (entityCatalog.version !== 1) failures.push('catalog version must be 1')
  if (!isString(entityCatalog.checked)) failures.push('catalog checked date is required')
  if (!isRecord(entityCatalog.provenance) || !isString(entityCatalog.provenance.entityRoster) || !isString(entityCatalog.provenance.continentPolicy) || !isString(entityCatalog.provenance.source)) {
    failures.push('catalog provenance must contain entityRoster, continentPolicy, and source')
  }
  if (!Array.isArray(entityCatalog.entities)) return [...failures, 'catalog entities must be an array']

  const catalogByCode = new Map<string, UnknownRecord>()
  const sequentialLookupOwners = new Map<string, string>()
  let associationCount = 0
  const referencedCapitalIds = new Set<string>()

  for (const [index, rawEntity] of entityCatalog.entities.entries()) {
    const label = `entity ${index + 1}`
    if (!isRecord(rawEntity)) {
      failures.push(`${label}: must be an object`)
      continue
    }
    const { code, name, aliases, continent, capitals: assignments } = rawEntity
    if (!isString(code) || !/^[A-Z]{3}$/.test(code)) failures.push(`${label}: code must be a stable uppercase three-letter value`)
    if (!isString(name)) failures.push(`${label}: canonical name is required`)
    if (!isString(continent) || !Object.values<Continent>(continentByEntityCode).includes(continent as Continent)) failures.push(`${label}: continent must be supported`)
    if (!Array.isArray(aliases)) failures.push(`${label}: aliases must be an array`)
    if (!Array.isArray(assignments) || assignments.length === 0) failures.push(`${label}: capital assignments are required`)
    if (!isString(code) || !isString(name) || !Array.isArray(aliases) || !Array.isArray(assignments)) continue

    if (catalogByCode.has(code)) failures.push(`${label}: duplicate entity code ${code}`)
    catalogByCode.set(code, rawEntity)
    for (const lookup of [code, name]) {
      const key = normalized(lookup)
      const existingOwner = sequentialLookupOwners.get(key)
      if (existingOwner && existingOwner !== code) failures.push(`${label}: canonical name or code '${lookup}' collides with ${existingOwner}`)
      sequentialLookupOwners.set(key, code)
    }
    const aliasesInEntity = new Set<string>()
    for (const alias of aliases) {
      if (!isString(alias)) {
        failures.push(`${label}: aliases must be nonempty strings`)
        continue
      }
      const key = normalized(alias)
      if (!key || aliasesInEntity.has(key)) failures.push(`${label}: aliases must be unique after normalization`)
      aliasesInEntity.add(key)
      const existingOwner = sequentialLookupOwners.get(key)
      if (existingOwner) failures.push(`${label}: alias '${alias}' collides with canonical name, code, or alias of ${existingOwner}`)
      sequentialLookupOwners.set(key, code)
    }
    const assignmentIds = new Set<string>()
    for (const assignment of assignments) {
      if (!isRecord(assignment) || !isString(assignment.id) || !isString(assignment.role)) {
        failures.push(`${label}: each capital assignment needs a nonempty id and role`)
        continue
      }
      if (!capitalIds.has(assignment.id)) failures.push(`${label}: capital id ${assignment.id} is not in capitals.json`)
      if (assignmentIds.has(assignment.id)) failures.push(`${label}: duplicate capital id ${assignment.id}`)
      assignmentIds.add(assignment.id)
      referencedCapitalIds.add(assignment.id)
      associationCount += 1
      if (!(code in expectedCapitalRoles) && assignment.role !== 'Capital') failures.push(`${label}: single-capital entities must use the Capital role`)
    }
  }

  const canonicalOwners = new Map<string, string>()
  const aliasOwners = new Map<string, string>()
  for (const rawEntity of entityCatalog.entities) {
    if (!isRecord(rawEntity) || !isString(rawEntity.code) || !isString(rawEntity.name)) continue
    for (const value of [rawEntity.code, rawEntity.name]) {
      const key = normalized(value)
      const existingOwner = canonicalOwners.get(key)
      if (existingOwner && existingOwner !== rawEntity.code) failures.push(`${rawEntity.code}: canonical value '${value}' collides with ${existingOwner}`)
      canonicalOwners.set(key, rawEntity.code)
    }
  }
  for (const rawEntity of entityCatalog.entities) {
    if (!isRecord(rawEntity) || !isString(rawEntity.code) || !Array.isArray(rawEntity.aliases)) continue
    for (const alias of rawEntity.aliases) {
      if (!isString(alias)) continue
      const key = normalized(alias)
      const canonicalOwner = canonicalOwners.get(key)
      const aliasOwner = aliasOwners.get(key)
      if (canonicalOwner) failures.push(`${rawEntity.code}: alias '${alias}' collides with canonical name or code of ${canonicalOwner}`)
      if (aliasOwner) failures.push(`${rawEntity.code}: alias '${alias}' collides with alias of ${aliasOwner}`)
      aliasOwners.set(key, rawEntity.code)
    }
  }

  if (entityCatalog.entities.length !== expectedEntities) failures.push(`expected ${expectedEntities} entities, found ${entityCatalog.entities.length}`)
  if (catalogByCode.size !== expectedEntities) failures.push(`expected ${expectedEntities} unique entity codes, found ${catalogByCode.size}`)
  if (sourceByCode.size !== expectedEntities) failures.push(`capitals.json must provide ${expectedEntities} study entities, found ${sourceByCode.size}`)
  if (sourceCapitals.length !== expectedPlaces) failures.push(`capitals.json must provide ${expectedPlaces} unique places, found ${sourceCapitals.length}`)
  if (associationCount !== expectedAssociations) failures.push(`expected ${expectedAssociations} entity-capital assignments, found ${associationCount}`)
  if (referencedCapitalIds.size !== expectedPlaces) failures.push(`expected ${expectedPlaces} unique referenced capital IDs, found ${referencedCapitalIds.size}`)

  for (const [code, source] of sourceByCode) {
    const entity = catalogByCode.get(code)
    if (!entity) {
      failures.push(`missing entity ${code} from catalog`)
      continue
    }
    if (entity.name !== source.name) failures.push(`${code}: canonical name must match capitals.json (${source.name})`)
    const ids = Array.isArray(entity.capitals) ? entity.capitals.filter(isRecord).map((assignment) => assignment.id).filter(isString).sort() : []
    if (ids.join(',') !== [...source.ids].sort().join(',')) failures.push(`${code}: capital IDs must exactly reciprocate capitals.json`)
  }
  for (const code of catalogByCode.keys()) if (!sourceByCode.has(code)) failures.push(`${code}: unexpected entity not present in capitals.json`)

  for (const [code, expectedContinent] of Object.entries(continentByEntityCode)) {
    if (catalogByCode.get(code)?.continent !== expectedContinent) failures.push(`${code}: must use continent policy ${expectedContinent}`)
  }
  for (const code of catalogByCode.keys()) if (!(code in continentByEntityCode)) failures.push(`${code}: missing from continent policy`)

  for (const [code, expectedAssignments] of Object.entries(expectedCapitalRoles)) {
    const assignments = catalogByCode.get(code)?.capitals
    const actual = new Map(Array.isArray(assignments) ? assignments.filter(isRecord).map((assignment) => [assignment.id, assignment.role]) : [])
    for (const [id, role] of Object.entries(expectedAssignments)) {
      if (actual.get(id) !== role) failures.push(`${code}: ${id} must have role '${role}'`)
    }
  }
  const onlyJerusalem = (assignments: unknown) => Array.isArray(assignments) && assignments.length === 1 && isRecord(assignments[0]) && assignments[0].id === 'jerusalem' && assignments[0].role === 'Capital'
  if (!onlyJerusalem(catalogByCode.get('ISR')?.capitals) || !onlyJerusalem(catalogByCode.get('PSE')?.capitals)) failures.push('ISR and PSE must each reference the one shared Jerusalem place with the Capital role')

  return failures
}
