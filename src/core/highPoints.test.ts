import { describe, expect, it } from 'vitest'
import rawHighPointData from '../data/high-points.json'
import rawGeoNames from '../data/high-point-geonames-selected.json'
import rawGns from '../data/high-point-gns-selected.json'
import { allHighPoints, getHighPoint, highPointAnswerNames, highPointSourceReferences, highPoints, parseHighPointDataset, parseHighPointRecord } from './highPoints'
import { highPointEntityCodes, validateHighPointDataset, validateHighPointRecords, validateHighPointSelectedFeatures } from './highPointValidation'

describe('highest-point runtime data', () => {
  it('has one immutable record for every study entity', () => {
    expect(highPoints).toHaveLength(197)
    expect(new Set(highPoints.map((record) => record.code)).size).toBe(197)
    expect(Object.isFrozen(allHighPoints())).toBe(true)
    expect(Object.isFrozen(getHighPoint('DNK')!)).toBe(true)
    expect(Object.isFrozen(getHighPoint('DNK')!.aliases)).toBe(true)
  })

  it('returns no data for unknown and prototype-style keys', () => {
    expect(getHighPoint('__proto__')).toBeUndefined()
    expect(getHighPoint('constructor')).toBeUndefined()
    expect(getHighPoint('ZZZ')).toBeUndefined()
    expect(getHighPoint(null)).toBeUndefined()
  })

  it('keeps policy locks, survey replacements, and shared summits deliberate', () => {
    expect(getHighPoint('DNK')?.label).toBe('Møllehøj')
    expect(getHighPoint('NLD')?.label).toBe('Vaalserberg')
    expect(getHighPoint('AUS')?.label).toBe('Mount Kosciuszko')
    expect(getHighPoint('SWE')?.label).toBe('Kebnekaise North Peak')
    expect(getHighPoint('SAU')?.label).toBe('Jabal Ferwa')
    expect(getHighPoint('UZB')?.label).toBe('Alpomish')
    expect(getHighPoint('BWA')?.label).toBe('Monalanong Hill')
    expect(getHighPoint('SEN')?.label).toBe('Unnamed elevation near Nepen Diaka')
    expect(getHighPoint('PSE')?.label).toBe('Khallat al Batrakh')
    expect(getHighPoint('MMR')?.label).toBe('Hkakabo Razi–Gamlang Razi high-point area')
    expect(getHighPoint('XKX')?.label).toBe('Rudoka e Madhe')
    expect(getHighPoint('SRB')?.label).toBe('Midžor')
    expect(getHighPoint('FRA')?.label).toBe(getHighPoint('ITA')?.label)
    expect(getHighPoint('FRA')?.latitude).toBe(getHighPoint('ITA')?.latitude)
    expect(getHighPoint('NZL')?.elevationMetres).toBe(3724)
    expect(getHighPoint('KAZ')?.elevationMetres).toBe(7010)
    expect(getHighPoint('COL')).toMatchObject({ label: 'Pico Simón Bolívar', latitude: 10.834718, longitude: -73.690453, elevationMetres: 5720.42, coordinateConfidence: 'surveyed' })
    expect(getHighPoint('MNG')).toMatchObject({ latitude: 49.14646, longitude: 87.81896 })
  })

  it('models unnamed low-country points descriptively and keeps disputed records neutral', () => {
    for (const code of ['VAT', 'MDV', 'TUV', 'MHL']) {
      expect(getHighPoint(code)?.nameStatus).toBe('descriptive')
      expect(getHighPoint(code)?.note).toBeTruthy()
    }
    for (const code of ['PSE', 'XKX', 'TWN', 'GEO']) expect(getHighPoint(code)?.note).toBeTruthy()
  })

  it('normalizes aliases without leaking mutable shared state', () => {
    expect(highPointAnswerNames(getHighPoint('MEX')!)).toContain('pico de orizaba')
    expect(Object.isFrozen(highPointAnswerNames(getHighPoint('MEX')!))).toBe(true)
  })

  it('resolves every source to an auditable HTTPS reference with stated support', () => {
    for (const record of highPoints) {
      for (const source of highPointSourceReferences(record)) {
        expect(source.url).toMatch(/^https:\/\//)
        expect(source.supports.length).toBeGreaterThan(0)
      }
    }
    expect(highPointSourceReferences(getHighPoint('AFG')!).map((source) => source.id)).toEqual(['ciaFactbookFinal', 'ngaGnsSelected'])
    expect(JSON.stringify(rawHighPointData)).not.toContain('wikidataP610')
    const unresolved = highPointSourceReferences(parseHighPointRecord({ code: 'TST', label: 'Test Point', aliases: [], latitude: 1, longitude: 2, coordinateConfidence: 'named-feature', kind: 'point', nameStatus: 'named', sourceRefs: [{ sourceId: 'missing', url: 'https://example.test/source', revision: 'test', locator: '#test', captured: '2026-08-20', supports: ['identity'] }], checked: '2026-08-20' }))
    expect(unresolved[0]).toMatchObject({ title: 'Unknown source', url: '', supports: [] })
  })
})

describe('highest-point parser and validator', () => {
  const minimal = {
    code: 'TST', label: 'Test Point', aliases: [], latitude: 1, longitude: 2, coordinateConfidence: 'named-feature', elevationMetres: 3,
    kind: 'point', nameStatus: 'named', sourceRefs: [{ sourceId: 'botswanaGnss', url: 'https://example.test/fixed', revision: 'test', locator: '#test', captured: '2026-08-20', supports: ['identity', 'coordinate', 'elevation'] }], checked: '2026-08-20',
  }

  it('rejects malformed, unsafe, or unexpected input', () => {
    expect(() => parseHighPointRecord(null)).toThrow('object')
    expect(() => parseHighPointRecord({ ...minimal, constructor: 'bad' })).toThrow('unexpected')
    expect(() => parseHighPointRecord({ ...minimal, latitude: 91 })).toThrow('latitude')
    expect(() => parseHighPointRecord({ ...minimal, aliases: [''] })).toThrow('aliases')
    expect(() => parseHighPointRecord({ ...minimal, sourceRefs: null })).toThrow('sources')
    expect(() => parseHighPointRecord({ ...minimal, sourceRefs: [{ ...minimal.sourceRefs[0], extra: true }] })).toThrow('source reference')
    expect(() => parseHighPointRecord({ ...minimal, checked: undefined })).toThrow('checked')
    expect(() => parseHighPointRecord({ ...minimal, sourceRefs: [{ ...minimal.sourceRefs[0], sourceId: 'missing' }] })).not.toThrow()
    expect(() => parseHighPointDataset([])).toThrow('object')
    expect(validateHighPointDataset([])).toEqual(expect.arrayContaining([expect.stringContaining('object')]))
    expect(validateHighPointDataset({ ...rawHighPointData, extra: true })).toEqual(expect.arrayContaining([expect.stringContaining('unexpected')]))
  })

  it('reports mechanical dataset failure paths', () => {
    expect(validateHighPointRecords(highPoints)).toEqual([])
    expect(validateHighPointRecords([...highPoints, highPoints[0]])).toEqual(expect.arrayContaining([expect.stringContaining('duplicate code')]))
    expect(validateHighPointRecords(highPoints.filter((record) => record.code !== 'DNK'))).toEqual(expect.arrayContaining([expect.stringContaining('missing entity DNK')]))
    expect(highPointEntityCodes).toHaveLength(197)
    expect(validateHighPointRecords([null, {}, { ...minimal, aliases: null }, { ...minimal, sourceRefs: [{ ...minimal.sourceRefs[0], sourceId: 'missing' }] }])).toEqual(expect.arrayContaining([
      expect.stringContaining('object'), expect.stringContaining('code'), expect.stringContaining('aliases'), expect.stringContaining('unknown source'),
    ]))
  })

  it('permits colliding answers only for an explicit shared physical feature', () => {
    const collision = highPoints.map((record) => record.code === 'GRC' ? { ...record, aliases: [...record.aliases, 'Mount Olympus'] } : record)
    expect(validateHighPointRecords(collision)).toEqual(expect.arrayContaining([expect.stringContaining('Mount Olympus')]))
    expect(getHighPoint('CHN')?.sharedFeatureId).toBe(getHighPoint('NPL')?.sharedFeatureId)
    const forged = highPoints.map((record) => ['CYP', 'GRC'].includes(record.code) ? { ...record, sharedFeatureId: 'forged', aliases: record.code === 'CYP' ? [...record.aliases, 'Mytikas'] : record.aliases } : record)
    expect(validateHighPointRecords(forged)).toEqual(expect.arrayContaining([expect.stringContaining('shared feature forged has unapproved entities')]))
  })

  it('requires a selected feature that claims coordinate support to match a surveyed marker', () => {
    const mismatch = highPoints.map((record) => record.code === 'BWA'
      ? { ...record, sourceRefs: record.sourceRefs.map((source) => source.sourceId === 'ngaGnsSelected' ? { ...source, supports: ['name', 'coordinate'] } : source) }
      : record)
    expect(validateHighPointRecords(mismatch)).toEqual(expect.arrayContaining([expect.stringContaining('marker does not match record coordinates')]))
    expect(validateHighPointRecords(highPoints)).toEqual([])
  })

  it('rejects unsupported source claims and stale selected-feature locators', () => {
    const unsupported = highPoints.map((record) => record.code === 'AFG' ? { ...record, sourceRefs: record.sourceRefs.map((source) => source.sourceId === 'ngaGnsSelected' ? { ...source, supports: ['comparison'] } : source) } : record)
    expect(validateHighPointRecords(unsupported)).toEqual(expect.arrayContaining([expect.stringContaining('cannot support comparison')]))
    const staleLocator = highPoints.map((record) => record.code === 'AFG' ? { ...record, sourceRefs: record.sourceRefs.map((source) => source.sourceId === 'ngaGnsSelected' ? { ...source, locator: '#/features/1' } : source) } : record)
    expect(validateHighPointRecords(staleLocator)).toEqual(expect.arrayContaining([expect.stringContaining('does not resolve to AFG')]))
  })

  it('locks selected-feature IDs, names, and coordinates to reviewed extracts', () => {
    const changedGns = structuredClone(rawGns.features)
    changedGns[0].ufi = '-different-homonym'
    expect(validateHighPointSelectedFeatures(changedGns, rawGeoNames.features)).toContain('NGA selected-feature content changed')

    const changedGeoNames = structuredClone(rawGeoNames.features)
    changedGeoNames[0].lat_dd += 0.01
    expect(validateHighPointSelectedFeatures(rawGns.features, changedGeoNames)).toContain('GeoNames selected-feature content changed')
  })
})
