import { describe, expect, it } from 'vitest'
import { countryCapitalData, countryCapitalQuestions, entitiesForCountryCapitalContinent } from './countryCapital'

describe('country-capital question catalog', () => {
  it('resolves one question for each of the 197 study entities', () => {
    const questions = countryCapitalQuestions(countryCapitalData.entities, countryCapitalData.capitals)
    expect(questions).toHaveLength(197)
    expect(new Set(questions.map((question) => question.id)).size).toBe(197)
  })

  it('uses the catalog continent assignments and preserves required role labels', () => {
    expect(entitiesForCountryCapitalContinent(countryCapitalData.entities, 'Africa')).toHaveLength(54)
    expect(entitiesForCountryCapitalContinent(countryCapitalData.entities, 'Asia')).toHaveLength(48)
    expect(entitiesForCountryCapitalContinent(countryCapitalData.entities, 'Europe')).toHaveLength(46)
    expect(entitiesForCountryCapitalContinent(countryCapitalData.entities, 'North America')).toHaveLength(23)
    expect(entitiesForCountryCapitalContinent(countryCapitalData.entities, 'South America')).toHaveLength(12)
    expect(entitiesForCountryCapitalContinent(countryCapitalData.entities, 'Oceania')).toHaveLength(14)
    const byId = new Map(countryCapitalQuestions(countryCapitalData.entities, countryCapitalData.capitals).map((question) => [question.id, question]))
    expect(byId.get('ZAF')?.fields.map((field) => [field.role, field.capital.capital]).sort()).toEqual([
      ['Administrative', 'Pretoria'], ['Legislative', 'Cape Town'], ['Judicial', 'Bloemfontein'],
    ].sort())
    expect(byId.get('BOL')?.fields.map((field) => [field.role, field.capital.capital]).sort()).toEqual([['Constitutional capital', 'Sucre'], ['Seat of government', 'La Paz']].sort())
    expect(byId.get('SWZ')?.fields.map((field) => [field.role, field.capital.capital]).sort()).toEqual([['Administrative', 'Mbabane'], ['Royal and legislative', 'Lobamba']].sort())
  })
})
