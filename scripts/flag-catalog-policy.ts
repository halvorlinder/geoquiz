export const pinnedFlagSource = { package: 'country-flag-icons', version: '1.6.20', tarball: 'https://registry.npmjs.org/country-flag-icons/-/country-flag-icons-1.6.20.tgz', integrity: 'sha512-py8JiEKzjhYw6HPJ0L7SxLgCYim36UPRTZX43/kqGueUCZLSvnrqAiwW8HtQibur7mdkFQUkjOgdK+o/9FBtaw==', gitHead: '3b8ea50f08ab9d5e79c90325ff76606a4258a719', license: 'MIT' } as const
export const ordinaryFlagNote = 'Status is a study-data description, not a sovereignty or public-domain claim.'
export const communityFlagNote = 'Australian Government Flags booklet (2024) describes this flag as community-used rather than formally adopted.'
export const saintHelenaFlagNote = 'Distinct Saint Helena, Ascension, and Tristan da Cunha assets describe local/territorial use and do not make a sovereignty claim.'

const sovereignKeys: Record<string, string> = `AFG AF AGO AO ALB AL AND AD ARE AE ARG AR ARM AM ATG AG AUS AU AUT AT AZE AZ BDI BI BEL BE BEN BJ BFA BF BGD BD BGR BG BHR BH BHS BS BIH BA BLR BY BLZ BZ BOL BO BRA BR BRB BB BRN BN BTN BT BWA BW CAF CF CAN CA CHE CH CHL CL CHN CN CIV CI CMR CM COD CD COG CG COL CO COM KM CPV CV CRI CR CUB CU CYP CY CZE CZ DEU DE DJI DJ DMA DM DNK DK DOM DO DZA DZ ECU EC EGY EG ERI ER ESP ES EST EE ETH ET FIN FI FJI FJ FRA FR FSM FM GAB GA GBR GB GEO GE GHA GH GIN GN GMB GM GNB GW GNQ GQ GRC GR GRD GD GTM GT GUY GY HND HN HRV HR HTI HT HUN HU IDN ID IND IN IRL IE IRN IR IRQ IQ ISL IS ISR IL ITA IT JAM JM JOR JO JPN JP KAZ KZ KEN KE KGZ KG KHM KH KIR KI KNA KN KOR KR KWT KW LAO LA LBN LB LBR LR LBY LY LCA LC LIE LI LKA LK LSO LS LTU LT LUX LU LVA LV MAR MA MCO MC MDA MD MDG MG MDV MV MEX MX MHL MH MKD MK MLI ML MLT MT MMR MM MNE ME MNG MN MOZ MZ MRT MR MUS MU MWI MW MYS MY NAM NA NER NE NGA NG NIC NI NLD NL NOR NO NPL NP NRU NR NZL NZ OMN OM PAK PK PAN PA PER PE PHL PH PLW PW PNG PG POL PL PRK KP PRT PT PRY PY PSE PS QAT QA ROU RO RUS RU RWA RW SAU SA SDN SD SEN SN SGP SG SLB SB SLE SL SLV SV SMR SM SOM SO SRB RS SSD SS STP ST SUR SR SVK SK SVN SI SWE SE SWZ SZ SYC SC SYR SY TCD TD TGO TG THA TH TJK TJ TKM TM TLS TL TON TO TTO TT TUN TN TUR TR TUV TV TWN TW TZA TZ UGA UG UKR UA URY UY USA US UZB UZ VAT VA VCT VC VEN VE VNM VN VUT VU WSM WS XKX XK YEM YE ZAF ZA ZMB ZM ZWE ZW`.split(/\s+/).reduce<Record<string, string>>((map, value, index, values) => index % 2 ? { ...map, [values[index - 1]]: value } : map, {})

// Sovereign abbreviations are owned by entities.json so the neighbour and flag
// quizzes share the exact-only answer policy. Territory aliases remain here.
const sovereignAliases: Record<string, string[]> = { BRN: ['Brunei Darussalam'], CIV: ['Ivory Coast'], CPV: ['Cape Verde'], CZE: ['Czech Republic'], FSM: ['Micronesia'], LAO: ['Lao PDR'], PSE: ['Palestine'], SWZ: ['Swaziland'], TLS: ['East Timor'], TUR: ['Turkey'] }

