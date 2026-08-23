import capitals from '../data/capitals.json'
import rawGeoNames from '../data/high-point-geonames-selected.json'
import rawGns from '../data/high-point-gns-selected.json'
import { HIGH_POINT_CHECKED, HIGH_POINT_DATA_VERSION, highPointSourceSupport, highPointSources, type HighPointRecord } from '../data/high-points'
import { normalizeAnswer } from './answerMatching'
import { highPointSourceReferences, parseHighPointDataset, parseHighPointRecord } from './highPoints'

type CapitalPlace = { entities: { code: string }[] }
export const highPointEntityCodes = new Set((capitals as CapitalPlace[]).flatMap((place) => place.entities.map((entity) => entity.code)))

const explicitRoster = new Set('AFG AGO ALB AND ARE ARG ARM ATG AUS AUT AZE BDI BEL BEN BFA BGD BGR BHR BHS BIH BLR BLZ BOL BRA BRB BRN BTN BWA CAF CAN CHE CHL CHN CIV CMR COD COG COL COM CPV CRI CUB CYP CZE DEU DJI DMA DNK DOM DZA ECU EGY ERI ESP EST ETH FIN FJI FRA FSM GAB GBR GEO GHA GIN GMB GNB GNQ GRC GRD GTM GUY HND HRV HTI HUN IDN IND IRL IRN IRQ ISL ISR ITA JAM JOR JPN KAZ KEN KGZ KHM KIR KNA KOR KWT LAO LBN LBR LBY LCA LIE LKA LSO LTU LUX LVA MAR MCO MDA MDG MDV MEX MHL MKD MLI MLT MMR MNE MNG MOZ MRT MUS MWI MYS NAM NER NGA NIC NLD NOR NPL NRU NZL OMN PAK PAN PER PHL PLW PNG POL PRK PRT PRY PSE QAT ROU RUS RWA SAU SDN SEN SGP SLB SLE SLV SMR SOM SRB SSD STP SUR SVK SVN SWE SWZ SYC SYR TCD TGO THA TJK TKM TLS TON TTO TUN TUR TUV TWN TZA UGA UKR URY USA UZB VAT VCT VEN VNM VUT WSM XKX YEM ZAF ZMB ZWE'.split(' '))
const expectedKeys = new Set(['code', 'label', 'aliases', 'latitude', 'longitude', 'coordinateConfidence', 'elevationMetres', 'kind', 'nameStatus', 'sourceRefs', 'sharedFeatureId', 'checked', 'note'])
const allowedKinds = new Set(['mountain', 'peak', 'volcano', 'massif', 'hill', 'ridge', 'cliff', 'island', 'point', 'urban-point'])
const sourceIds = new Set(Object.keys(highPointSources))
const allowedSupportClaims = new Set(['identity', 'name', 'coordinate', 'elevation', 'boundary', 'comparison'])
type SelectedFeature = { code: string; lat_dd: number; long_dd: number; cc_ft?: string; countryCode?: string; alternateCountryCodes?: string[]; ufi?: string; uni?: string; fullName?: string; designationCode?: string; featureClass?: string; geonameId?: string; name?: string; featureCode?: string }
const gnsFeatures = (rawGns as { features: SelectedFeature[] }).features
const geoNamesFeatures = (rawGeoNames as { features: SelectedFeature[] }).features
const selectedFeatureFingerprints = { nga: 'f9548daa', geoNames: 'dfd1bb3a' } as const
const geoNamesEntityCountries: Readonly<Record<string, readonly string[]>> = {
  ARE: ['AE'], BEN: ['BJ'], BGD: ['BD'], BHS: ['BS'], BLZ: ['BZ'], BTN: ['BT'], CAN: ['CA'], CHN: ['CN'], COD: ['CD'], CYP: ['CY'], CZE: ['CZ'], DNK: ['DK'], EGY: ['EG'], ESP: ['ES'], FRA: ['FR'], FSM: ['FM'], GBR: ['GB'], GHA: ['GH'], GRC: ['GR'], GRD: ['GD'], GUY: ['GY'], HND: ['HN'], IRQ: ['IQ'], ITA: ['IT'], JAM: ['JM'], KGZ: ['KG'], KNA: ['KN'], KWT: ['KW'], LBN: ['LB'], LUX: ['LU'], MCO: ['MC'], MDA: ['MD'], MDV: ['MV'], MLT: ['MT'], MNE: ['ME'], MNG: ['MN'], MOZ: ['MZ'], NAM: ['NA'], NIC: ['NI'], NPL: ['NP'], NRU: ['NR'], NZL: ['NZ'], PAN: ['PA'], PHL: ['PH'], PRT: ['PT'], PSE: ['PS'], QAT: ['QA'], SEN: ['SN', 'GN'], SGP: ['SG'], SLV: ['SV'], SMR: ['SM'], SUR: ['SR'], SVN: ['SI'], TKM: ['TM'], TUR: ['TR'], TUV: ['TV'], TWN: ['TW'], TZA: ['TZ'], UGA: ['UG'], URY: ['UY'], USA: ['US'], UZB: ['UZ'], VAT: ['VA'], VCT: ['VC'], VEN: ['VE'], VNM: ['VN'], YEM: ['YE'], ZWE: ['ZW'],
}
const approvedSharedFeatures: Readonly<Record<string, readonly string[]>> = {
  everest: ['CHN', 'NPL'], korab: ['ALB', 'MKD'], 'margherita-peak': ['COD', 'UGA'], 'mont-blanc': ['FRA', 'ITA'], 'mount-nimba': ['CIV', 'GIN'],
}

