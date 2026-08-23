export const SCOREBOARD_SCHEMA_VERSION = 1
export const SCOREBOARD_LIMIT = 10

export type ScoreboardFilters = Readonly<Record<string, string>>

export type ScoreboardScope = Readonly<{
  quizId: string
  filters: ScoreboardFilters
  /** Current quiz-data version; entries from other versions share the key but never the board. */
  dataVersion: string
}>

export type ScoreboardEntry = Readonly<{
  durationMs: number
  correctCount: number
  revealedCount: number
  totalCount: number
  completedAt: string
  dataVersion: string
}>

export type ScoreboardStorage = Readonly<{
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}>

type ScoreboardPayload = Readonly<{
  schemaVersion: number
  entries: readonly ScoreboardEntry[]
}>

function fail(message: string): never {
  throw new TypeError(`Invalid scoreboard: ${message}`)
}

function canonicalText(value: unknown, label: string): string {
  if (typeof value !== 'string') fail(`${label} must be a string`)
  const canonical = value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
  if (!canonical) fail(`${label} must not be blank`)
  return canonical
}

function isFilterRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  try {
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
  } catch {
    return false
  }
}

function currentDataVersion(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim() !== value) fail('data version must be a nonblank trimmed string')
  return value
}

function canonicalScope(scope: ScoreboardScope): Readonly<{ quizId: string; filters: readonly (readonly [string, string])[]; dataVersion: string }> {
  if (typeof scope !== 'object' || scope === null || Array.isArray(scope)) fail('scope must be an object')
  const quizId = canonicalText(scope.quizId, 'quiz ID')
  if (!isFilterRecord(scope.filters)) fail('filters must be a plain record')

  const seenKeys = new Set<string>()
  const filters = Object.entries(scope.filters).map(([key, value]) => {
    const canonicalKey = canonicalText(key, 'filter key')
    if (seenKeys.has(canonicalKey)) fail(`duplicate canonical filter key "${canonicalKey}"`)
    seenKeys.add(canonicalKey)
    return [canonicalKey, canonicalText(value, `filter "${canonicalKey}"`)] as const
  })
  filters.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
  return Object.freeze({ quizId, filters: Object.freeze(filters), dataVersion: currentDataVersion(scope.dataVersion) })
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function timestampMs(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) return null
  return parsed.valueOf()
}

function isIsoTimestamp(value: unknown): value is string {
  return timestampMs(value) !== null
}

/** Returns true only for a completed, well-formed timed result. */
function parseScoreboardEntry(value: unknown): ScoreboardEntry | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const requiredKeys = ['durationMs', 'correctCount', 'revealedCount', 'totalCount', 'completedAt', 'dataVersion'] as const
  try {
    const ownKeys = Reflect.ownKeys(value)
    if (
      ownKeys.length !== requiredKeys.length ||
      ownKeys.some((key) => typeof key !== 'string' || !requiredKeys.includes(key as (typeof requiredKeys)[number]))
    ) {
      return null
    }

    const descriptors = Object.getOwnPropertyDescriptors(value)
    const fields = requiredKeys.map((key) => descriptors[key])
    if (fields.some((descriptor) => !descriptor || !descriptor.enumerable || !('value' in descriptor))) return null
    const [durationMs, correctCount, revealedCount, totalCount, completedAt, dataVersion] = fields.map(
      (descriptor) => (descriptor as PropertyDescriptor & { value: unknown }).value,
    )
    if (
      !isNonnegativeInteger(durationMs) ||
      !isNonnegativeInteger(correctCount) ||
      !isNonnegativeInteger(revealedCount) ||
      !isNonnegativeInteger(totalCount) ||
      totalCount === 0 ||
      correctCount + revealedCount !== totalCount ||
      !isIsoTimestamp(completedAt) ||
      typeof dataVersion !== 'string' ||
      dataVersion.trim().length === 0
    ) {
      return null
    }
    return Object.freeze({ durationMs, correctCount, revealedCount, totalCount, completedAt, dataVersion })
  } catch {
    return null
  }
}

/** Returns true only for a completed, well-formed timed result. */
export function isValidScoreboardEntry(value: unknown): value is ScoreboardEntry {
  return parseScoreboardEntry(value) !== null
}

function snapshotScoreboardEntries(entries: unknown): ScoreboardEntry[] | null {
  if (!Array.isArray(entries)) return null
  const snapshots: ScoreboardEntry[] = []
  try {
    for (const entry of entries) {
      const snapshot = parseScoreboardEntry(entry)
      if (!snapshot) return null
      snapshots.push(snapshot)
    }
  } catch {
    return null
  }
  return snapshots
}