export const territoryPolicy = [
  ['AX', 'Åland Islands', [], 'Finland', 'territory', 'AX', 'territorial-or-local', null], ['FO', 'Faroe Islands', [], 'Denmark', 'territory', 'FO', 'territorial-or-local', null], ['GL', 'Greenland', [], 'Denmark', 'territory', 'GL', 'territorial-or-local', null], ['HK', 'Hong Kong', [], 'China', 'territory', 'HK', 'territorial-or-local', null], ['MO', 'Macao', ['Macau'], 'China', 'territory', 'MO', 'territorial-or-local', null],
  ['AW', 'Aruba', [], 'Kingdom of the Netherlands', 'territory', 'AW', 'territorial-or-local', null], ['CW', 'Curaçao', [], 'Kingdom of the Netherlands', 'territory', 'CW', 'territorial-or-local', null], ['SX', 'Sint Maarten', [], 'Kingdom of the Netherlands', 'territory', 'SX', 'territorial-or-local', null], ['BQ-BO', 'Bonaire', [], 'Netherlands', 'territory', 'BQ-BO', 'territorial-or-local', null], ['BQ-SE', 'Sint Eustatius', [], 'Netherlands', 'territory', 'BQ-SE', 'territorial-or-local', null], ['BQ-SA', 'Saba', [], 'Netherlands', 'territory', 'BQ-SA', 'territorial-or-local', null],
  ['CK', 'Cook Islands', [], 'New Zealand association', 'associated-area', 'CK', 'territorial-or-local', null], ['NU', 'Niue', [], 'New Zealand association', 'associated-area', 'NU', 'territorial-or-local', null], ['TK', 'Tokelau', [], 'New Zealand association', 'territory', 'TK', 'territorial-or-local', null], ['CX', 'Christmas Island', [], 'Australia', 'territory', 'CX', 'community-unofficial', 'https://www.pmc.gov.au/sites/default/files/publications/australian-flags-booklet.pdf'], ['CC', 'Cocos (Keeling) Islands', ['Cocos Islands'], 'Australia', 'territory', 'CC', 'community-unofficial', 'https://www.pmc.gov.au/sites/default/files/publications/australian-flags-booklet.pdf'], ['NF', 'Norfolk Island', [], 'Australia', 'territory', 'NF', 'territorial-or-local', null], ['PF', 'French Polynesia', [], 'France', 'territory', 'PF', 'territorial-or-local', null],
  ['GG', 'Guernsey', [], 'Crown Dependency', 'associated-area', 'GG', 'territorial-or-local', null], ['IM', 'Isle of Man', [], 'Crown Dependency', 'associated-area', 'IM', 'territorial-or-local', null], ['JE', 'Jersey', [], 'Crown Dependency', 'associated-area', 'JE', 'territorial-or-local', null], ['AI', 'Anguilla', [], 'United Kingdom', 'territory', 'AI', 'territorial-or-local', null], ['BM', 'Bermuda', [], 'United Kingdom', 'territory', 'BM', 'territorial-or-local', null], ['VG', 'British Virgin Islands', ['Virgin Islands (British)'], 'United Kingdom', 'territory', 'VG', 'territorial-or-local', null], ['KY', 'Cayman Islands', [], 'United Kingdom', 'territory', 'KY', 'territorial-or-local', null], ['FK', 'Falkland Islands (Malvinas)', ['Falkland Islands'], 'United Kingdom', 'territory', 'FK', 'territorial-or-local', null], ['GI', 'Gibraltar', [], 'United Kingdom', 'territory', 'GI', 'territorial-or-local', null], ['MS', 'Montserrat', [], 'United Kingdom', 'territory', 'MS', 'territorial-or-local', null], ['PN', 'Pitcairn', [], 'United Kingdom', 'territory', 'PN', 'territorial-or-local', null], ['TC', 'Turks and Caicos Islands', [], 'United Kingdom', 'territory', 'TC', 'territorial-or-local', null], ['SH-HL', 'Saint Helena', [], 'United Kingdom', 'territory', 'SH', 'territorial-or-local', null], ['SH-AC', 'Ascension Island', [], 'United Kingdom', 'territory', 'AC', 'territorial-or-local', 'https://www.college-of-arms.gov.uk/news-grants/news/item/111-ascension-island-flag'], ['SH-TA', 'Tristan da Cunha', [], 'United Kingdom', 'territory', 'TA', 'territorial-or-local', null],
  ['AS', 'American Samoa', [], 'United States', 'territory', 'AS', 'territorial-or-local', null], ['GU', 'Guam', [], 'United States', 'territory', 'GU', 'territorial-or-local', null], ['MP', 'Northern Mariana Islands', ['Northern Marianas', 'Northern Marianas Islands'], 'United States', 'territory', 'MP', 'territorial-or-local', null], ['PR', 'Puerto Rico', [], 'United States', 'territory', 'PR', 'territorial-or-local', null], ['VI', 'United States Virgin Islands', ['USVI', 'U.S. Virgin Islands', 'US Virgin Islands'], 'United States', 'territory', 'VI', 'territorial-or-local', null],
] as const