function selectedFeatureFailure(record: HighPointRecord, sourceId: string, locator: string, supports: readonly string[]): string | undefined {
  if (sourceId !== 'ngaGnsSelected' && sourceId !== 'geoNamesSelected') return undefined
  const match = locator.match(/^#\/features\/(\d+)$/)
  const features = sourceId === 'ngaGnsSelected' ? gnsFeatures : geoNamesFeatures
  const feature = match ? features[Number(match[1])] : undefined
  if (!feature || feature.code !== record.code) return `${sourceId} locator does not resolve to ${record.code}`
  if (sourceId === 'ngaGnsSelected' && feature.cc_ft && !feature.cc_ft.split(',').includes(record.code)) return `${sourceId} feature country does not include ${record.code}`
  if (sourceId === 'geoNamesSelected') {
    const actualCountries = new Set([feature.countryCode, ...(feature.alternateCountryCodes ?? [])])
    const expectedCountries = geoNamesEntityCountries[record.code]
    if (!expectedCountries?.some((country) => actualCountries.has(country))) return `${sourceId} feature country does not include ${record.code}`
  }
  if (supports.includes('coordinate') && (feature.lat_dd !== record.latitude || feature.long_dd !== record.longitude)) return `${sourceId} marker does not match record coordinates`
  return undefined
}

function selectedFeatureFingerprint(features: readonly unknown[]): string {
  const serialized = JSON.stringify(features)
  let hash = 2166136261
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function validateHighPointSelectedFeatures(
  gns: readonly SelectedFeature[] = gnsFeatures,
  geoNames: readonly SelectedFeature[] = geoNamesFeatures,
): string[] {
  const failures: string[] = []
  if (gns.length !== 122) failures.push(`expected 122 fixed NGA features, found ${gns.length}`)
  if (geoNames.length !== 68) failures.push(`expected 68 fixed GeoNames features, found ${geoNames.length}`)
  if (new Set(gns.map((feature) => feature.code)).size !== gns.length) failures.push('NGA selected-feature codes must be unique')
  if (new Set(geoNames.map((feature) => feature.code)).size !== geoNames.length) failures.push('GeoNames selected-feature codes must be unique')
  for (const feature of gns) if (!feature.ufi || !feature.uni || !feature.fullName || !feature.designationCode || feature.featureClass !== 'T' || !Number.isFinite(feature.lat_dd) || !Number.isFinite(feature.long_dd)) failures.push(`NGA selected feature ${feature.code} is incomplete`)
  for (const feature of geoNames) if (!feature.geonameId || !feature.name || !feature.featureCode || !feature.countryCode || !Number.isFinite(feature.lat_dd) || !Number.isFinite(feature.long_dd)) failures.push(`GeoNames selected feature ${feature.code} is incomplete`)
  if (selectedFeatureFingerprint(gns) !== selectedFeatureFingerprints.nga) failures.push('NGA selected-feature content changed')
  if (selectedFeatureFingerprint(geoNames) !== selectedFeatureFingerprints.geoNames) failures.push('GeoNames selected-feature content changed')
  return failures
}

export function validateHighPointRecords(records: readonly unknown[], codes = highPointEntityCodes): string[] {
  const failures: string[] = []
  const seenCodes = new Set<string>()
  const answers = new Map<string, string>()
  const validRecords: HighPointRecord[] = []
  for (const [index, candidate] of records.entries()) {
    const prefix = `record ${index + 1}`
    let record: HighPointRecord
    try { record = parseHighPointRecord(candidate) } catch (error) { failures.push(`${prefix}: ${(error as Error).message}`); continue }
    validRecords.push(record)
    for (const key of Object.keys(record)) if (!expectedKeys.has(key)) failures.push(`${prefix}: unexpected key ${key}`)
    if (seenCodes.has(record.code)) failures.push(`${prefix}: duplicate code ${record.code}`)
    seenCodes.add(record.code)
    if (!codes.has(record.code)) failures.push(`${prefix}: unexpected entity ${record.code}`)
    if (record.checked !== HIGH_POINT_CHECKED) failures.push(`${prefix}: checked date must be ${HIGH_POINT_CHECKED}`)
    if (!allowedKinds.has(record.kind)) failures.push(`${prefix}: invalid kind`)
    if (record.nameStatus === 'descriptive' && !record.note) failures.push(`${prefix}: descriptive answer needs an edge-case note`)
    if ((record.coordinateConfidence === 'representative' || record.coordinateConfidence === 'provisional') && !record.note) failures.push(`${prefix}: non-exact coordinate needs a note`)
    for (const source of record.sourceRefs) {
      if (!sourceIds.has(source.sourceId)) failures.push(`${prefix}: unknown source ${source.sourceId}`)
      else {
        const allowed = new Set<string>(highPointSourceSupport[source.sourceId])
        if (!allowed.size) failures.push(`${prefix}: source ${source.sourceId} lacks support metadata`)
        for (const support of source.supports) {
          if (!allowedSupportClaims.has(support)) failures.push(`${prefix}: invalid source-support claim ${support}`)
          else if (!allowed.has(support)) failures.push(`${prefix}: source ${source.sourceId} cannot support ${support}`)
        }
        const catalogUrl = highPointSources[source.sourceId].url
        const matchesCatalog = source.sourceId === 'ciaFactbookFinal'
          ? source.url.startsWith('https://raw.githubusercontent.com/pmusser/cia-world-factbook-final/2a40cddf0b0f57273c2f935be169d73496989a21/country-jsons/') && source.revision === '2a40cddf0b0f57273c2f935be169d73496989a21'
          : source.url.startsWith(catalogUrl)
        if (!matchesCatalog) failures.push(`${prefix}: source ${source.sourceId} URL or revision does not match its catalog`)
        if (source.sourceId === 'ngaGnsSelected' && source.revision !== 'c898805f7327db4dc77fc0183e4097d640b7a98d275c73276c9ba022452ffcc2') failures.push(`${prefix}: NGA reference has the wrong snapshot revision`)
        if (source.sourceId === 'geoNamesSelected' && source.revision !== '91652aa25c1109c406527115e2eb45d4a33a48190483cd37daa6330788995bb5') failures.push(`${prefix}: GeoNames reference has the wrong snapshot revision`)
      }
      if (!/^https:\/\//.test(source.url) || source.url === 'https://query.wikidata.org/sparql' || source.url.includes('catalog')) failures.push(`${prefix}: source ${source.sourceId} needs a direct HTTPS reference`)
      if (!source.revision.trim() || !source.locator.startsWith('#') || !/^(?:\d{4}-\d{2}-\d{2}|\d{14})$/.test(source.captured)) failures.push(`${prefix}: source ${source.sourceId} lacks revision, locator, or capture metadata`)
      if (!source.supports.length || new Set(source.supports).size !== source.supports.length) failures.push(`${prefix}: source ${source.sourceId} has empty or duplicate support claims`)
      const selectedFailure = selectedFeatureFailure(record, source.sourceId, source.locator, source.supports)
      if (selectedFailure) failures.push(`${prefix}: ${selectedFailure}`)
    }
    const referenceKeys = record.sourceRefs.map((source) => `${source.sourceId}|${source.url}|${source.locator}`)
    if (new Set(referenceKeys).size !== referenceKeys.length) failures.push(`${prefix}: duplicate source reference`)
    const supported = new Set(record.sourceRefs.flatMap((source) => source.supports))
    for (const required of ['identity', 'coordinate', ...(record.elevationMetres === undefined ? [] : ['elevation'])]) {
      if (!supported.has(required)) failures.push(`${prefix}: missing ${required} source coverage`)
    }
    if (record.aliases.length && !supported.has('name')) failures.push(`${prefix}: aliases need name or transliteration evidence`)
    for (const source of highPointSourceReferences(record)) {
      if (!/^https:\/\//.test(source.url) || !source.supports.length) failures.push(`${prefix}: unresolved source reference ${source.id}`)
    }
    for (const answer of [record.label, ...record.aliases]) {
      const normalized = normalizeAnswer(answer)
      const previous = answers.get(normalized)
      if (previous && previous !== record.code) {
        const previousRecord = validRecords.find((candidate) => candidate.code === previous)
        if (!record.sharedFeatureId || record.sharedFeatureId !== previousRecord?.sharedFeatureId) failures.push(`${prefix}: answer '${answer}' collides with ${previous}`)
      }
      answers.set(normalized, record.code)
    }
  }
  for (const code of codes) if (!seenCodes.has(code)) failures.push(`missing entity ${code}`)
  if (explicitRoster.size !== 197) failures.push('explicit roster must contain 197 codes')
  for (const code of explicitRoster) if (!codes.has(code)) failures.push(`capital roster missing explicit ${code}`)
  for (const code of codes) if (!explicitRoster.has(code)) failures.push(`capital roster has unexpected ${code}`)
  for (const [id, source] of Object.entries(highPointSources)) {
    if (!source.title || !/^https:\/\//.test(source.url) || !/^\d{4}-\d{2}-\d{2}$/.test(source.checked)) failures.push(`source ${id} is incomplete`)
  }
  const sharedGroups = new Map<string, HighPointRecord[]>()
  for (const record of validRecords) if (record.sharedFeatureId) sharedGroups.set(record.sharedFeatureId, [...(sharedGroups.get(record.sharedFeatureId) ?? []), record])
  for (const [id, group] of sharedGroups) {
    const actualCodes = group.map((record) => record.code).sort()
    const approvedCodes = approvedSharedFeatures[id]
    if (!approvedCodes || actualCodes.join(',') !== [...approvedCodes].sort().join(',')) failures.push(`shared feature ${id} has unapproved entities ${actualCodes.join(',')}`)
    const [first] = group
    if (group.some((record) => record.latitude !== first.latitude || record.longitude !== first.longitude)) failures.push(`shared feature ${id} must use identical coordinates`)
  }
  for (const [id, codesForFeature] of Object.entries(approvedSharedFeatures)) if (!sharedGroups.has(id)) failures.push(`missing approved shared feature ${id} for ${codesForFeature.join(',')}`)
  failures.push(...validateHighPointSelectedFeatures())
  if ((rawGns as { source: { sha256: string } }).source.sha256 !== 'c898805f7327db4dc77fc0183e4097d640b7a98d275c73276c9ba022452ffcc2') failures.push('NGA snapshot hash changed')
  if ((rawGeoNames as { source: { sha256: string } }).source.sha256 !== '91652aa25c1109c406527115e2eb45d4a33a48190483cd37daa6330788995bb5') failures.push('GeoNames snapshot hash changed')
  if (records.length !== codes.size) failures.push(`expected ${codes.size} records, found ${records.length}`)
  if (!/^\d{4}\.\d{2}\.\d{2}$/.test(HIGH_POINT_DATA_VERSION)) failures.push('data version is invalid')
  const snapshots: Record<string, string> = {
    DNK: 'Møllehøj', NLD: 'Vaalserberg', AUS: 'Mount Kosciuszko', GBR: 'Ben Nevis', ESP: 'Teide', PRT: 'Mount Pico',
    VAT: 'Highest point of the Vatican Gardens', MDV: 'Unnamed beach storm ridge, Fuvahmulah', TUV: 'Unnamed storm berm, Niulakita', MHL: 'Unnamed point, Likiep Atoll',
    SWE: 'Kebnekaise North Peak', SAU: 'Jabal Ferwa', UZB: 'Alpomish', GMB: 'Sare Firasu Hill', GNB: 'Mount Ronde', TGO: 'Mount Atilakoutse',
    ISR: 'Mount Meron', SYR: 'Mount Hermon', PSE: 'Khallat al Batrakh', XKX: 'Rudoka e Madhe', SRB: 'Midžor', TWN: 'Yushan Main Peak', GEO: 'Shkhara', COL: 'Pico Simón Bolívar', BGD: 'Saka Haphong', BWA: 'Monalanong Hill', SEN: 'Unnamed elevation near Nepen Diaka', JPN: 'Mount Fuji',
    MMR: 'Hkakabo Razi–Gamlang Razi high-point area', BEN: 'Unnamed elevation southeast of Kotopounga', BDI: 'Unnamed elevation on Mukike Range', BHS: 'Unnamed point northeast of Old Bight', FSM: 'Mount Nanlaud', KWT: 'Unnamed point west of Al-Salmi Border Post', QAT: 'Tuwayyir al Hamir',
  }
  for (const [code, label] of Object.entries(snapshots)) if (validRecords.find((record) => record.code === code)?.label !== label) failures.push(`${code}: expected snapshot ${label}`)
  const surveyCoordinates: Record<string, readonly [number, number, number]> = {
    BWA: [-24.840437, 25.66523, 1492.12], COL: [10.834718, -73.690453, 5720.42], SAU: [17.928547, 43.265528, 3001.8], UZB: [38.891634, 68.176775, 4668],
    GMB: [13.221566, -14.159756, 50.9], GNB: [11.683069, -13.892175, 266.2], TGO: [7.329054, 0.709001, 991.7],
  }
  for (const [code, expected] of Object.entries(surveyCoordinates)) {
    const record = validRecords.find((candidate) => candidate.code === code)
    if (!record || record.latitude !== expected[0] || record.longitude !== expected[1] || record.elevationMetres !== expected[2]) failures.push(`${code}: expected survey coordinate/elevation snapshot`)
  }
  const authoritativeElevations: Record<string, number> = { AND: 2942, BGD: 1052, CMR: 4095, CZE: 1603.3, GRC: 2918, HRV: 1831, JPN: 3776, KAZ: 7010, NZL: 3724, SGP: 163.63, VCT: 1220 }
  for (const [code, elevation] of Object.entries(authoritativeElevations)) if (validRecords.find((record) => record.code === code)?.elevationMetres !== elevation) failures.push(`${code}: expected authoritative elevation ${elevation}`)
  const correctedMarkers: Record<string, readonly [number, number]> = {
    BGD: [21.7863, 92.6095], CZE: [50.73609, 15.73979], DNK: [55.97743, 9.82635], GRC: [40.08175, 22.34954], HRV: [44.062472, 16.382861], LBN: [34.30128, 36.11513], MNG: [49.14646, 87.81896], PHL: [6.98781, 125.27109], QAT: [24.71553, 51.04686], VNM: [22.30343, 103.77494], YEM: [15.28078, 43.97801], ZWE: [-18.2955, 32.84184],
  }
  for (const [code, point] of Object.entries(correctedMarkers)) {
    const record = validRecords.find((candidate) => candidate.code === code)
    if (!record || record.latitude !== point[0] || record.longitude !== point[1]) failures.push(`${code}: expected corrected marker snapshot`)
  }
  return failures
}

export function validateHighPointDataset(value: unknown, codes = highPointEntityCodes): string[] {
  try {
    const dataset = parseHighPointDataset(value)
    return validateHighPointRecords(dataset.records, codes)
  } catch (error) {
    return [`dataset: ${(error as Error).message}`]
  }
}
