import catalog from '../data/flags.json'

export type FlagScope = 'without-territories' | 'with-territories' | 'only-territories'
export type FlagRecord = Readonly<{
  id: string
  name: string
  aliases: readonly string[]
  scope: 'sovereign' | 'territory'
  studyKind: 'sovereign-study' | 'territory' | 'associated-area'
  parent: string | null
  sourceKey: string
  assetPath: string
  flagStatus: 'official-or-national' | 'territorial-or-local' | 'community-unofficial'
  statusSource: string | null
  note: string
  checked: string
}>

type Catalog = { version: number; records: FlagRecord[] }
const data = catalog as Catalog
const records = data.records.map((record) => Object.freeze({ ...record, aliases: Object.freeze([...record.aliases]) }))
const byId = new Map(records.map((record) => [record.id, record]))

export const flagCatalogVersion = data.version

export function normalizeFlagAnswer(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

export function flagRecordsForScope(scope: FlagScope): readonly FlagRecord[] {
  if (!['without-territories', 'with-territories', 'only-territories'].includes(scope)) throw new Error(`Unknown flag scope: ${scope}`)
  const selected = scope === 'without-territories' ? records.filter((record) => record.scope === 'sovereign') : scope === 'only-territories' ? records.filter((record) => record.scope === 'territory') : records
  return Object.freeze([...selected])
}

export function flagRecordById(id: string): FlagRecord {
  const record = byId.get(id)
  if (!record) throw new Error(`Unknown flag record: ${id}`)
  return record
}

export function flagAssetUrl(id: string, baseUrl = import.meta.env.BASE_URL): string {
  const record = flagRecordById(id)
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${base}${record.assetPath.slice(1)}`
}
