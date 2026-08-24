import { describe, expect, it } from 'vitest'
import capitals from '../data/capitals.json'
import catalog from '../data/flags.json'
import entities from '../data/entities.json'
import { validateDuplicateHashGroups, validateFlagAnswerOwnership, validateFlagCatalogPolicy } from '../../scripts/flag-catalog-policy'

const capitalEntities = new Map(capitals.flatMap((place) => place.entities.map((entity) => [entity.code, entity.country])))
const clone = () => structuredClone(catalog)
const diagnose = (mutate: (value: ReturnType<typeof clone>) => void) => {
  const value = clone()
  mutate(value)
  return validateFlagCatalogPolicy(value, capitalEntities).join('\n')
}

describe('flag catalog policy', () => {
  it('accepts the checked-in exact catalog', () => expect(validateFlagCatalogPolicy(catalog, capitalEntities)).toEqual([]))
  it('rejects policy and path mutations with specific diagnostics', () => {
    expect(diagnose((value) => { value.records.find((record) => record.id === 'FK')!.name = 'Other Islands' })).toContain('FK: territory policy mismatch')
    expect(diagnose((value) => { value.records.find((record) => record.id === 'CX')!.parent = 'Elsewhere' })).toContain('CX: territory policy mismatch')
    expect(diagnose((value) => { value.records.find((record) => record.id === 'CX')!.studyKind = 'associated-area' })).toContain('CX: territory policy mismatch')
    expect(diagnose((value) => { value.records.find((record) => record.id === 'CX')!.flagStatus = 'official-or-national' })).toContain('CX: territory policy mismatch')
    expect(diagnose((value) => { value.records.find((record) => record.id === 'CX')!.sourceKey = 'XX' })).toContain('CX: territory policy mismatch')
    expect(diagnose((value) => { value.records.find((record) => record.id === 'CX')!.note = 'Official national flag.' })).toContain('CX: territory note differs from approved policy')
    expect(diagnose((value) => { value.records.find((record) => record.id === 'SH-AC')!.note = 'Official national flag.' })).toContain('SH-AC: territory note differs from approved policy')
    expect(diagnose((value) => { value.records.find((record) => record.id === 'USA')!.aliases = ['USA'] })).toContain('USA: sovereign aliases differ from approved policy')
    expect(diagnose((value) => { value.records.find((record) => record.id === 'USA')!.id = '../../owned' })).toContain('../../owned: invalid or duplicate stable ID')
    expect(diagnose((value) => { value.records.find((record) => record.id === 'USA')!.assetPath = '/flags/v1/../../owned.svg' })).toContain('USA: asset path must be exact ID-based path')
  })
  it('validates duplicate hash groups without filesystem writes', () => {
    const ids = new Set(['A', 'B', 'C'])
    expect(validateDuplicateHashGroups([], ids, [])).toEqual([])
    expect(validateDuplicateHashGroups([['A']], ids, [])).toContain('duplicateHashGroups contains an invalid group')
    expect(validateDuplicateHashGroups([['A', 'B']], ids, [])).toContain('duplicateHashGroups declares a stale or false group: A,B')
    expect(validateDuplicateHashGroups([], ids, [['A', 'B']])).toContain('identical SVG bytes need an explicit duplicate group: A,B')
  })
  it('rejects collisions by actual submitted answer form across shared sovereign and territory data', () => {
    expect(validateFlagAnswerOwnership(catalog, entities)).toEqual([])
    const alteredCatalog = clone()
    alteredCatalog.records.find((record) => record.id === 'AW')!.aliases = ['CAR']
    expect(validateFlagAnswerOwnership(alteredCatalog, entities)).toContain("flag abbreviation 'CAR' collides with ordinary answer of AW and CAF")
    const alteredEntities = structuredClone(entities)
    alteredEntities.entities.find((entity) => entity.code === 'GBR')!.abbreviations = ['US']
    expect(validateFlagAnswerOwnership(catalog, alteredEntities)).toContain("flag abbreviation 'US' collides with GBR and USA")
  })
})
