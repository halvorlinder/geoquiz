import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import capitals from '../src/data/capitals.json' with { type: 'json' }
import catalog from '../src/data/flags.json' with { type: 'json' }
import manifest from '../src/data/flag-assets-manifest.json' with { type: 'json' }
import { flagSvgSafetyIssue } from '../src/core/flagSvgSafety'
import { flagTerritoryContinents } from '../src/core/flagTerritoryContinentPolicy'
import entities from '../src/data/entities.json' with { type: 'json' }
import { pinnedFlagSource, validateDuplicateHashGroups, validateFlagCatalogPolicy } from './flag-catalog-policy'

type FlagRecord = { id: string; name: string; aliases: string[]; scope: string; studyKind: string; parent: string | null; sourceKey: string; assetPath: string; flagStatus: string; statusSource: string | null; note: string; checked: string }
type Asset = { id: string; sourceKey: string; path: string; sha256: string; flagStatus: string }
const root = resolve(import.meta.dirname, '..')
const flagsDirectory = join(root, 'public/flags/v1')
const records = catalog.records as FlagRecord[]
const assets = manifest.assets as Asset[]
const failures: string[] = []
const territoryIds = ['AX', 'FO', 'GL', 'HK', 'MO', 'AW', 'CW', 'SX', 'BQ-BO', 'BQ-SE', 'BQ-SA', 'CK', 'NU', 'TK', 'CX', 'CC', 'NF', 'PF', 'GG', 'IM', 'JE', 'AI', 'BM', 'VG', 'KY', 'FK', 'GI', 'MS', 'PN', 'TC', 'SH-HL', 'SH-AC', 'SH-TA', 'AS', 'GU', 'MP', 'PR', 'VI']
const exclusions = ['AQ', 'BV', 'HM', 'TF', 'GS', 'UM', 'IO', 'EH', 'NC', 'SJ']
const expectedSource = pinnedFlagSource
const approvedSourceKeys: Record<string, string> = `AFG AF AGO AO ALB AL AND AD ARE AE ARG AR ARM AM ATG AG AUS AU AUT AT AZE AZ BDI BI BEL BE BEN BJ BFA BF BGD BD BGR BG BHR BH BHS BS BIH BA BLR BY BLZ BZ BOL BO BRA BR BRB BB BRN BN BTN BT BWA BW CAF CF CAN CA CHE CH CHL CL CHN CN CIV CI CMR CM COD CD COG CG COL CO COM KM CPV CV CRI CR CUB CU CYP CY CZE CZ DEU DE DJI DJ DMA DM DNK DK DOM DO DZA DZ ECU EC EGY EG ERI ER ESP ES EST EE ETH ET FIN FI FJI FJ FRA FR FSM FM GAB GA GBR GB GEO GE GHA GH GIN GN GMB GM GNB GW GNQ GQ GRC GR GRD GD GTM GT GUY GY HND HN HRV HR HTI HT HUN HU IDN ID IND IN IRL IE IRN IR IRQ IQ ISL IS ISR IL ITA IT JAM JM JOR JO JPN JP KAZ KZ KEN KE KGZ KG KHM KH KIR KI KNA KN KOR KR KWT KW LAO LA LBN LB LBR LR LBY LY LCA LC LIE LI LKA LK LSO LS LTU LT LUX LU LVA LV MAR MA MCO MC MDA MD MDG MG MDV MV MEX MX MHL MH MKD MK MLI ML MLT MT MMR MM MNE ME MNG MN MOZ MZ MRT MR MUS MU MWI MW MYS MY NAM NA NER NE NGA NG NIC NI NLD NL NOR NO NPL NP NRU NR NZL NZ OMN OM PAK PK PAN PA PER PE PHL PH PLW PW PNG PG POL PL PRK KP PRT PT PRY PY PSE PS QAT QA ROU RO RUS RU RWA RW SAU SA SDN SD SEN SN SGP SG SLB SB SLE SL SLV SV SMR SM SOM SO SRB RS SSD SS STP ST SUR SR SVK SK SVN SI SWE SE SWZ SZ SYC SC SYR SY TCD TD TGO TG THA TH TJK TJ TKM TM TLS TL TON TO TTO TT TUN TN TUR TR TUV TV TWN TW TZA TZ UGA UG UKR UA URY UY USA US UZB UZ VAT VA VCT VC VEN VE VNM VN VUT VU WSM WS XKX XK YEM YE ZAF ZA ZMB ZM ZWE ZW AX AX FO FO GL GL HK HK MO MO AW AW CW CW SX SX BQ-BO BQ-BO BQ-SE BQ-SE BQ-SA BQ-SA CK CK NU NU TK TK CX CX CC CC NF NF PF PF GG GG IM IM JE JE AI AI BM BM VG VG KY KY FK FK GI GI MS MS PN PN TC TC SH-HL SH SH-AC AC SH-TA TA AS AS GU GU MP MP PR PR VI VI`.split(/\s+/).reduce<Record<string, string>>((result, value, index, values) => index % 2 === 0 ? result : { ...result, [values[index - 1]]: value }, {})
const normalizedLicenseSha256 = '49beb67bb906ea07f8ec63243df2197bbdd597dd075d736d852596359f69cee6'
const allowedStatusSources = new Set(['https://www.pmc.gov.au/sites/default/files/publications/australian-flags-booklet.pdf', 'https://www.college-of-arms.gov.uk/news-grants/news/item/111-ascension-island-flag'])
const normalize = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
const fail = (message: string) => failures.push(message)