type CatalogRecord = { id: string; name: string; aliases: string[]; scope: string; studyKind: string; parent: string | null; sourceKey: string; assetPath: string; flagStatus: string; statusSource: string | null; note: string; checked: string }
type EntityAnswerRecord = { code: string; name: string; aliases: string[]; abbreviations: string[] }
const recordKeys = 'aliases,assetPath,checked,flagStatus,id,name,note,parent,scope,sourceKey,statusSource,studyKind'.split(',').sort().join(',')
const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
const compactNormalize = (value: string) => normalize(value).replace(/\s/g, '')

export function validateFlagCatalogPolicy(value: unknown, capitalEntities: Map<string, string>): string[] {
  const failures: string[] = []
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['catalog root must be an object']
  const catalog = value as { version?: unknown; checked?: unknown; source?: unknown; records?: unknown }
  if (Object.keys(catalog).sort().join(',') !== 'checked,records,source,version') return ['catalog root schema has missing or extra fields']
  if (catalog.version !== 2 || catalog.checked !== '2026-08-20' || JSON.stringify(catalog.source) !== JSON.stringify(pinnedFlagSource) || !Array.isArray(catalog.records)) return ['catalog root version, checked, source, or records is invalid']
  if (catalog.records.length !== 235 || Object.keys(sovereignKeys).length !== 197 || territoryPolicy.length !== 38) failures.push('catalog must contain exact 197 sovereign and 38 territory records')
  const byId = new Map<string, CatalogRecord>()
  for (const raw of catalog.records) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { failures.push('catalog contains a non-object record'); continue }
    const record = raw as CatalogRecord
    if (Object.keys(record).sort().join(',') !== recordKeys) { failures.push(`${record.id ?? 'unknown'}: record schema has missing or extra fields`); continue }
    if (!/^[A-Z]{2,3}(?:-[A-Z]{2})?$/.test(record.id) || byId.has(record.id)) { failures.push(`${record.id}: invalid or duplicate stable ID`); continue }
    if (typeof record.name !== 'string' || !record.name.trim() || !Array.isArray(record.aliases) || !record.aliases.every((alias) => typeof alias === 'string' && alias.trim()) || typeof record.note !== 'string' || !record.note.trim() || record.checked !== '2026-08-20') failures.push(`${record.id}: invalid textual metadata`)
    if (record.assetPath !== `/flags/v1/${record.id}.svg`) failures.push(`${record.id}: asset path must be exact ID-based path`)
    byId.set(record.id, record)
  }
  for (const [id, sourceKey] of Object.entries(sovereignKeys)) {
    const record = byId.get(id)
    if (!record) { failures.push(`${id}: missing sovereign record`); continue }
    if (record.name !== capitalEntities.get(id) || record.sourceKey !== sourceKey || record.scope !== 'sovereign' || record.studyKind !== 'sovereign-study' || record.parent !== null || record.statusSource !== null || record.flagStatus !== 'official-or-national') failures.push(`${id}: sovereign policy mismatch`)
    if (record.note !== ordinaryFlagNote) failures.push(`${id}: sovereign note differs from approved policy`)
    if (JSON.stringify(record.aliases) !== JSON.stringify(sovereignAliases[id] ?? [])) failures.push(`${id}: sovereign aliases differ from approved policy`)
  }
  for (const [id, name, aliases, parent, studyKind, sourceKey, flagStatus, statusSource] of territoryPolicy) {
    const record = byId.get(id)
    if (!record) { failures.push(`${id}: missing territory record`); continue }
    if (record.name !== name || JSON.stringify(record.aliases) !== JSON.stringify(aliases) || record.scope !== 'territory' || record.parent !== parent || record.studyKind !== studyKind || record.sourceKey !== sourceKey || record.flagStatus !== flagStatus || record.statusSource !== statusSource) failures.push(`${id}: territory policy mismatch`)
    const expectedNote = id === 'CX' || id === 'CC' ? communityFlagNote : id.startsWith('SH-') ? saintHelenaFlagNote : ordinaryFlagNote
    if (record.note !== expectedNote) failures.push(`${id}: territory note differs from approved policy`)
  }
  for (const id of byId.keys()) if (!(id in sovereignKeys) && !territoryPolicy.some(([territoryId]) => territoryId === id)) failures.push(`${id}: record is outside approved policy`)
  const answers = new Map<string, string>()
  for (const record of byId.values()) for (const answer of [record.name, ...record.aliases]) {
    const key = normalize(answer)
    if (answers.has(key)) failures.push(`${record.id}: duplicate normalized answer ${answer}`)
    answers.set(key, record.id)
  }
  return failures
}

