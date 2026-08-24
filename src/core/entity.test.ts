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
    expect(entityCatalog.version).toBe(2)
    expect(studyEntities).toHaveLength(197)
    expect(getEntityByCode('tur')?.name).toBe('Türkiye')
    expect(findEntity('Turkey')?.code).toBe('TUR')
    expect(findEntity('state of palestine')?.code).toBe('PSE')
    expect(findEntity(' TUR ')?.code).toBe('TUR')
    expect(findEntity('U.A.E.')?.code).toBe('ARE')
    expect(findEntity('u a e')?.code).toBe('ARE')
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
    expect(Object.isFrozen(studyEntities[0].abbreviations)).toBe(true)
    expect(Object.isFrozen(studyEntities[0].capitals)).toBe(true)
    expect(Object.isFrozen(studyEntities[0].capitals[0])).toBe(true)
  })

  it('rejects malformed catalog structures before initializing helpers', () => {
    const base = {
      version: 2,
      checked: '2026-08-20',
      provenance: {
        entityRoster: 'test',
        continentPolicy: 'test',
        source: 'test',
      },
      entities: [{ code: 'TST', name: 'Test entity', aliases: [], abbreviations: [], continent: 'Europe', capitals: [{ id: 'test-capital', role: 'Capital' }] }],
    }

    expect(() => parseEntityCatalog({ ...base, entities: undefined })).toThrow('entities must be an array')
    expect(() => parseEntityCatalog({ ...base, version: 1 })).toThrow('version must be 2')
    expect(() => parseEntityCatalog({ ...base, extra: true })).toThrow('catalog has missing or extra fields')
    expect(() => parseEntityCatalog({ ...base, provenance: { ...base.provenance, extra: true } })).toThrow('provenance has missing or extra fields')
    expect(() => parseEntityCatalog({ ...base, entities: [{ ...base.entities[0], extra: true }] })).toThrow('entities[0] has missing or extra fields')
    expect(() => parseEntityCatalog({ ...base, entities: [{ ...base.entities[0], continent: 'Antarctica' }] })).toThrow('continent is unsupported')
    expect(() => parseEntityCatalog({ ...base, entities: [{ ...base.entities[0], abbreviations: undefined }] })).toThrow('abbreviations must be an array')
    expect(() => parseEntityCatalog({ ...base, entities: [{ ...base.entities[0], capitals: [{ id: 'test-capital' }] }] })).toThrow('capitals[0].role must be a nonempty string')
    expect(() => parseEntityCatalog({ ...base, entities: [{ ...base.entities[0], capitals: [{ id: 'test-capital', role: 'Capital', extra: true }] }] })).toThrow('capitals[0] has missing or extra fields')
    expect(() => parseEntityCatalog({ ...base, provenance: null })).toThrow('provenance must be an object')
  })

  it('cross-references every existing capital association exactly once', () => {
    const catalogAssignments = studyEntities.flatMap((entity) => entity.capitals.map((capital) => `${entity.code}:${capital.id}`)).sort()
    const capitalAssociations = capitals.flatMap((capital) => capital.entities.map((entity) => `${entity.code}:${capital.id}`)).sort()

    expect(catalogAssignments).toHaveLength(201)
    expect(new Set(catalogAssignments.map((assignment) => assignment.split(':')[1])).size).toBe(200)
    expect(catalogAssignments).toEqual(capitalAssociations)
  })

  it('rejects abbreviation roster, compact collision, and code-alias policy deviations', () => {
    const alteredRoster = structuredClone(entityData)
    alteredRoster.entities.find((entity) => entity.code === 'ARE')!.abbreviations = []
    expect(validateEntityCatalog(alteredRoster, capitals)).toContain('ARE: abbreviations differ from approved policy')

    const duplicateAbbreviation = structuredClone(entityData)
    duplicateAbbreviation.entities.find((entity) => entity.code === 'CAF')!.abbreviations = ['U.A.E.']
    expect(validateEntityCatalog(duplicateAbbreviation, capitals).join('\n')).toContain("CAF: abbreviation 'U.A.E.' collides with abbreviation of ARE")

    const codeCollision = structuredClone(entityData)
    codeCollision.entities.find((entity) => entity.code === 'ARE')!.abbreviations = ['ARG']
    expect(validateEntityCatalog(codeCollision, capitals).join('\n')).toContain("ARE: abbreviation 'ARG' collides with code of ARG")

    const unapprovedCode = structuredClone(entityData)
    unapprovedCode.entities.find((entity) => entity.code === 'ARE')!.abbreviations = ['ARE']
    expect(validateEntityCatalog(unapprovedCode, capitals).join('\n')).toContain("ARE: code-identical abbreviation 'ARE' is not approved")

    const assignmentExtraField = structuredClone(entityData)
    assignmentExtraField.entities.find((entity) => entity.code === 'ARE')!.capitals[0] = { ...assignmentExtraField.entities.find((entity) => entity.code === 'ARE')!.capitals[0], extra: true } as never
    expect(validateEntityCatalog(assignmentExtraField, capitals)).toContain('entity 5: each capital assignment must have exactly id and role fields')
  })
})
