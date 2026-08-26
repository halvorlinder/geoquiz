import entityData from '../data/entities.json'
import { continents, type Continent } from './entityContinentPolicy'

export { continents, type Continent } from './entityContinentPolicy'

export type CapitalAssignment = {
  readonly id: string
  readonly role: string
}

export type StudyEntity = {
  readonly code: string
  readonly name: string
  readonly aliases: readonly string[]
  /** Curated country abbreviations; matched as compact exact-only answers. */
  readonly abbreviations: readonly string[]
  readonly continent: Continent
  readonly capitals: readonly CapitalAssignment[]
}

export type EntityCatalogProvenance = {
  readonly entityRoster: string
  readonly continentPolicy: string
  readonly source: string
}

export type EntityCatalog = {
  readonly version: number
  readonly checked: string
  readonly provenance: EntityCatalogProvenance
  readonly entities: readonly StudyEntity[]
}

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Produces the compact key used solely for curated country abbreviations.
 * Unlike ordinary answer normalization, punctuation and spacing do not form
 * word boundaries here, so U.A.E., U-A-E, and U A E are the same answer.
 */
export function normalizeEntityAbbreviation(value: string) {
  return normalize(value).replace(/\s/g, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Invalid entity catalog: ${path} must be a nonempty string`)
  return value
}

function parseAssignment(value: unknown, path: string): CapitalAssignment {
  if (!isRecord(value)) throw new Error(`Invalid entity catalog: ${path} must be an object`)
  if ('id' in value && 'role' in value && Object.keys(value).sort().join(',') !== 'id,role') throw new Error(`Invalid entity catalog: ${path} has missing or extra fields`)
  return Object.freeze({
    id: requiredString(value.id, `${path}.id`),
    role: requiredString(value.role, `${path}.role`),
  })
}

function parseEntity(value: unknown, index: number): StudyEntity {
  const path = `entities[${index}]`
  if (!isRecord(value)) throw new Error(`Invalid entity catalog: ${path} must be an object`)
  if (Object.keys(value).sort().join(',') !== 'abbreviations,aliases,capitals,code,continent,name') throw new Error(`Invalid entity catalog: ${path} has missing or extra fields`)
  if (!Array.isArray(value.aliases)) throw new Error(`Invalid entity catalog: ${path}.aliases must be an array`)
  if (!Array.isArray(value.abbreviations)) throw new Error(`Invalid entity catalog: ${path}.abbreviations must be an array`)
  if (!Array.isArray(value.capitals)) throw new Error(`Invalid entity catalog: ${path}.capitals must be an array`)
  const continent = requiredString(value.continent, `${path}.continent`)
  if (!(continents as readonly string[]).includes(continent)) throw new Error(`Invalid entity catalog: ${path}.continent is unsupported (${continent})`)
  return Object.freeze({
    code: requiredString(value.code, `${path}.code`),
    name: requiredString(value.name, `${path}.name`),
    aliases: Object.freeze(value.aliases.map((alias, aliasIndex) => requiredString(alias, `${path}.aliases[${aliasIndex}]`))),
    abbreviations: Object.freeze(value.abbreviations.map((abbreviation, abbreviationIndex) => requiredString(abbreviation, `${path}.abbreviations[${abbreviationIndex}]`))),
    continent: continent as Continent,
    capitals: Object.freeze(value.capitals.map((capital, capitalIndex) => parseAssignment(capital, `${path}.capitals[${capitalIndex}]`))),
  })
}

/** Parses the runtime shape required for safe catalog lookup initialization. */
export function parseEntityCatalog(value: unknown): EntityCatalog {
  if (!isRecord(value)) throw new Error('Invalid entity catalog: catalog must be an object')
  if (Object.keys(value).sort().join(',') !== 'checked,entities,provenance,version') throw new Error('Invalid entity catalog: catalog has missing or extra fields')
  if (!isRecord(value.provenance)) throw new Error('Invalid entity catalog: provenance must be an object')
  if (Object.keys(value.provenance).sort().join(',') !== 'continentPolicy,entityRoster,source') throw new Error('Invalid entity catalog: provenance has missing or extra fields')
  if (!Array.isArray(value.entities)) throw new Error('Invalid entity catalog: entities must be an array')
  if (value.version !== 3) throw new Error('Invalid entity catalog: version must be 3')
  return Object.freeze({
    version: value.version,
    checked: requiredString(value.checked, 'checked'),
    provenance: Object.freeze({
      entityRoster: requiredString(value.provenance.entityRoster, 'provenance.entityRoster'),
      continentPolicy: requiredString(value.provenance.continentPolicy, 'provenance.continentPolicy'),
      source: requiredString(value.provenance.source, 'provenance.source'),
    }),
    entities: Object.freeze(value.entities.map(parseEntity)),
  })
}

export const entityCatalog = parseEntityCatalog(entityData)

export const studyEntities = entityCatalog.entities

const entitiesByCode = new Map(studyEntities.map((entity) => [entity.code, entity]))
const entitiesByLookupCode = new Map(studyEntities.map((entity) => [normalize(entity.code), entity]))
const entitiesByName = new Map<string, StudyEntity>()
const entitiesByAbbreviation = new Map<string, StudyEntity>()

for (const entity of studyEntities) {
  entitiesByName.set(normalize(entity.name), entity)
  for (const alias of entity.aliases) entitiesByName.set(normalize(alias), entity)
  for (const abbreviation of entity.abbreviations) entitiesByAbbreviation.set(normalizeEntityAbbreviation(abbreviation), entity)
}

export function getEntityByCode(code: string): StudyEntity | undefined {
  return entitiesByCode.get(code.trim().toUpperCase())
}

export function findEntity(value: string): StudyEntity | undefined {
  return entitiesByName.get(normalize(value)) ?? entitiesByAbbreviation.get(normalizeEntityAbbreviation(value)) ?? entitiesByLookupCode.get(normalize(value))
}

export function entitiesForContinent(continent: Continent): readonly StudyEntity[] {
  return studyEntities.filter((entity) => entity.continent === continent)
}
