import { allowedDistance, damerauLevenshtein, normalizeAnswer } from '../../core/answerMatching'
import { getEntityByCode, type Continent } from '../../core/entity'
import { flagRecordsForScope, type FlagRecord, type FlagScope } from '../../core/flags'
import { territoryContinentForFlag } from '../../core/flagTerritoryContinentPolicy'

export const flagContinents = ['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const
export type FlagContinent = (typeof flagContinents)[number]
export type FlagCountryQuestion = Readonly<{ id: string; flag: FlagRecord; continent: Continent }>
export type FlagAnswerStatus = 'correct' | 'known-other' | 'prefix' | 'ambiguous' | 'invalid'

export function flagRecordContinent(record: FlagRecord): Continent {
  const continent = record.scope === 'sovereign' ? getEntityByCode(record.id)?.continent : territoryContinentForFlag(record.id)
  if (!continent) throw new Error(`Flag record ${record.id} has no explicit continent policy.`)
  return continent
}

/** Scope composition occurs before this filter, preserving the documented deck policy. */
export function flagCountryQuestions(scope: FlagScope = 'without-territories', continent: FlagContinent = 'All'): readonly FlagCountryQuestion[] {
  return flagRecordsForScope(scope)
    .filter((record) => continent === 'All' || flagRecordContinent(record) === continent)
    .map((flag) => Object.freeze({ id: flag.id, flag, continent: flagRecordContinent(flag) }))
}

/** Sovereigns retain their established entity-study spellings; territories use their flag catalog spellings. */
export function flagAnswerNames(record: FlagRecord): readonly string[] {
  const entity = record.scope === 'sovereign' ? getEntityByCode(record.id) : undefined
  return [...new Set([record.name, ...record.aliases, ...(entity ? [entity.name, ...entity.aliases] : [])].map(normalizeAnswer))]
}

export function flagAnswerCorpus(): readonly Readonly<{ record: FlagRecord; name: string }>[] {
  return flagRecordsForScope('with-territories').flatMap((record) => flagAnswerNames(record).map((name) => Object.freeze({ record, name })))
}

/**
 * Collision-safe matching over the complete 235-record catalog. Exact known
 * answers for a different flag always win over fuzzy matching. Timed prefix
 * detection deliberately waits for a finished answer (for example Niger/Nigeria).
 */
export function matchFlagCountryAnswer(submitted: string, target: FlagRecord, options: Readonly<{ timed?: boolean }> = {}): FlagAnswerStatus {
  const normalized = normalizeAnswer(submitted)
  if (!normalized) return 'invalid'
  const corpus = flagAnswerCorpus()
  const exact = [...new Map(corpus.filter(({ name }) => name === normalized).map(({ record }) => [record.id, record])).values()]
  if (exact.length > 1) return 'ambiguous'
  if (exact.length === 1) {
    // Even an exact short name waits in timed mode if it can still become a
    // different catalog answer (Niger/Nigeria is the canonical example).
    if (options.timed && corpus.some(({ record, name }) => record.id !== exact[0].id && name.startsWith(normalized))) return 'prefix'
    return exact[0].id === target.id ? 'correct' : 'known-other'
  }
  const allNames = corpus
  if (options.timed && allNames.some(({ name }) => name.startsWith(normalized))) return 'prefix'
  const matches = new Map<string, FlagRecord>()
  for (const { record, name } of allNames) if (damerauLevenshtein(normalized, name) <= allowedDistance(name.length)) matches.set(record.id, record)
  if (matches.size !== 1) return matches.size > 1 ? 'ambiguous' : 'invalid'
  const matched = matches.values().next().value as FlagRecord
  return matched.id === target.id ? 'correct' : 'known-other'
}

export function isFlagCountryAnswerCorrect(submitted: string, target: FlagRecord): boolean { return matchFlagCountryAnswer(submitted, target) === 'correct' }
export function isTimedFlagCountryAnswerAccepted(submitted: string, target: FlagRecord): boolean { return matchFlagCountryAnswer(submitted, target, { timed: true }) === 'correct' }

/** Enter may disambiguate an exact target spelling, never a fuzzy or other-record answer. */
export function isTimedFlagCountryExactSubmitAccepted(submitted: string, target: FlagRecord): boolean {
  const normalized = normalizeAnswer(submitted)
  if (!normalized) return false
  const matched = [...new Set(flagAnswerCorpus().filter(({ name }) => name === normalized).map(({ record }) => record.id))]
  return matched.length === 1 && matched[0] === target.id
}
