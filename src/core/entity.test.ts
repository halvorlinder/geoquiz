import { describe, expect, it } from 'vitest'
import capitals from '../data/capitals.json'
import entityData from '../data/entities.json'
import { continents, entitiesForContinent, entityCatalog, findEntity, getEntityByCode, parseEntityCatalog, studyEntities, type EntityCatalog } from './entity'
import { validateEntityCatalog } from './entityCatalogValidation'
import { continentByEntityCode, expectedContinentEntityCount } from './entityContinentPolicy'

function compileTimeImmutabilityGuard(catalog: EntityCatalog) {
  // @ts-expect-error EntityCatalog is publicly immutable.
  catalog.provenance.source = 'replacement source'
}

void compileTimeImmutabilityGuard

describe('study entity catalog', () => {
  it('exposes the versioned 197-entity catalog through safe lookups', () => {
    expect(entityCatalog.version).toBe(1)
    expect(studyEntities).toHaveLength(197)
    expect(getEntityByCode('tur')?.name).toBe('Türkiye')
    expect(findEntity('Turkey')?.code).toBe('TUR')
    expect(findEntity('state of palestine')?.code).toBe('PSE')
    expect(getEntityByCode('XXX')).toBeUndefined()
    expect(getEntityByCode('')).toBeUndefined()
    expect(findEntity('not an entity')).toBeUndefined()
  })

  it('uses only the supported continents and applies the full checked-in policy', () => {
    expect(new Set(studyEntities.map((entity) => entity.continent))).toEqual(new Set(continents))
    expect(Object.keys(continentByEntityCode)).toHaveLength(expectedContinentEntityCount)
    expect(getEntityByCode('PLW')?.continent).toBe('Oceania')
    expect(getEntityByCode('RUS')?.continent).toBe('Europe')
    expect(getEntityByCode('TUR')?.continent).toBe('Europe')
    expect(getEntityByCode('KAZ')?.continent).toBe('Asia')
    expect(getEntityByCode('EGY')?.continent).toBe('Africa')
    expect(getEntityByCode('GEO')?.continent).toBe('Asia')
    expect(entitiesForContinent('Europe')).toContain(getEntityByCode('RUS'))
  })

  it('rejects deviations from Palau’s baseline and every product override', () => {
    const changes: Record<string, string> = {
      PLW: 'Asia',
      RUS: 'Asia',
      TUR: 'Asia',
      KAZ: 'Europe',
      EGY: 'Asia',
      GEO: 'Europe',
    }

    for (const [code, continent] of Object.entries(changes)) {
      const mutated = structuredClone(entityData)
      const entity = mutated.entities.find((candidate) => candidate.code === code)!
      entity.continent = continent
      expect(validateEntityCatalog(mutated, capitals)).toContain(`${code}: must use continent policy ${continentByEntityCode[code]}`)
    }
  })

  it('preserves role-labelled multi-capital and shared-place mappings', () => {
    expect(getEntityByCode('ZAF')?.capitals).toEqual([
      { id: 'bloemfontein', role: 'Judicial' },
      { id: 'cape-town', role: 'Legislative' },
      { id: 'pretoria', role: 'Administrative' },
    ])
    expect(getEntityByCode('BOL')?.capitals).toEqual([
      { id: 'la-paz', role: 'Seat of government' },
      { id: 'sucre', role: 'Constitutional capital' },
    ])
    expect(getEntityByCode('SWZ')?.capitals).toEqual([
      { id: 'lobamba', role: 'Royal and legislative' },
      { id: 'mbabane', role: 'Administrative' },
    ])
    expect(getEntityByCode('ISR')?.capitals).toEqual([{ id: 'jerusalem', role: 'Capital' }])
    expect(getEntityByCode('PSE')?.capitals).toEqual([{ id: 'jerusalem', role: 'Capital' }])
  })

  it('keeps exported catalog records immutable', () => {
    expect(Object.isFrozen(entityCatalog)).toBe(true)
    expect(Object.isFrozen(entityCatalog.provenance)).toBe(true)
    expect(Object.isFrozen(studyEntities)).toBe(true)
    expect(Object.isFrozen(studyEntities[0])).toBe(true)
    expect(Object.isFrozen(studyEntities[0].aliases)).toBe(true)
    expect(Object.isFrozen(studyEntities[0].capitals)).toBe(true)
    expect(Object.isFrozen(studyEntities[0].capitals[0])).toBe(true)
  })

  it('rejects malformed catalog structures before initializing helpers', () => {
    const base = {
      version: 1,
      checked: '2026-08-20',
      provenance: {
        entityRoster: 'test',
        continentPolicy: 'test',
        source: 'test',
      },
      entities: [{ code: 'TST', name: 'Test entity', aliases: [], continent: 'Europe', capitals: [{ id: 'test-capital', role: 'Capital' }] }],
    }

    expect(() => parseEntityCatalog({ ...base, entities: undefined })).toThrow('entities must be an array')
    expect(() => parseEntityCatalog({ ...base, entities: [{ ...base.entities[0], continent: 'Antarctica' }] })).toThrow('continent is unsupported')
    expect(() => parseEntityCatalog({ ...base, entities: [{ ...base.entities[0], capitals: [{ id: 'test-capital' }] }] })).toThrow('capitals[0].role must be a nonempty string')
    expect(() => parseEntityCatalog({ ...base, provenance: null })).toThrow('provenance must be an object')
  })

  it('cross-references every existing capital association exactly once', () => {
    const catalogAssignments = studyEntities.flatMap((entity) => entity.capitals.map((capital) => `${entity.code}:${capital.id}`)).sort()
    const capitalAssociations = capitals.flatMap((capital) => capital.entities.map((entity) => `${entity.code}:${capital.id}`)).sort()

    expect(catalogAssignments).toHaveLength(201)
    expect(new Set(catalogAssignments.map((assignment) => assignment.split(':')[1])).size).toBe(200)
    expect(catalogAssignments).toEqual(capitalAssociations)
  })
})
