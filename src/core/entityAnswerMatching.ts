import { allowedDistance, damerauLevenshtein, normalizeAnswer } from './answerMatching'
import { normalizeEntityAbbreviation, type StudyEntity } from './entity'

export type EntityAnswerMatch =
  | Readonly<{ status: 'correct-new'; entity: StudyEntity }>
  | Readonly<{ status: 'duplicate'; entity: StudyEntity }>
  | Readonly<{ status: 'known-non-neighbour'; entity: StudyEntity }>
  | Readonly<{ status: 'ambiguous' | 'invalid' }>

function names(entity: StudyEntity): readonly string[] {
  return [entity.name, ...entity.aliases].map(normalizeAnswer)
}

function abbreviationKeys(entity: StudyEntity): readonly string[] {
  return entity.abbreviations.map(normalizeEntityAbbreviation)
}

/**
 * Matches a country answer against a target's curated neighbour set. Exact
 * names for another study entity take precedence over fuzzy similarity, and a
 * fuzzy result must resolve to one entity only.
 */
export function matchNeighbourAnswer(
  submitted: string,
  neighbourCodes: readonly string[],
  foundCodes: readonly string[],
  entities: readonly StudyEntity[],
  options: Readonly<{ timed?: boolean }> = {},
): EntityAnswerMatch {
  const normalized = normalizeAnswer(submitted)
  if (!normalized) return { status: 'invalid' }
  const byCode = new Map(entities.map((entity) => [entity.code, entity]))
  const compact = normalizeEntityAbbreviation(submitted)
  const abbreviatedEntities = entities.filter((entity) => abbreviationKeys(entity).includes(compact))
  if (abbreviatedEntities.length > 1) return { status: 'ambiguous' }
  if (abbreviatedEntities.length === 1) {
    const entity = abbreviatedEntities[0]
    if (foundCodes.includes(entity.code)) return { status: 'duplicate', entity }
    if (neighbourCodes.includes(entity.code)) return { status: 'correct-new', entity }
    const isPrefixOfMissing = options.timed && neighbourCodes.some((code) => !foundCodes.includes(code) && code !== entity.code && (byCode.get(code) ? names(byCode.get(code)!).some((name) => name.replace(/\s/g, '').startsWith(compact)) : false))
    if (isPrefixOfMissing) return { status: 'invalid' }
    return { status: 'known-non-neighbour', entity }
  }
  // Entity codes are identifiers, never quiz-answer aliases. This happens
  // after the explicit abbreviation lookup because four approved compact
  // spellings intentionally equal their own identifier.
  if (entities.some((entity) => entity.code === compact.toUpperCase())) return { status: 'invalid' }
  const candidateEntities = entities.filter((entity) => names(entity).includes(normalized))
  if (candidateEntities.length > 1) return { status: 'ambiguous' }
  if (candidateEntities.length === 1) {
    const entity = candidateEntities[0]
    if (foundCodes.includes(entity.code)) return { status: 'duplicate', entity }
    if (neighbourCodes.includes(entity.code)) return { status: 'correct-new', entity }
    // A shorter known country name may be only the beginning of the one
    // missing answer (Niger while Nigeria is required). Keep it neutral.
    const isPrefixOfMissing = options.timed && neighbourCodes.some((code) => !foundCodes.includes(code) && code !== entity.code && (byCode.get(code) ? names(byCode.get(code)!).some((name) => name.startsWith(normalized)) : false))
    return isPrefixOfMissing ? { status: 'invalid' } : { status: 'known-non-neighbour', entity }
  }

  const allNames = entities.flatMap((entity) => names(entity).map((name) => ({ entity, name })))
  // Do not auto-accept a partial spelling while the player is still typing.
  if (options.timed && allNames.some(({ name }) => name.startsWith(normalized))) return { status: 'invalid' }
  const fuzzy = new Map<string, StudyEntity>()
  for (const { entity, name } of allNames) {
    if (damerauLevenshtein(normalized, name) <= allowedDistance(name.length)) fuzzy.set(entity.code, entity)
  }
  if (fuzzy.size !== 1) return fuzzy.size > 1 ? { status: 'ambiguous' } : { status: 'invalid' }
  const entity = fuzzy.values().next().value as StudyEntity
  if (foundCodes.includes(entity.code)) return { status: 'duplicate', entity }
  if (!neighbourCodes.includes(entity.code)) return { status: 'known-non-neighbour', entity }
  return { status: 'correct-new', entity }
}
