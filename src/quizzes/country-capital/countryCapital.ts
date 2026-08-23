import capitalsData from '../../data/capitals.json'
import { checkCapitalAnswer, isTimedCapitalAnswerAccepted } from '../../core/answerMatching'
import type { Capital } from '../../core/capital'
import { studyEntities, type StudyEntity } from '../../core/entity'

export const countryCapitalModes = ['practice', 'timed'] as const
export type CountryCapitalMode = (typeof countryCapitalModes)[number]

export const countryCapitalContinents = ['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const
export type CountryCapitalContinent = (typeof countryCapitalContinents)[number]

export type CountryCapitalField = Readonly<{
  capital: Capital
  role: string
}>

export type CountryCapitalQuestion = Readonly<{
  id: string
  entity: StudyEntity
  fields: readonly CountryCapitalField[]
}>

export const COUNTRY_CAPITAL_CAPITAL_DATA_VERSION = 'capital-data-v1'

export const countryCapitalData = {
  entities: studyEntities,
  capitals: capitalsData as Capital[],
}

export function entitiesForCountryCapitalContinent(
  entities: readonly StudyEntity[],
  continent: CountryCapitalContinent,
): StudyEntity[] {
  return continent === 'All' ? [...entities] : entities.filter((entity) => entity.continent === continent)
}

/** Resolves catalog role assignments without copying answer strings into entity data. */
export function countryCapitalQuestions(
  entities: readonly StudyEntity[],
  capitals: readonly Capital[],
  continent: CountryCapitalContinent = 'All',
): CountryCapitalQuestion[] {
  const capitalsById = new Map(capitals.map((capital) => [capital.id, capital]))
  return entitiesForCountryCapitalContinent(entities, continent).map((entity) => {
    const fields = entity.capitals.map((assignment) => {
      const capital = capitalsById.get(assignment.id)
      if (!capital) throw new Error(`Country-capital data is missing capital "${assignment.id}" for ${entity.code}`)
      return Object.freeze({ capital, role: assignment.role })
    })
    if (fields.length === 0) throw new Error(`Country-capital data has no capital assignments for ${entity.code}`)
    return Object.freeze({ id: entity.code, entity, fields: Object.freeze(fields) })
  })
}

export function isCountryCapitalAnswerCorrect(
  submitted: string,
  field: CountryCapitalField,
  allCapitals: readonly Capital[],
): boolean {
  return checkCapitalAnswer(submitted, field.capital, allCapitals).status === 'correct'
}

export function isTimedCountryCapitalAnswerAccepted(
  submitted: string,
  field: CountryCapitalField,
  allCapitals: readonly Capital[],
): boolean {
  return isTimedCapitalAnswerAccepted(submitted, field.capital, allCapitals)
}
