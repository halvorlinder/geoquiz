import countryShapesData from '../../data/country-shapes.json'
import { coordinateRelationToShape, createShapeCoordinateFrame, getCountryShape, projectCoordinateToFrame, type CountryShape, type CountryShapeDataset, type ShapeCoordinateFrame, type ShapePointRelation } from '../../core/countryShapes'
import { type Continent, studyEntities, type StudyEntity } from '../../core/entity'
import { allHighPoints, getHighPoint, type HighPointRecord } from '../../core/highPoints'

export const highPointContinents = ['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const
export type HighPointContinent = (typeof highPointContinents)[number]

export type ShapeHighPointQuestion = Readonly<{
  id: string
  entity: StudyEntity
  shape: CountryShape
  highPoint: HighPointRecord
  frame: ShapeCoordinateFrame
  marker: readonly [number, number]
  markerRelation: ShapePointRelation
}>

const shapes = countryShapesData as unknown as CountryShapeDataset

/** Resolves the exact local data join and frames an unmodified sourced coordinate. */
export function shapeHighPointQuestions(entities: readonly StudyEntity[] = studyEntities, continent: HighPointContinent = 'All'): ShapeHighPointQuestion[] {
  return entities.flatMap((entity) => {
    if (continent !== 'All' && entity.continent !== continent) return []
    const shape = getCountryShape(shapes, entity.code)
    const highPoint = getHighPoint(entity.code)
    if (!shape || !highPoint) throw new Error(`Shape-high-point data is missing ${entity.code}.`)
    const coordinate: [number, number] = [highPoint.longitude, highPoint.latitude]
    const frame = createShapeCoordinateFrame(shape, coordinate)
    if (!frame) throw new Error(`Shape-high-point cannot frame ${entity.code}.`)
    const marker = projectCoordinateToFrame(frame, shape, coordinate)
    if (!marker) throw new Error(`Shape-high-point cannot project ${entity.code}.`)
    return [Object.freeze({ id: `shape-high-point:${entity.code}`, entity, shape, highPoint, frame, marker: Object.freeze(marker), markerRelation: coordinateRelationToShape(shape, coordinate) })]
  })
}

export function shapeHighPointQuestionCounts(entities: readonly StudyEntity[] = studyEntities): Readonly<Record<HighPointContinent, number>> {
  return Object.freeze(Object.fromEntries(highPointContinents.map((continent) => [continent, shapeHighPointQuestions(entities, continent).length])) as Record<HighPointContinent, number>)
}

/** Mechanical all-record audit used by tests and the quiz's admission gate. */
export function auditShapeHighPointJoins(entities: readonly StudyEntity[] = studyEntities): Readonly<{ total: number; failures: readonly string[]; relations: Readonly<Record<ShapePointRelation, number>> }> {
  const failures: string[] = []; const relations: Record<ShapePointRelation, number> = { inside: 0, edge: 0, outside: 0 }
  for (const question of shapeHighPointQuestions(entities)) {
    const source = getHighPoint(question.entity.code)
    if (!source || source.latitude !== question.highPoint.latitude || source.longitude !== question.highPoint.longitude) failures.push(`${question.entity.code}: stored coordinate changed`)
    if (!Number.isFinite(question.marker[0]) || !Number.isFinite(question.marker[1]) || question.marker[0] < 0 || question.marker[1] < 0 || question.marker[0] > question.frame.width || question.marker[1] > question.frame.height) failures.push(`${question.entity.code}: marker is not visible in its frame`)
    relations[question.markerRelation] += 1
  }
  if (entities.length === studyEntities.length && allHighPoints().length !== entities.length) failures.push('high-point entity join count differs from study catalog')
  return Object.freeze({ total: entities.length, failures: Object.freeze(failures), relations: Object.freeze(relations) })
}

export function isHighPointContinent(value: string): value is Continent { return value !== 'All' && highPointContinents.includes(value as HighPointContinent) }