if (!catalog || typeof catalog !== 'object' || Object.keys(catalog).sort().join(',') !== 'checked,records,source,version') throw new Error('Flag data validation failed:\n- catalog root schema has missing or extra fields')
if (!manifest || typeof manifest !== 'object' || Object.keys(manifest).sort().join(',') !== 'assets,checked,duplicateHashGroups,source,version') throw new Error('Flag data validation failed:\n- manifest root schema has missing or extra fields')
if (!Array.isArray(catalog.records) || !Array.isArray(manifest.assets)) throw new Error('Flag data validation failed:\n- catalog records and manifest assets must be arrays')
if (typeof catalog.version !== 'number' || typeof manifest.version !== 'number' || typeof catalog.checked !== 'string' || typeof manifest.checked !== 'string' || catalog.version !== 1 || manifest.version !== 1 || catalog.checked !== manifest.checked || catalog.checked !== '2026-08-20') fail('catalog and manifest version/checked metadata must be v1 and agree')
if (Object.keys(approvedSourceKeys).length !== 235) fail('approved source-key policy must contain exactly 235 records')
if (JSON.stringify(catalog.source) !== JSON.stringify(expectedSource) || JSON.stringify(manifest.source) !== JSON.stringify(expectedSource)) fail('source provenance does not match the approved pinned package')
try {
  const license = readFileSync(join(root, 'docs/licenses-country-flag-icons-MIT.txt'), 'utf8')
  if (createHash('sha256').update(license).digest('hex') !== normalizedLicenseSha256) fail('normalized MIT license hash mismatch')
} catch { fail('normalized MIT license is missing') }
if (records.length !== 235 || assets.length !== 235) fail(`expected 235 records and assets, found ${records.length}/${assets.length}`)
const sovereigns = records.filter((record) => record.scope === 'sovereign')
const territories = records.filter((record) => record.scope === 'territory')
if (sovereigns.length !== 197 || territories.length !== 38) fail(`scope counts must be 197/38, got ${sovereigns.length}/${territories.length}`)
if (territories.map((record) => record.id).join(',') !== territoryIds.join(',')) fail('territory roster differs from the approved exact roster')
const territoryPolicyIds = Object.keys(flagTerritoryContinents).sort()
if (territoryPolicyIds.length !== 38 || territoryPolicyIds.join(',') !== [...territoryIds].sort().join(',')) fail('territory continent policy must cover the exact approved 38-record roster')
const entityContinents = new Map(entities.entities.map((entity) => [entity.code, entity.continent]))
if (entityContinents.size !== 197) fail('entity catalog must provide exactly 197 sovereign continent assignments')
for (const id of exclusions) if (records.some((record) => record.id === id)) fail(`excluded record ${id} is present`)
const capitalEntities = new Map(capitals.flatMap((place) => place.entities.map((entity) => [entity.code, entity.country])))
failures.push(...validateFlagCatalogPolicy(catalog, capitalEntities))
for (const record of sovereigns) if (capitalEntities.get(record.id) !== record.name) fail(`${record.id} does not cross-reference its canonical capital entity name`)
for (const record of sovereigns) if (!entityContinents.has(record.id)) fail(`${record.id} has no sovereign entity continent assignment`)
const ids = new Set<string>(), paths = new Set<string>(), answers = new Map<string, string>(), assetIds = new Set<string>(), hashes = new Map<string, string[]>()
for (const record of records) {
  if (!record || typeof record !== 'object') { fail('catalog contains a non-object record'); continue }
  if (!/^[A-Z]{2,3}(?:-[A-Z]{2})?$/.test(record.id) || ids.has(record.id)) fail(`invalid or duplicate record id ${record.id}`)
  ids.add(record.id)
  if (Object.keys(record).sort().join(',') !== 'aliases,assetPath,checked,flagStatus,id,name,note,parent,scope,sourceKey,statusSource,studyKind'.split(',').sort().join(',')) fail(`${record.id} record schema has missing or extra fields`)
  if (typeof record.id !== 'string' || typeof record.name !== 'string' || !record.name.trim() || !Array.isArray(record.aliases) || !record.aliases.every((alias) => typeof alias === 'string' && alias.trim()) || typeof record.sourceKey !== 'string' || !record.sourceKey || typeof record.note !== 'string' || !record.note.trim() || record.checked !== '2026-08-20') fail(`${record.id} is missing required metadata`)
  if (!['sovereign', 'territory'].includes(record.scope) || !['sovereign-study', 'territory', 'associated-area'].includes(record.studyKind) || !['official-or-national', 'territorial-or-local', 'community-unofficial'].includes(record.flagStatus) || !(record.parent === null || typeof record.parent === 'string') || !(record.statusSource === null || allowedStatusSources.has(record.statusSource))) fail(`${record.id} has invalid enum or parent/status-source metadata`)
  if (record.scope === 'sovereign' && (record.parent !== null || record.studyKind !== 'sovereign-study') || record.scope === 'territory' && (!record.parent || record.studyKind === 'sovereign-study')) fail(`${record.id} violates parent/study-kind policy`)
  if (!/^\/flags\/v1\/[A-Z]{2,3}(?:-[A-Z]{2})?\.svg$/.test(record.assetPath) || paths.has(record.assetPath) || record.assetPath.includes(record.name)) fail(`${record.id} has an unsafe or non-ID asset path`)
  paths.add(record.assetPath)
  if (approvedSourceKeys[record.id] !== record.sourceKey) fail(`${record.id} does not match the independently approved source-key map`)
  if ((record.id === 'CX' || record.id === 'CC') && (record.flagStatus !== 'community-unofficial' || record.statusSource !== 'https://www.pmc.gov.au/sites/default/files/publications/australian-flags-booklet.pdf')) fail(`${record.id} must retain Australian Government community-used status provenance`)
  if (record.id === 'SH-AC' && record.statusSource !== 'https://www.college-of-arms.gov.uk/news-grants/news/item/111-ascension-island-flag') fail('SH-AC must retain its College of Arms provenance')
  const recordAnswers = new Set<string>()
  for (const answer of [record.name, ...record.aliases]) {
    const key = normalize(answer)
    if (recordAnswers.has(key)) fail(`${record.id} contains a redundant normalized alias '${answer}'`)
    recordAnswers.add(key)
    if (answers.has(key) && answers.get(key) !== record.id) fail(`${record.id} answer '${answer}' collides with ${answers.get(key)}`)
    answers.set(key, record.id)
  }
}
for (const asset of assets) {
  if (!asset || typeof asset !== 'object') { fail('manifest contains a non-object asset'); continue }
  if (Object.keys(asset).sort().join(',') !== 'flagStatus,id,path,sha256,sourceKey'.split(',').sort().join(',')) fail(`${asset.id} manifest asset schema has missing or extra fields`)
  if (assetIds.has(asset.id)) fail(`duplicate manifest asset ${asset.id}`)
  assetIds.add(asset.id)
  const record = records.find((candidate) => candidate.id === asset.id)
  if (!record || asset.path !== record.assetPath || asset.sourceKey !== record.sourceKey || asset.flagStatus !== record.flagStatus) fail(`${asset.id} manifest and catalog mismatch`)
  const file = join(root, 'public', asset.path)
  let content: string
  try { content = readFileSync(file, 'utf8') } catch { fail(`${asset.id} missing local SVG`); continue }
  if (!/^[a-f0-9]{64}$/.test(asset.sha256)) fail(`${asset.id} SHA-256 format is invalid`)
  const hash = createHash('sha256').update(content).digest('hex')
  if (hash !== asset.sha256) fail(`${asset.id} hash mismatch`)
  const safetyIssue = flagSvgSafetyIssue(content)
  if (safetyIssue) fail(`${asset.id} fails SVG safety policy: ${safetyIssue}`)
  const group = hashes.get(hash) ?? []
  group.push(asset.id)
  hashes.set(hash, group)
}
const entries = readdirSync(flagsDirectory, { withFileTypes: true })
for (const entry of entries) if (!entry.isFile() || entry.isSymbolicLink() || !entry.name.endsWith('.svg') || !lstatSync(join(flagsDirectory, entry.name)).isFile()) fail(`unexpected flag-directory entry ${entry.name}`)
const files = entries.map((entry) => entry.name).sort()
if (files.length !== 235 || files.join(',') !== records.map((record) => `${record.id}.svg`).sort().join(',')) fail('local SVG directory is not an exact catalog 1:1 match')
failures.push(...validateDuplicateHashGroups(manifest.duplicateHashGroups, assetIds, [...hashes.values()].filter((group) => group.length > 1)))
if (failures.length) throw new Error(`Flag data validation failed:\n- ${failures.join('\n- ')}`)
console.log(`Validated ${records.length} flag records (${sovereigns.length} sovereign study entities, ${territories.length} territories), ${assets.length} local SVGs.`)
