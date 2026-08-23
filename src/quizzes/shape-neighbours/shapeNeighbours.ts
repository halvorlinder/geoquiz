import countryShapesData from '../../data/country-shapes.json'
import { getCountryShape, type CountryShape, type CountryShapeDataset } from '../../core/countryShapes'
import { type Continent, studyEntities, type StudyEntity } from '../../core/entity'
import { getEligibleNeighbourEntityCodes, getNeighbourCodes } from '../../core/neighbours'

export const neighbourContinents = ['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const
export type NeighbourContinent = (typeof neighbourContinents)[number]

export type ShapeNeighboursQuestion = Readonly<{
  id: string
  entity: StudyEntity
  shape: CountryShape
  neighbourCodes: readonly string[]
}>

const shapes = countryShapesData as unknown as CountryShapeDataset
const eligible = new Set(getEligibleNeighbourEntityCodes())

/** Returns only entities with both a curated neighbour answer set and a local silhouette. */
export function shapeNeighboursQuestions(
  entities: readonly StudyEntity[] = studyEntities,
  continent: NeighbourContinent = 'All',
): ShapeNeighboursQuestion[] {
  return entities.flatMap((entity) => {
    if (!eligible.has(entity.code) || (continent !== 'All' && entity.continent !== continent)) return []
    const shape = getCountryShape(shapes, entity.code)
    const neighbourCodes = getNeighbourCodes(entity.code)
    if (!shape || !neighbourCodes || neighbourCodes.length === 0) return []
    return [Object.freeze({ id: `shape-neighbours:${entity.code}`, entity, shape, neighbourCodes })]
  })
}

export function shapeNeighbourQuestionCounts(entities: readonly StudyEntity[] = studyEntities): Readonly<Record<NeighbourContinent, number>> {
  return Object.freeze(Object.fromEntries(neighbourContinents.map((continent) => [continent, shapeNeighboursQuestions(entities, continent).length])) as Record<NeighbourContinent, number>)
}

export function entityForNeighbourCode(code: string, entities: readonly StudyEntity[] = studyEntities): StudyEntity | undefined {
  return entities.find((entity) => entity.code === code)
}

export function isNeighbourContinent(value: string): value is Continent { return value !== 'All' && neighbourContinents.includes(value as NeighbourContinent) }