function parseScoreboardPayload(value: unknown): ScoreboardEntry[] | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  try {
    const ownKeys = Reflect.ownKeys(value)
    if (ownKeys.length !== 2 || ownKeys.some((key) => key !== 'schemaVersion' && key !== 'entries')) return null
    const descriptors = Object.getOwnPropertyDescriptors(value)
    const schemaVersion = descriptors.schemaVersion
    const entries = descriptors.entries
    if (
      !schemaVersion ||
      !entries ||
      !schemaVersion.enumerable ||
      !entries.enumerable ||
      !('value' in schemaVersion) ||
      !('value' in entries) ||
      schemaVersion.value !== SCOREBOARD_SCHEMA_VERSION
    ) {
      return null
    }
    return snapshotScoreboardEntries(entries.value)
  } catch {
    return null
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

/** Best results are more correct first, then quicker, then more recent. */
export function rankScoreboardEntries(entries: readonly ScoreboardEntry[]): ScoreboardEntry[] {
  const snapshots = snapshotScoreboardEntries(entries)
  if (!snapshots) fail('entries must all be completed timed results')
  return snapshots
    .sort((left, right) => {
      if (left.correctCount !== right.correctCount) return right.correctCount - left.correctCount
      if (left.durationMs !== right.durationMs) return left.durationMs - right.durationMs
      const leftCompletedAtMs = timestampMs(left.completedAt)
      const rightCompletedAtMs = timestampMs(right.completedAt)
      if (leftCompletedAtMs === null || rightCompletedAtMs === null) fail('entries must all be completed timed results')
      if (leftCompletedAtMs !== rightCompletedAtMs) return rightCompletedAtMs - leftCompletedAtMs
      const finalLeft = JSON.stringify([left.dataVersion, left.totalCount, left.revealedCount])
      const finalRight = JSON.stringify([right.dataVersion, right.totalCount, right.revealedCount])
      return compareText(finalLeft, finalRight)
    })
    .slice(0, SCOREBOARD_LIMIT)
}

/**
 * Creates a stable, collision-safe key. JSON's arrays preserve boundaries, so
 * values such as `a:b` cannot collide with separate `a` and `b` values.
 */
export function scoreboardKey(scope: ScoreboardScope): string {
  const canonical = canonicalScope(scope)
  return `geoquiz:scoreboard:v${SCOREBOARD_SCHEMA_VERSION}:${JSON.stringify([canonical.quizId, canonical.filters])}`
}

function readPayload(storage: ScoreboardStorage | null | undefined, key: string): ScoreboardEntry[] {
  if (!storage) return []
  try {
    if (typeof storage.getItem !== 'function') return []
    const raw = storage.getItem(key)
    if (raw === null) return []
    const payload: unknown = JSON.parse(raw)
    const entries = parseScoreboardPayload(payload)
    // Keep the complete validated payload here. Callers must filter the active
    // data version before applying the top-ten ranking limit.
    return entries ?? []
  } catch {
    return []
  }
}

export function readScoreboard(storage: ScoreboardStorage | null | undefined, scope: ScoreboardScope): ScoreboardEntry[] {
  const canonical = canonicalScope(scope)
  return rankScoreboardEntries(readPayload(storage, scoreboardKey(scope)).filter((entry) => entry.dataVersion === canonical.dataVersion))
}

/**
 * Adds a completed run and returns the resulting ranking even when persistent
 * storage is disabled or full. The caller can still display the result.
 */
export function recordScoreboardEntry(
  storage: ScoreboardStorage | null | undefined,
  scope: ScoreboardScope,
  entry: ScoreboardEntry,
): ScoreboardEntry[] {
  const entrySnapshot = parseScoreboardEntry(entry)
  if (!entrySnapshot) fail('entry must be a completed timed result')
  const canonical = canonicalScope(scope)
  if (entrySnapshot.dataVersion !== canonical.dataVersion) fail('entry data version must match the current scoreboard scope')
  const key = scoreboardKey(scope)
  const entries = rankScoreboardEntries([...readPayload(storage, key).filter((stored) => stored.dataVersion === entrySnapshot.dataVersion), entrySnapshot])
  if (!storage) return entries

  const payload: ScoreboardPayload = {
    schemaVersion: SCOREBOARD_SCHEMA_VERSION,
    entries,
  }
  try {
    if (typeof storage.setItem !== 'function') return entries
    storage.setItem(key, JSON.stringify(payload))
  } catch {
    // Storage may be disabled, unavailable, or out of quota. Gameplay remains local.
  }
  return entries
}
