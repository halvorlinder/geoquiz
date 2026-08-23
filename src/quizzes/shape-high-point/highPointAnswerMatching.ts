import { allowedDistance, damerauLevenshtein, normalizeAnswer } from '../../core/answerMatching'
import type { HighPointRecord } from '../../core/highPoints'

export type HighPointAnswerMatch = Readonly<{ accepted: boolean; reason: 'blank' | 'exact' | 'fuzzy' | 'prefix' | 'collision' | 'incorrect' }>

function names(record: HighPointRecord): readonly string[] {
  return [record.label, ...record.aliases].map(normalizeAnswer)
}

function samePhysicalAnswer(target: HighPointRecord, candidate: HighPointRecord): boolean {
  return target.code === candidate.code || (target.sharedFeatureId !== undefined && target.sharedFeatureId === candidate.sharedFeatureId)
}

/**
 * Matches a highest-point answer without allowing another country's known
 * answer to become a typo. Explicit shared-feature records are the sole
 * intentional cross-entity collision exception.
 */
export function matchHighPointAnswer(submitted: string, target: HighPointRecord, corpus: readonly HighPointRecord[], timed = false): HighPointAnswerMatch {
  const normalized = normalizeAnswer(submitted)
  if (!normalized) return { accepted: false, reason: 'blank' }
  const allNames = corpus.flatMap((record) => names(record).map((name) => ({ record, name })))
  const exact = allNames.filter(({ name }) => name === normalized)
  if (exact.some(({ record }) => !samePhysicalAnswer(target, record))) return { accepted: false, reason: 'collision' }
  const targetExact = exact.some(({ record }) => samePhysicalAnswer(target, record))
  if (targetExact) {
    const unsafeLongerName = timed && allNames.some(({ record, name }) => !samePhysicalAnswer(target, record) && name.startsWith(normalized) && name !== normalized)
    return unsafeLongerName ? { accepted: false, reason: 'prefix' } : { accepted: true, reason: 'exact' }
  }
  if (timed && allNames.some(({ name }) => name.startsWith(normalized))) return { accepted: false, reason: 'prefix' }
  const candidates = new Map<string, HighPointRecord>()
  for (const { record, name } of allNames) if (damerauLevenshtein(normalized, name) <= allowedDistance(name.length)) candidates.set(record.code, record)
  if (!candidates.size) return { accepted: false, reason: 'incorrect' }
  if (![...candidates.values()].every((record) => samePhysicalAnswer(target, record)) || ![...candidates.values()].some((record) => record.code === target.code)) return { accepted: false, reason: 'collision' }
  return { accepted: true, reason: 'fuzzy' }
}

export function isHighPointAnswerCorrect(submitted: string, target: HighPointRecord, corpus: readonly HighPointRecord[]): boolean {
  return matchHighPointAnswer(submitted, target, corpus).accepted
}

export function isTimedHighPointAnswerAccepted(submitted: string, target: HighPointRecord, corpus: readonly HighPointRecord[]): boolean {
  return matchHighPointAnswer(submitted, target, corpus, true).accepted
}
