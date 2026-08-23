import { isTimedCapitalAnswerAccepted } from '../../core/answerMatching'
import type { Capital } from '../../core/capital'
import { getEntityByCode, type Continent } from '../../core/entity'

export const capitalMapModes = ['practice', 'timed'] as const
export type CapitalMapMode = (typeof capitalMapModes)[number]

export const capitalMapContinents = ['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const
export type CapitalMapContinent = (typeof capitalMapContinents)[number]

export type CapitalStatus = 'pending' | 'correct' | 'revealed'

/**
 * A shared capital place belongs in a continent deck when at least one of its
 * study-entity associations belongs there. Unknown associations deliberately
 * do not create a question in a filtered deck.
 */
export function capitalMatchesContinent(
  capital: Capital,
  continent: CapitalMapContinent,
  findContinent: (code: string) => Continent | undefined = (code) => getEntityByCode(code)?.continent,
): boolean {
  if (continent === 'All') return true
  return capital.entities.some((entity) => findContinent(entity.code) === continent)
}

export function capitalsForContinent(
  capitals: readonly Capital[],
  continent: CapitalMapContinent,
  findContinent?: (code: string) => Continent | undefined,
): Capital[] {
  return capitals.filter((capital) => capitalMatchesContinent(capital, continent, findContinent))
}

/**
 * Timed typing may accept legitimate exact answers and typos, but never a
 * fuzzy match that is still a strict prefix of one of the target's names.
 */
export { isTimedCapitalAnswerAccepted }
