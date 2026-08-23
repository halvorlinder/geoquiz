import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'

export const designDecisionStatuses = ['proposed', 'accepted', 'rejected', 'superseded'] as const
export type DesignDecisionStatus = (typeof designDecisionStatuses)[number]

type DecisionRecord = Readonly<{
  file: string
  id: string
  title: string
  status: DesignDecisionStatus
  date: string
  appliesTo: readonly string[]
  supersedes: readonly string[]
  supersededBy: readonly string[]
  decision: string
  acceptanceCriteria: string
  consequences: string
}>

export type DesignDecisionValidationOptions = Readonly<{
  root: string
  /** Canonical DD filenames and contents present in the comparison commit. */
  historicalRecords?: ReadonlyMap<string, string>
}>

const requiredMetadata = ['id', 'title', 'status', 'date', 'applies_to', 'supersedes', 'superseded_by'] as const
const requiredSections = ['## Context', '## Decision', '## Acceptance criteria', '## Consequences', '## Verification'] as const
const canonicalFilename = /^DD-\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/
const canonicalId = /^DD-\d{4}$/
const allowedStatuses = new Set<string>(designDecisionStatuses)

function commaList(value: string): string[] {
  return value === 'none' ? [] : value.split(',').map((item) => item.trim()).filter(Boolean)
}

function normalizedAppliesTo(value: string): string[] {
  return value.split(',').map((item) => item.trim().toLocaleLowerCase('en-US')).filter(Boolean)
}

function strictIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function sectionBodies(text: string): Map<string, string> {
  const result = new Map<string, string>()
  const positions = requiredSections.map((heading) => ({ heading, index: text.indexOf(`\n${heading}\n`) }))
  for (let index = 0; index < positions.length; index += 1) {
    const current = positions[index]
    if (current.index < 0) continue
    const start = current.index + current.heading.length + 2
    const next = positions.slice(index + 1).find((candidate) => candidate.index > current.index)
    result.set(current.heading, text.slice(start, next?.index ?? text.length).trim())
  }
  return result
}

function parseRecord(file: string, text: string, errors: string[]): DecisionRecord | null {
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n/)
  if (!frontmatter) {
    errors.push(`${file}: missing metadata block`)
    return null
  }

  const metadata = new Map<string, string>()
  for (const line of frontmatter[1].split('\n')) {
    const separator = line.indexOf(':')
    if (separator <= 0) {
      errors.push(`${file}: invalid metadata line "${line}"`)
      continue
    }
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (metadata.has(key)) errors.push(`${file}: duplicate metadata key ${key}`)
    metadata.set(key, value)
  }

  for (const key of requiredMetadata) if (!metadata.get(key)) errors.push(`${file}: missing metadata ${key}`)
  const id = metadata.get('id') ?? ''
  const expectedId = basename(file).slice(0, 7)
  if (id !== expectedId || !canonicalId.test(id)) errors.push(`${file}: id must match filename prefix ${expectedId}`)
  const title = metadata.get('title') ?? ''
  const statusText = metadata.get('status') ?? ''
  if (!allowedStatuses.has(statusText)) errors.push(`${file}: unsupported status ${statusText}`)
  const status = allowedStatuses.has(statusText) ? statusText as DesignDecisionStatus : 'proposed'
  const date = metadata.get('date') ?? ''
  if (!strictIsoDate(date)) errors.push(`${file}: date must be a real YYYY-MM-DD calendar date`)

  const appliesTo = normalizedAppliesTo(metadata.get('applies_to') ?? '')
  if (appliesTo.length === 0) errors.push(`${file}: applies_to must name at least one surface`)
  const supersedes = commaList(metadata.get('supersedes') ?? 'none')
  const supersededBy = commaList(metadata.get('superseded_by') ?? 'none')
  for (const reference of [...supersedes, ...supersededBy]) if (!canonicalId.test(reference)) errors.push(`${file}: invalid decision reference ${reference}`)

  const bodies = sectionBodies(text)
  for (const section of requiredSections) {
    const body = bodies.get(section)
    if (!body) errors.push(`${file}: missing or empty ${section}`)
  }
  if (!(bodies.get('## Acceptance criteria') ?? '').split('\n').some((line) => /^\s*-\s+\S/.test(line))) {
    errors.push(`${file}: Acceptance criteria requires at least one observable list item`)
  }
  if (!text.includes(`# ${id}: ${title}`)) errors.push(`${file}: heading must match id and title`)

  return {
    file,
    id,
    title,
    status,
    date,
    appliesTo,
    supersedes,
    supersededBy,
    decision: bodies.get('## Decision') ?? '',
    acceptanceCriteria: bodies.get('## Acceptance criteria') ?? '',
    consequences: bodies.get('## Consequences') ?? '',
  }
}

