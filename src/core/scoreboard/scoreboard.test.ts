import { describe, expect, it } from 'vitest'
import {
  SCOREBOARD_LIMIT,
  isValidScoreboardEntry,
  rankScoreboardEntries,
  readScoreboard,
  recordScoreboardEntry,
  scoreboardKey,
  type ScoreboardEntry,
  type ScoreboardStorage,
} from './scoreboard'

const scope = { quizId: 'capital-map', filters: { continent: 'All' }, dataVersion: 'capitals-v1' }

function entry(overrides: Partial<ScoreboardEntry> = {}): ScoreboardEntry {
  return {
    durationMs: 1_000,
    correctCount: 4,
    revealedCount: 1,
    totalCount: 5,
    completedAt: '2026-08-20T12:00:00.000Z',
    dataVersion: 'capitals-v1',
    ...overrides,
  }
}

function memoryStorage(seed: Record<string, string> = {}): ScoreboardStorage & { values: Map<string, string> } {
  const values = new Map(Object.entries(seed))
  return {
    values,
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

describe('scoreboard keys', () => {
  it('canonicalizes filters independent of insertion order without ambiguous collisions', () => {
    expect(scoreboardKey({ quizId: ' Capital Map ', filters: { territoryScope: 'Without', continent: 'Europe' }, dataVersion: 'v1' })).toBe(
      scoreboardKey({ quizId: 'capital map', filters: { continent: ' europe ', territoryScope: 'without' }, dataVersion: 'v2' }),
    )
    expect(scoreboardKey({ quizId: 'a:b', filters: { c: 'd' }, dataVersion: 'v1' })).not.toBe(
      scoreboardKey({ quizId: 'a', filters: { 'b:c': 'd' }, dataVersion: 'v1' }),
    )
    expect(() => scoreboardKey({ quizId: '', filters: {}, dataVersion: 'v1' })).toThrow('quiz ID')
    expect(() => scoreboardKey({ quizId: 'quiz', filters: { ' continent ': 'all', continent: 'europe' }, dataVersion: 'v1' })).toThrow(
      'duplicate canonical filter key',
    )
    expect(() => scoreboardKey({ quizId: 'quiz', filters: Object.create({ continent: 'all' }), dataVersion: 'v1' })).toThrow(
      'plain record',
    )
    expect(() => scoreboardKey({ quizId: 'quiz', filters: ['all'] as never, dataVersion: 'v1' })).toThrow('plain record')

    const nullPrototypeFilters = Object.create(null) as Record<string, string>
    nullPrototypeFilters.__proto__ = 'included'
    nullPrototypeFilters.continent = 'all'
    expect(scoreboardKey({ quizId: 'quiz', filters: nullPrototypeFilters, dataVersion: 'v1' })).toContain('"__proto__"')
  })
})

describe('scoreboard validation and ranking', () => {
  it('only accepts completed, exact-schema results', () => {
    expect(isValidScoreboardEntry(entry())).toBe(true)
    expect(isValidScoreboardEntry(entry({ correctCount: 3 }))).toBe(false)
    expect(isValidScoreboardEntry(entry({ totalCount: 0, correctCount: 0, revealedCount: 0 }))).toBe(false)
    expect(isValidScoreboardEntry(entry({ durationMs: -1 }))).toBe(false)
    expect(isValidScoreboardEntry({ ...entry(), extra: true })).toBe(false)
    expect(isValidScoreboardEntry(entry({ completedAt: '2026-08-20' }))).toBe(false)
    expect(isValidScoreboardEntry(entry({ dataVersion: ' ' }))).toBe(false)

    const inheritedWithExtraOwn = Object.create(entry()) as Record<string, unknown>
    inheritedWithExtraOwn.extra = true
    expect(isValidScoreboardEntry(inheritedWithExtraOwn)).toBe(false)

    const symbolExtra = { ...entry(), [Symbol('extra')]: true }
    expect(isValidScoreboardEntry(symbolExtra)).toBe(false)

    const nonEnumerableExtra = { ...entry() }
    Object.defineProperty(nonEnumerableExtra, 'extra', { value: true })
    expect(isValidScoreboardEntry(nonEnumerableExtra)).toBe(false)

    const throwingGetter = { ...entry() }
    Object.defineProperty(throwingGetter, 'durationMs', {
      enumerable: true,
      get() {
        throw new Error('must not escape')
      },
    })
    expect(() => isValidScoreboardEntry(throwingGetter)).not.toThrow()
    expect(isValidScoreboardEntry(throwingGetter)).toBe(false)

    const throwingProxy = new Proxy(entry(), {
      ownKeys() {
        throw new Error('must not escape')
      },
    })
    expect(() => isValidScoreboardEntry(throwingProxy)).not.toThrow()
    expect(isValidScoreboardEntry(throwingProxy)).toBe(false)
  })

  it('snapshots descriptor values before ranking or recording a proxy entry', () => {
    const source = entry()
    const descriptorBackedProxy = new Proxy(
      {},
      {
        ownKeys() {
          return Object.keys(source)
        },
        getOwnPropertyDescriptor(_target, key) {
          const descriptor = Object.getOwnPropertyDescriptor(source, key)
          return descriptor ? { ...descriptor, configurable: true } : undefined
        },
        get() {
          throw new Error('entry getter must not escape')
        },
      },
    ) as ScoreboardEntry
    expect(isValidScoreboardEntry(descriptorBackedProxy)).toBe(true)
    expect(() => rankScoreboardEntries([descriptorBackedProxy])).not.toThrow()
    expect(rankScoreboardEntries([descriptorBackedProxy])).toEqual([entry()])

    const storage = memoryStorage()
    expect(() => recordScoreboardEntry(storage, scope, descriptorBackedProxy)).not.toThrow()
    expect(readScoreboard(storage, scope)).toEqual([entry()])
  })

  it('ranks by correct count, duration, recent completion, then stable fields and limits to ten', () => {
    const results = rankScoreboardEntries([
      entry({ correctCount: 3, revealedCount: 2, durationMs: 100 }),
      entry({ correctCount: 4, revealedCount: 1, durationMs: 900, completedAt: '2026-08-20T11:00:00.000Z' }),
      entry({ correctCount: 4, revealedCount: 1, durationMs: 900, completedAt: '2026-08-20T13:00:00.000Z' }),
      entry({ correctCount: 4, revealedCount: 1, durationMs: 900, completedAt: '2026-08-20T13:00:00.000Z', dataVersion: 'z' }),
      ...Array.from({ length: 10 }, (_, index) =>
        entry({ correctCount: 0, revealedCount: 5, durationMs: index, completedAt: `2026-08-19T00:00:0${index}.000Z` }),
      ),
    ])
    expect(results).toHaveLength(SCOREBOARD_LIMIT)
    expect(results.slice(0, 4).map(({ completedAt, dataVersion }) => [completedAt, dataVersion])).toEqual([
      ['2026-08-20T13:00:00.000Z', 'capitals-v1'],
      ['2026-08-20T13:00:00.000Z', 'z'],
      ['2026-08-20T11:00:00.000Z', 'capitals-v1'],
      ['2026-08-20T12:00:00.000Z', 'capitals-v1'],
    ])

    const extendedYear = rankScoreboardEntries([
      entry({ completedAt: '2026-08-20T12:00:00.000Z' }),
      entry({ completedAt: '+010000-01-01T00:00:00.000Z' }),
    ])
    expect(extendedYear[0]?.completedAt).toBe('+010000-01-01T00:00:00.000Z')
  })
})

describe('scoreboard storage', () => {
  it('persists a valid versioned payload and returns its ranking', () => {
    const storage = memoryStorage()
    const results = recordScoreboardEntry(storage, scope, entry())
    expect(results).toEqual([entry()])
    expect(readScoreboard(storage, scope)).toEqual([entry()])
    expect(JSON.parse(storage.values.get(scoreboardKey(scope)) ?? '')).toEqual({
      schemaVersion: 1,
      entries: [entry()],
    })
  })

  it('filters stale data versions on read and prunes them when recording a current run', () => {
    const key = scoreboardKey(scope)
    const storage = memoryStorage({ [key]: JSON.stringify({ schemaVersion: 1, entries: [entry({ dataVersion: 'old-data', durationMs: 1 }), entry()] }) })
    expect(readScoreboard(storage, scope)).toEqual([entry()])
    const current = entry({ durationMs: 2_000, completedAt: '2026-08-21T12:00:00.000Z' })
    expect(recordScoreboardEntry(storage, scope, current)).toEqual([entry(), current])
    expect(JSON.parse(storage.values.get(key) ?? '').entries).toEqual([entry(), current])
    expect(() => recordScoreboardEntry(storage, scope, entry({ dataVersion: 'wrong' }))).toThrow('data version')
    expect(() => readScoreboard(storage, { ...scope, dataVersion: ' stale ' })).toThrow('data version')
  })

  it('filters the complete payload before top-ten ranking so stale results cannot evict current ones', () => {
    const key = scoreboardKey(scope)
    const stale = Array.from({ length: 10 }, (_, index) => entry({ dataVersion: 'stale', correctCount: 5, revealedCount: 0, durationMs: index, completedAt: `2026-08-2${index}T12:00:00.000Z` }))
    const current = entry({ durationMs: 9_999, completedAt: '2026-08-30T12:00:00.000Z' })
    const storage = memoryStorage({ [key]: JSON.stringify({ schemaVersion: 1, entries: [...stale, current] }) })
    expect(readScoreboard(storage, scope)).toEqual([current])
    const next = entry({ durationMs: 8_888, completedAt: '2026-08-31T12:00:00.000Z' })
    expect(recordScoreboardEntry(storage, scope, next)).toEqual([next, current])
    expect(JSON.parse(storage.values.get(key) ?? '').entries).toEqual([next, current])
  })

  it('treats unavailable, throwing, corrupt, stale, and invalid storage as an empty board', () => {
    expect(readScoreboard(undefined, scope)).toEqual([])
    const throwingRead: ScoreboardStorage = {
      getItem() {
        throw new DOMException('blocked', 'SecurityError')
      },
      setItem() {},
    }
    expect(readScoreboard(throwingRead, scope)).toEqual([])

    const getterThrowingRead = Object.defineProperty({}, 'getItem', {
      get() {
        throw new DOMException('blocked', 'SecurityError')
      },
    }) as ScoreboardStorage
    expect(readScoreboard(getterThrowingRead, scope)).toEqual([])

    const key = scoreboardKey(scope)
    for (const raw of ['{bad json', JSON.stringify({ schemaVersion: 0, entries: [entry()] }), JSON.stringify({ schemaVersion: 1, entries: [{ nope: true }] })]) {
      expect(readScoreboard(memoryStorage({ [key]: raw }), scope)).toEqual([])
    }
  })

  it('returns an in-memory ranking when writes throw or run out of quota', () => {
    const throwingWrite: ScoreboardStorage = {
      getItem() {
        return null
      },
      setItem() {
        throw new DOMException('full', 'QuotaExceededError')
      },
    }
    expect(recordScoreboardEntry(throwingWrite, scope, entry())).toEqual([entry()])
    const getterThrowingWrite = {
      getItem() {
        return null
      },
      get setItem() {
        throw new DOMException('blocked', 'SecurityError')
      },
    } as unknown as ScoreboardStorage
    expect(recordScoreboardEntry(getterThrowingWrite, scope, entry())).toEqual([entry()])
    expect(recordScoreboardEntry(undefined, scope, entry())).toEqual([entry()])
    expect(() => recordScoreboardEntry(undefined, scope, entry({ revealedCount: 0 }))).toThrow('completed timed result')
  })
})
