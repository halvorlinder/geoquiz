import { allowedDistance, damerauLevenshtein, normalizeAnswer } from '../../core/answerMatching'
import { getEntityByCode, normalizeEntityAbbreviation, studyEntities, type Continent } from '../../core/entity'
import { flagRecordsForScope, type FlagRecord, type FlagScope } from '../../core/flags'
import { territoryContinentForFlag } from '../../core/flagTerritoryContinentPolicy'

export const flagContinents = ['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const
export type FlagContinent = (typeof flagContinents)[number]
export type FlagCountryQuestion = Readonly<{ id: string; flag: FlagRecord; continent: Continent }>
export type FlagAnswerStatus = 'correct' | 'known-other' | 'prefix' | 'ambiguous' | 'invalid'
export type FlagAnswerCandidate = Readonly<{ record: FlagRecord; name: string; exactOnly: boolean }>

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

/** Sovereigns retain their entity-study spellings; territories use their flag catalog spellings. */
export function flagAnswerNames(record: FlagRecord): readonly string[] {
  return flagAnswerCandidates(record).map((candidate) => candidate.name)
}

/**
 * A candidate retains whether it is an exact-only compact abbreviation. This
 * prevents an acronym from entering the ordinary fuzzy spelling corpus.
 */
export function flagAnswerCandidates(record: FlagRecord): readonly FlagAnswerCandidate[] {
  const entity = record.scope === 'sovereign' ? getEntityByCode(record.id) : undefined
  const ordinary = [record.name, ...record.aliases, ...(entity ? [entity.name, ...entity.aliases] : [])]
    .map(normalizeAnswer)
    .map((name) => Object.freeze({ record, name, exactOnly: false }))
  const abbreviations = (entity?.abbreviations ?? [])
    .map(normalizeEntityAbbreviation)
    .map((name) => Object.freeze({ record, name, exactOnly: true }))
  const unique = new Map<string, FlagAnswerCandidate>()
  for (const candidate of [...ordinary, ...abbreviations]) unique.set(`${candidate.exactOnly}:${candidate.name}`, candidate)
  return Object.freeze([...unique.values()])
}

export function flagAnswerCorpus(): readonly FlagAnswerCandidate[] {
  return Object.freeze(flagRecordsForScope('with-territories').flatMap((record) => flagAnswerCandidates(record)))
}

function exactCandidates(submitted: string, corpus: readonly FlagAnswerCandidate[]): readonly FlagAnswerCandidate[] {
  const normalized = normalizeAnswer(submitted)
  const compact = normalizeEntityAbbreviation(submitted)
  return corpus.filter((candidate) => candidate.exactOnly ? candidate.name === compact : candidate.name === normalized)
}

function isPrefixCandidate(submitted: string, candidate: FlagAnswerCandidate): boolean {
  const key = normalizeEntityAbbreviation(submitted)
  return Boolean(key) && normalizeEntityAbbreviation(candidate.name).startsWith(key)
}

function exactStatus(candidates: readonly FlagAnswerCandidate[], target: FlagRecord, options: Readonly<{ timed?: boolean }>, submitted: string, corpus: readonly FlagAnswerCandidate[]): FlagAnswerStatus | undefined {
  const exact = [...new Map(candidates.map(({ record }) => [record.id, record])).values()]
  if (exact.length > 1) return 'ambiguous'
  if (exact.length !== 1) return undefined
  if (options.timed && corpus.some((candidate) => candidate.record.id !== exact[0].id && isPrefixCandidate(submitted, candidate))) return 'prefix'
  return exact[0].id === target.id ? 'correct' : 'known-other'
}

/** Returns every record that would own this exact submitted answer. */
export function flagExactAnswerOwners(submitted: string): readonly string[] {
  if (!normalizeAnswer(submitted)) return []
  const corpus = flagAnswerCorpus()
  const abbreviations = exactCandidates(submitted, corpus).filter((candidate) => candidate.exactOnly)
  const abbreviationOwners = [...new Set(abbreviations.map(({ record }) => record.id))]
  if (abbreviationOwners.length) return abbreviationOwners
  if (studyEntities.some((entity) => entity.code === normalizeEntityAbbreviation(submitted).toUpperCase())) return []
  return [...new Set(exactCandidates(submitted, corpus).filter((candidate) => !candidate.exactOnly).map(({ record }) => record.id))]
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
  // Curated abbreviations take precedence over identifier rejection because
  // BIH, FSM, PNG, and USA deliberately equal their own entity codes.
  const abbreviationStatus = exactStatus(exactCandidates(submitted, corpus).filter((candidate) => candidate.exactOnly), target, options, submitted, corpus)
  if (abbreviationStatus) return abbreviationStatus
  if (studyEntities.some((entity) => entity.code === normalizeEntityAbbreviation(submitted).toUpperCase())) return 'invalid'
  const ordinaryStatus = exactStatus(exactCandidates(submitted, corpus).filter((candidate) => !candidate.exactOnly), target, options, submitted, corpus)
  if (ordinaryStatus) return ordinaryStatus
  const allNames = corpus
  if (options.timed && allNames.some((candidate) => isPrefixCandidate(submitted, candidate))) return 'prefix'
  const matches = new Map<string, FlagRecord>()
  for (const { record, name, exactOnly } of allNames) if (!exactOnly && damerauLevenshtein(normalized, name) <= allowedDistance(name.length)) matches.set(record.id, record)
  if (matches.size !== 1) return matches.size > 1 ? 'ambiguous' : 'invalid'
  const matched = matches.values().next().value as FlagRecord
  return matched.id === target.id ? 'correct' : 'known-other'
}

export function isFlagCountryAnswerCorrect(submitted: string, target: FlagRecord): boolean { return matchFlagCountryAnswer(submitted, target) === 'correct' }
export function isTimedFlagCountryAnswerAccepted(submitted: string, target: FlagRecord): boolean { return matchFlagCountryAnswer(submitted, target, { timed: true }) === 'correct' }

/** Enter may disambiguate an exact target spelling, never a fuzzy or other-record answer. */
export function isTimedFlagCountryExactSubmitAccepted(submitted: string, target: FlagRecord): boolean {
  if (!normalizeAnswer(submitted)) return false
  const corpus = flagAnswerCorpus()
  const abbreviations = exactCandidates(submitted, corpus).filter((candidate) => candidate.exactOnly)
  const abbreviationMatches = [...new Set(abbreviations.map(({ record }) => record.id))]
  if (abbreviationMatches.length) return abbreviationMatches.length === 1 && abbreviationMatches[0] === target.id
  if (studyEntities.some((entity) => entity.code === normalizeEntityAbbreviation(submitted).toUpperCase())) return false
  const matched = [...new Set(exactCandidates(submitted, corpus).filter((candidate) => !candidate.exactOnly).map(({ record }) => record.id))]
  return matched.length === 1 && matched[0] === target.id
}