type IndexRow = Readonly<{ id: string; file: string; title: string; status: string; appliesTo: readonly string[] }>

function parseIndex(index: string, errors: string[]): Map<string, IndexRow> {
  const rows = new Map<string, IndexRow>()
  for (const line of index.split('\n')) {
    if (!line.trimStart().startsWith('| [DD-')) continue
    const match = /^\|\s*\[(DD-\d{4})\]\(([^)]+)\)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/.exec(line)
    if (!match) {
      errors.push(`README.md: malformed design-decision index row "${line}"`)
      continue
    }
    const [, id, file, title, status, appliesToText] = match
    if (rows.has(id)) errors.push(`README.md: duplicate index row ${id}`)
    rows.set(id, { id, file, title: title.trim(), status: status.trim(), appliesTo: normalizedAppliesTo(appliesToText) })
  }
  return rows
}

export function designDecisionValidationErrors(options: DesignDecisionValidationOptions): string[] {
  const root = resolve(options.root)
  const indexPath = resolve(root, 'README.md')
  const errors: string[] = []
  if (!existsSync(indexPath)) return ['docs/design-decisions/README.md is missing']

  const allDecisionLikeFiles = readdirSync(root).filter((file) => file.startsWith('DD-'))
  for (const file of allDecisionLikeFiles) if (!canonicalFilename.test(file)) errors.push(`${file}: filename must match DD-NNNN-lowercase-slug.md`)
  const filenames = allDecisionLikeFiles.filter((file) => canonicalFilename.test(file)).sort()
  if (filenames.length === 0) errors.push('at least one DD-NNNN record is required')

  const records = new Map<string, DecisionRecord>()
  for (const file of filenames) {
    const record = parseRecord(file, readFileSync(resolve(root, file), 'utf8'), errors)
    if (!record) continue
    if (records.has(record.id)) errors.push(`${file}: duplicate decision id ${record.id}`)
    records.set(record.id, record)
  }

  const indexRows = parseIndex(readFileSync(indexPath, 'utf8'), errors)
  for (const [id, record] of records) {
    const row = indexRows.get(id)
    if (!row) {
      errors.push(`${record.file}: missing from the design-decision index`)
      continue
    }
    if (row.file !== record.file) errors.push(`README.md: ${id} file must be ${record.file}`)
    if (row.title !== record.title) errors.push(`README.md: ${id} title does not match its record`)
    if (row.status !== record.status) errors.push(`README.md: ${id} status does not match its record`)
    if (row.appliesTo.join('|') !== record.appliesTo.join('|')) errors.push(`README.md: ${id} applies-to list does not match its record`)
  }
  for (const id of indexRows.keys()) if (!records.has(id)) errors.push(`README.md: ${id} index row has no decision file`)

  for (const [id, record] of records) {
    for (const targetId of [...record.supersedes, ...record.supersededBy]) {
      if (targetId === id) errors.push(`${record.file}: cannot reference itself`)
      else if (!records.has(targetId)) errors.push(`${record.file}: references missing decision ${targetId}`)
    }
    if (record.status === 'superseded' && record.supersededBy.length === 0) errors.push(`${record.file}: superseded records require superseded_by`)
    if (record.status !== 'superseded' && record.supersededBy.length > 0) errors.push(`${record.file}: only superseded records may set superseded_by`)
    if (record.status !== 'accepted' && record.supersedes.length > 0) errors.push(`${record.file}: only accepted replacement records may supersede another decision`)

    for (const targetId of record.supersedes) {
      const target = records.get(targetId)
      if (!target) continue
      if (target.status !== 'superseded') errors.push(`${record.file}: superseded target ${targetId} must have status superseded`)
      if (!target.supersededBy.includes(id)) errors.push(`${record.file}: supersession of ${targetId} is not linked back`)
    }
    for (const replacementId of record.supersededBy) {
      const replacement = records.get(replacementId)
      if (!replacement) continue
      if (replacement.status !== 'accepted') errors.push(`${record.file}: replacement ${replacementId} must be accepted`)
      if (!replacement.supersedes.includes(id)) errors.push(`${record.file}: superseded_by ${replacementId} is not reciprocal`)
    }
  }

  const historicalRecords = new Map<string, DecisionRecord>()
  for (const [historicalFile, historicalText] of options.historicalRecords ?? []) {
    if (!historicalFile.startsWith('DD-') || !canonicalFilename.test(historicalFile)) continue
    if (!filenames.includes(historicalFile)) {
      errors.push(`${historicalFile}: historical design decision files cannot be deleted or renamed`)
      continue
    }
    const historicalErrors: string[] = []
    const historical = parseRecord(historicalFile, historicalText, historicalErrors)
    errors.push(...historicalErrors.map((error) => `historical ${error}`))
    if (historical) historicalRecords.set(historicalFile, historical)
  }

  const historicalMaxId = Math.max(0, ...[...historicalRecords.values()].map((record) => Number(record.id.slice(3))))
  for (const record of records.values()) {
    const historical = historicalRecords.get(record.file)
    if (!historical) {
      if (historicalMaxId > 0 && Number(record.id.slice(3)) <= historicalMaxId) {
        errors.push(`${record.file}: new decision IDs must be greater than historical maximum DD-${String(historicalMaxId).padStart(4, '0')}`)
      }
      continue
    }

    if (record.id !== historical.id) errors.push(`${record.file}: historical id is immutable`)
    if (record.title !== historical.title) errors.push(`${record.file}: historical title is immutable`)
    if (record.date !== historical.date) errors.push(`${record.file}: historical date is immutable`)

    const allowedStatus = historical.status === 'proposed'
      ? ['proposed', 'accepted', 'rejected'].includes(record.status)
      : historical.status === 'accepted'
        ? record.status === 'accepted' || record.status === 'superseded'
        : record.status === historical.status
    if (!allowedStatus) errors.push(`${record.file}: invalid historical status transition ${historical.status} -> ${record.status}`)

    // Proposed records may evolve before disposition. Once accepted, rejected,
    // or superseded, outcome fields are historical evidence and are immutable.
    if (historical.status !== 'proposed') {
      if (record.appliesTo.join('|') !== historical.appliesTo.join('|')) errors.push(`${record.file}: historical applies_to is immutable`)
      if (record.supersedes.join('|') !== historical.supersedes.join('|')) errors.push(`${record.file}: historical supersedes is immutable`)
      if (record.decision !== historical.decision) errors.push(`${record.file}: historical Decision outcome is immutable`)
      if (record.acceptanceCriteria !== historical.acceptanceCriteria) errors.push(`${record.file}: historical Acceptance criteria are immutable`)
      if (record.consequences !== historical.consequences) errors.push(`${record.file}: historical Consequences are immutable`)
    }
    if (historical.status !== 'accepted' || record.status !== 'superseded') {
      if (record.supersededBy.join('|') !== historical.supersededBy.join('|')) errors.push(`${record.file}: superseded_by may change only during accepted -> superseded transition`)
    }
  }

  return errors
}

export function validateDesignDecisionDirectory(options: DesignDecisionValidationOptions): number {
  const errors = designDecisionValidationErrors(options)
  if (errors.length > 0) throw new Error(`Design decision validation failed:\n- ${errors.join('\n- ')}`)
  return readdirSync(resolve(options.root)).filter((file) => canonicalFilename.test(file)).length
}
