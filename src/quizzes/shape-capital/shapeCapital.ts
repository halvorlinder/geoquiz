import countryShapesData from '../../data/country-shapes.json'
import { getCountryShape, type CountryShape, type CountryShapeDataset } from '../../core/countryShapes'
import { studyEntities, type StudyEntity } from '../../core/entity'
import { countryCapitalData, countryCapitalQuestions, type CountryCapitalContinent } from '../country-capital/countryCapital'
import type { Capital } from '../../core/capital'
import type { CapitalField, CapitalFieldsQuestion } from '../../components/CapitalFieldsQuiz'

export type ShapeCapitalQuestion = Readonly<CapitalFieldsQuestion & { shape: CountryShape }>

export const shapeCapitalData = Object.freeze({
  entities: studyEntities,
  capitals: countryCapitalData.capitals,
  shapes: countryShapesData as unknown as CountryShapeDataset,
})

function assertExactShapeCoverage(entities: readonly StudyEntity[], shapes: CountryShapeDataset): void {
  const entityCodes = new Set(entities.map((entity) => entity.code))
  const shapeCodes = Object.keys(shapes.shapes)
  if (shapeCodes.length !== entityCodes.size || new Set(shapeCodes).size !== shapeCodes.length) throw new Error('Shape-capital data must contain one shape for every study entity.')
  for (const entity of entities) if (!getCountryShape(shapes, entity.code)) throw new Error(`Shape-capital data is missing shape for ${entity.code}.`)
  for (const code of shapeCodes) if (!entityCodes.has(code)) throw new Error(`Shape-capital data has an unexpected shape for ${code}.`)
}

assertExactShapeCoverage(shapeCapitalData.entities, shapeCapitalData.shapes)

/** Resolves every country-capital question to exactly one audited local silhouette. */
export function shapeCapitalQuestions(
  entities: readonly StudyEntity[],
  capitals: readonly Capital[],
  continent: CountryCapitalContinent = 'All',
): ShapeCapitalQuestion[] {
  return countryCapitalQuestions(entities, capitals, continent).map((question) => {
    const shape = getCountryShape(shapeCapitalData.shapes, question.entity.code)
    if (!shape) throw new Error(`Shape-capital data is missing shape for ${question.entity.code}.`)
    return Object.freeze({ ...question, shape, fields: question.fields as readonly CapitalField[] })
  })
}
