import rawHighPointData from '../data/high-points.json'
import { HIGH_POINT_CHECKED, HIGH_POINT_DATA_VERSION, highPointSourceSupport, highPointSources, type HighPointKind, type HighPointNameStatus, type HighPointRecord, type HighPointSourceId } from '../data/high-points'
import { normalizeAnswer } from './answerMatching'

export type { HighPointKind, HighPointNameStatus, HighPointRecord, HighPointSourceId }

const recordKeys = new Set(['code', 'label', 'aliases', 'latitude', 'longitude', 'coordinateConfidence', 'elevationMetres', 'kind', 'nameStatus', 'sourceRefs', 'sharedFeatureId', 'checked', 'note'])
const kinds = new Set<HighPointKind>(['mountain', 'peak', 'volcano', 'massif', 'hill', 'ridge', 'cliff', 'island', 'point', 'urban-point'])
const statuses = new Set<HighPointNameStatus>(['named', 'descriptive'])
const sourceReferenceKeys = new Set(['sourceId', 'url', 'revision', 'locator', 'captured', 'supports', 'limitation'])

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Parses untrusted data into a frozen record; it is intentionally strict. */
export function parseHighPointRecord(value: unknown): HighPointRecord {
  if (!isPlainRecord(value)) throw new Error('highest point must be an object')
  for (const key of Object.keys(value)) if (!recordKeys.has(key)) throw new Error(`unexpected highest-point key: ${key}`)
  const { code, label, aliases, latitude, longitude, coordinateConfidence, elevationMetres, kind, nameStatus, sourceRefs, sharedFeatureId, checked, note } = value
  if (typeof code !== 'string' || !/^[A-Z]{3}$/.test(code)) throw new Error('highest point code must be ISO3-like')
  if (typeof label !== 'string' || !label.trim()) throw new Error('highest point label is required')
  if (!Array.isArray(aliases) || aliases.some((alias) => typeof alias !== 'string' || !alias.trim())) throw new Error('highest point aliases must be strings')
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('highest point latitude is invalid')
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('highest point longitude is invalid')
  if (!['surveyed', 'named-feature', 'representative', 'provisional'].includes(coordinateConfidence as string)) throw new Error('highest point coordinate confidence is invalid')
  if (elevationMetres !== undefined && (typeof elevationMetres !== 'number' || !Number.isFinite(elevationMetres) || elevationMetres < 0 || elevationMetres > 10000)) throw new Error('highest point elevation is invalid')
  if (typeof kind !== 'string' || !kinds.has(kind as HighPointKind)) throw new Error('highest point kind is invalid')
  if (typeof nameStatus !== 'string' || !statuses.has(nameStatus as HighPointNameStatus)) throw new Error('highest point name status is invalid')
  if (!Array.isArray(sourceRefs) || !sourceRefs.length) throw new Error('highest point sources are required')
  if (sourceRefs.some((source) => !isPlainRecord(source) || Object.keys(source).some((key) => !sourceReferenceKeys.has(key)) || typeof source.sourceId !== 'string' || !source.sourceId || typeof source.url !== 'string' || !source.url || typeof source.revision !== 'string' || !source.revision || typeof source.locator !== 'string' || !source.locator || typeof source.captured !== 'string' || !source.captured || !Array.isArray(source.supports) || !source.supports.length || source.supports.some((support) => typeof support !== 'string' || !support) || (source.limitation !== undefined && (typeof source.limitation !== 'string' || !source.limitation.trim())))) throw new Error('highest point source reference is invalid')
  if (sharedFeatureId !== undefined && (typeof sharedFeatureId !== 'string' || !/^[a-z0-9-]+$/.test(sharedFeatureId))) throw new Error('highest point shared feature is invalid')
  if (typeof checked !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(checked)) throw new Error('highest point checked date is invalid')
  if (note !== undefined && typeof note !== 'string') throw new Error('highest point note is invalid')
  return Object.freeze({
    code,
    label: label.trim(),
    aliases: Object.freeze([...aliases] as string[]),
    latitude,
    longitude,
    coordinateConfidence: coordinateConfidence as import('../data/high-points').CoordinateConfidence,
    ...(elevationMetres === undefined ? {} : { elevationMetres }),
    kind: kind as HighPointKind,
    nameStatus: nameStatus as HighPointNameStatus,
    sourceRefs: Object.freeze(sourceRefs.map((source) => Object.freeze({ sourceId: source.sourceId as HighPointSourceId, url: source.url as string, revision: source.revision as string, locator: source.locator as string, captured: source.captured as string, supports: Object.freeze([...(source.supports as string[])]), ...(source.limitation ? { limitation: source.limitation as string } : {}) }))),
    ...(sharedFeatureId ? { sharedFeatureId } : {}),
    checked,
    ...(note ? { note } : {}),
  })
}

type HighPointDataset = Readonly<{ version: string; checked: string; records: readonly HighPointRecord[] }>

export function parseHighPointDataset(value: unknown): HighPointDataset {
  if (!isPlainRecord(value)) throw new Error('highest-point dataset must be an object')
  const keys = new Set(Object.keys(value))
  for (const key of keys) if (!['version', 'checked', 'records'].includes(key)) throw new Error(`unexpected highest-point dataset key: ${key}`)
  if (keys.size !== 3 || typeof value.version !== 'string' || typeof value.checked !== 'string' || !Array.isArray(value.records)) throw new Error('highest-point dataset schema is invalid')
  if (value.version !== HIGH_POINT_DATA_VERSION || value.checked !== HIGH_POINT_CHECKED) throw new Error('highest-point dataset version is invalid')
  return Object.freeze({ version: value.version, checked: value.checked, records: Object.freeze(value.records.map(parseHighPointRecord)) })
}

export const highPointDataset = parseHighPointDataset(rawHighPointData as unknown)
export const highPoints: readonly HighPointRecord[] = highPointDataset.records
const records = highPoints
const byCode = new Map(records.map((record) => [record.code, record]))

export function allHighPoints(): readonly HighPointRecord[] {
  return records
}

/** Returns undefined for unknown, malformed, or prototype-property keys. */
export function getHighPoint(code: unknown): HighPointRecord | undefined {
  if (typeof code !== 'string' || !/^[A-Z]{3}$/.test(code)) return undefined
  return byCode.get(code)
}

export function highPointAnswerNames(record: HighPointRecord): readonly string[] {
  return Object.freeze([record.label, ...record.aliases].map(normalizeAnswer))
}

export type HighPointSourceReference = Readonly<{
  id: HighPointSourceId
  title: string
  url: string
  supports: readonly string[]
  checked: string
  limitation?: string
}>

/** Resolves local source IDs to auditable, record-specific HTTPS references. */
export function highPointSourceReferences(record: HighPointRecord): readonly HighPointSourceReference[] {
  return Object.freeze(record.sourceRefs.map((reference) => {
    const id = reference.sourceId
    const source = highPointSources[id]
    const supports = highPointSourceSupport[id]
    if (!source || !supports) {
      return Object.freeze({ id, title: 'Unknown source', url: '', supports: Object.freeze([]), checked: '' })
    }
    return Object.freeze({
      id,
      title: source.title,
      url: reference.url === 'catalog' ? source.url : reference.url,
      supports: Object.freeze([...reference.supports]),
      checked: source.checked,
      ...(reference.limitation ? { limitation: reference.limitation } : {}),
    })
  }))
}