/**
 * Validates collisions by actual submitted-token semantics, rather than by the
 * candidate implementation detail. An ordinary territory alias `CAR`, for
 * example, conflicts with CAF's compact exact-only `CAR` abbreviation.
 */
export function validateFlagAnswerOwnership(value: unknown, entityCatalog: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['flag answer ownership: catalog must be an object']
  if (!entityCatalog || typeof entityCatalog !== 'object' || Array.isArray(entityCatalog)) return ['flag answer ownership: entity catalog must be an object']
  const records = (value as { records?: unknown }).records
  const entities = (entityCatalog as { entities?: unknown }).entities
  if (!Array.isArray(records) || !Array.isArray(entities)) return ['flag answer ownership: records and entities must be arrays']
  const entityByCode = new Map<string, EntityAnswerRecord>()
  for (const rawEntity of entities) {
    if (!rawEntity || typeof rawEntity !== 'object' || Array.isArray(rawEntity)) continue
    const entity = rawEntity as Partial<EntityAnswerRecord>
    if (typeof entity.code === 'string' && typeof entity.name === 'string' && Array.isArray(entity.aliases) && Array.isArray(entity.abbreviations) && entity.aliases.every((alias) => typeof alias === 'string') && entity.abbreviations.every((abbreviation) => typeof abbreviation === 'string')) entityByCode.set(entity.code, entity as EntityAnswerRecord)
  }
  const ordinaryOwners = new Map<string, string>()
  const ordinaryCompactOwners = new Map<string, Set<string>>()
  const abbreviationOwners = new Map<string, string>()
  const failures: string[] = []
  const claimOrdinary = (answer: string, owner: string) => {
    const key = normalize(answer)
    const existing = ordinaryOwners.get(key)
    if (existing && existing !== owner) failures.push(`flag answer '${answer}' collides with ${existing} and ${owner}`)
    ordinaryOwners.set(key, owner)
    const compact = compactNormalize(answer)
    const compactOwners = ordinaryCompactOwners.get(compact) ?? new Set<string>()
    compactOwners.add(owner)
    ordinaryCompactOwners.set(compact, compactOwners)
  }
  for (const rawRecord of records) {
    if (!rawRecord || typeof rawRecord !== 'object' || Array.isArray(rawRecord)) continue
    const record = rawRecord as Partial<CatalogRecord>
    if (typeof record.id !== 'string' || typeof record.name !== 'string' || !Array.isArray(record.aliases) || !record.aliases.every((alias) => typeof alias === 'string')) continue
    const entity = record.scope === 'sovereign' ? entityByCode.get(record.id) : undefined
    for (const answer of [record.name, ...record.aliases, ...(entity ? [entity.name, ...entity.aliases] : [])]) claimOrdinary(answer, record.id)
  }
  for (const rawRecord of records) {
    if (!rawRecord || typeof rawRecord !== 'object' || Array.isArray(rawRecord)) continue
    const record = rawRecord as Partial<CatalogRecord>
    if (record.scope !== 'sovereign' || typeof record.id !== 'string') continue
    const entity = entityByCode.get(record.id)
    if (!entity) continue
    for (const abbreviation of entity.abbreviations) {
      const key = compactNormalize(abbreviation)
      const existing = abbreviationOwners.get(key)
      if (existing && existing !== record.id) failures.push(`flag abbreviation '${abbreviation}' collides with ${existing} and ${record.id}`)
      abbreviationOwners.set(key, record.id)
      for (const ordinaryOwner of ordinaryCompactOwners.get(key) ?? []) if (ordinaryOwner !== record.id) failures.push(`flag abbreviation '${abbreviation}' collides with ordinary answer of ${ordinaryOwner} and ${record.id}`)
    }
  }
  return [...new Set(failures)]
}

export function validateDuplicateHashGroups(value: unknown, assetIds: Set<string>, actualGroups: string[][]): string[] {
  const failures: string[] = []
  if (!Array.isArray(value)) return ['duplicateHashGroups must be an array']
  const declared = value.map((group) => {
    if (!Array.isArray(group) || group.length < 2 || !group.every((id) => typeof id === 'string') || new Set(group).size !== group.length || !group.every((id) => assetIds.has(id))) failures.push('duplicateHashGroups contains an invalid group')
    return Array.isArray(group) ? [...group].sort().join(',') : ''
  })
  if (new Set(declared).size !== declared.length) failures.push('duplicateHashGroups contains duplicate declarations')
  const actual = actualGroups.map((group) => [...group].sort().join(','))
  for (const group of actual) if (!declared.includes(group)) failures.push(`identical SVG bytes need an explicit duplicate group: ${group}`)
  for (const group of declared) if (!actual.includes(group)) failures.push(`duplicateHashGroups declares a stale or false group: ${group}`)
  return failures
}
