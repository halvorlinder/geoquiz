import { describe, expect, it } from 'vitest'
import { flagAssetUrl, flagRecordById, flagRecordsForScope, normalizeFlagAnswer } from './flags'

describe('flag catalog helpers', () => {
  it('has exact scopes and deterministic code ordering', () => {
    expect(flagRecordsForScope('without-territories')).toHaveLength(197)
    expect(flagRecordsForScope('only-territories')).toHaveLength(38)
    expect(flagRecordsForScope('with-territories')).toHaveLength(235)
    expect(flagRecordsForScope('only-territories').map((record) => record.id)).toEqual(['AX', 'FO', 'GL', 'HK', 'MO', 'AW', 'CW', 'SX', 'BQ-BO', 'BQ-SE', 'BQ-SA', 'CK', 'NU', 'TK', 'CX', 'CC', 'NF', 'PF', 'GG', 'IM', 'JE', 'AI', 'BM', 'VG', 'KY', 'FK', 'GI', 'MS', 'PN', 'TC', 'SH-HL', 'SH-AC', 'SH-TA', 'AS', 'GU', 'MP', 'PR', 'VI'])
  })

  it('does not expose mutable catalog state', () => {
    const records = flagRecordsForScope('only-territories')
    expect(Object.isFrozen(records)).toBe(true)
    expect(Object.isFrozen(records[0])).toBe(true)
    expect(Object.isFrozen(records[0].aliases)).toBe(true)
  })

  it('looks up stable IDs and builds local base-aware URLs without names', () => {
    expect(flagRecordById('FK').name).toBe('Falkland Islands (Malvinas)')
    expect(flagAssetUrl('FK', '/geoquiz/')).toBe('/geoquiz/flags/v1/FK.svg')
    expect(flagAssetUrl('FK', '/geoquiz')).toBe('/geoquiz/flags/v1/FK.svg')
    expect(flagAssetUrl('FK')).not.toContain('Falkland')
    expect(() => flagAssetUrl('../FK')).toThrow('Unknown flag record')
    expect(() => flagAssetUrl({ id: 'FK', assetPath: '/flags/v1/../secret.svg' } as never)).toThrow('Unknown flag record')
    expect(() => flagRecordById('NOPE')).toThrow('Unknown flag record')
    expect(() => flagRecordsForScope('all' as never)).toThrow('Unknown flag scope')
  })

  it('normalizes curated aliases without introducing ambiguous aliases', () => {
    expect(normalizeFlagAnswer('Curaçao')).toBe(normalizeFlagAnswer('Curacao'))
    expect(flagRecordById('MO').aliases).toContain('Macau')
    expect(flagRecordById('SX').aliases).not.toContain('Saint Martin')
    expect(flagRecordById('GBR').aliases).toContain('UK')
  })
})
