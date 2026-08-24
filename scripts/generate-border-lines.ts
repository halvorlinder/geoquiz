import { createHash } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import countryShapes from '../src/data/country-shapes.json' with { type: 'json' }
import neighbours from '../src/data/neighbours.json' with { type: 'json' }
import provenance from './border-lines-provenance.json' with { type: 'json' }
import { decodeShapePolygons, type CountryShape, type CountryShapeDataset } from '../src/core/countryShapes'

const ROOT = join(import.meta.dirname, '..')
const SOURCE = join(ROOT, 'public/data-sources/border-countries/overture-divisions-2026-08-19.0.json.gz')
const OUTPUT = join(ROOT, 'src/data/border-lines.json')
const PUBLIC_OUTPUT = join(ROOT, 'public/data-sources/border-countries/border-lines-v1.json')
const INPUT = join(ROOT, '.handover/tmp/overture')
const SCALE = 10_000_000

const overridePairs = new Map<string, string>([
  ['AND,ESP', '7086d103-61e3-3e8c-8b44-3606d7ee7037'], ['AND,FRA', 'e903e4f3-09e9-3c08-a455-1bb6f57657bf'],
  ['AUT,LIE', '9210bb50-70b2-3bdf-bd92-1e302c70911f'], ['BWA,ZMB', 'b92c9fe9-b80d-3dda-9f8a-ec94497c323f'],
  ['CHE,LIE', '27baa767-50ac-3e8e-a021-9b85b69535e0'], ['ESP,MAR', 'bedca194-3a06-3164-ab50-6b2b30af69d3'],
  ['FRA,MCO', '89e7f282-2515-3275-82f7-4a91e58507d5'], ['ITA,SMR', '08c56ad5-9294-37cb-ab9b-65f2b27fd6ad'],
  ['ITA,VAT', '1031e8f1-8945-37c8-9946-f735dabeb14a'],
])
const overtureCountry = Object.freeze({ AND: 'AD', AUT: 'AT', BWA: 'BW', CHE: 'CH', ESP: 'ES', FRA: 'FR', ITA: 'IT', LIE: 'LI', MAR: 'MA', MCO: 'MC', SMR: 'SM', VAT: 'VA', ZMB: 'ZM' } as const)

type Position = readonly [number, number]
type Source = { readonly release: string; readonly boundaries: Record<string, { id: string; wkt: string }>; readonly areas: Record<string, { id: string; wkt: string; sources: string }>; readonly provenance: string; readonly inputHashes: Record<string, string> }
type BorderLine = { readonly codes: readonly [string, string]; readonly path: readonly Position[]; readonly source: 'current-shapes' | 'overture-2026-08-19.0' }

function pkey([x, y]: Position) { return `${Math.round(x * SCALE)},${Math.round(y * SCALE)}` }
function skey(a: Position, b: Position) { const left = pkey(a), right = pkey(b); return left < right ? `${left}|${right}` : `${right}|${left}` }
function finite(position: Position) { return Number.isFinite(position[0]) && Number.isFinite(position[1]) }
function sha(path: string) { return createHash('sha256').update(readFileSync(path)).digest('hex') }
function validatePinnedSource(source: Source): void {
  if (sha(SOURCE) !== provenance.sourceSha256 || source.release !== provenance.release) throw new Error('Pinned Overture source hash or release lock failed.')
  if (provenance.boundaryArtifact !== 's3://overturemaps-us-west-2/release/2026-08-19.0/theme=divisions/type=division_boundary/*' || provenance.areaArtifact !== 's3://overturemaps-us-west-2/release/2026-08-19.0/theme=divisions/type=division_area/*') throw new Error('Pinned Overture artifact URI lock failed.')
  const actualBoundaries = Object.fromEntries([...overridePairs.entries()].map(([pair, id]) => [pair, id]))
  if (JSON.stringify(actualBoundaries) !== JSON.stringify(provenance.boundaries)) throw new Error('Pinned Overture boundary manifest lock failed.')
  const actualAreas = Object.fromEntries(Object.entries(source.areas).sort(([a],[b])=>a.localeCompare(b)).map(([code, area]) => [code, area.id]))
  const expectedAreas = Object.fromEntries(Object.entries(provenance.areas).sort(([a],[b])=>a.localeCompare(b)))
  if (JSON.stringify(actualAreas) !== JSON.stringify(expectedAreas)) throw new Error('Pinned Overture area manifest lock failed.')
  for (const [code, area] of Object.entries(source.areas)) {
    const geometrySource = (JSON.parse(area.sources) as readonly { property: string; dataset: string; license: string; record_id: string; provider: string | null; resource: string | null; version: string | null }[]).find((entry) => entry.property === '')
    const expectedRecord = (provenance.areaGeometrySources as Record<string, string>)[code]
    if (!geometrySource || geometrySource.dataset !== 'OpenStreetMap' || geometrySource.license !== 'ODbL-1.0' || geometrySource.record_id !== expectedRecord || geometrySource.provider !== 'osm' || geometrySource.resource !== 'planet' || geometrySource.version !== provenance.osmPlanetSnapshot) throw new Error(`Pinned Overture raw area provider/license/revision lock failed for ${code}.`)
  }
  if (!source.provenance.includes("ODbL-1.0") || !source.provenance.includes('r9407@88')) throw new Error('Pinned Overture provider/relation provenance lock failed.')
}

function csv(row: string): string[] {
  const fields: string[] = []; let value = ''; let quoted = false
  for (let i = 0; i < row.length; i += 1) {
    const char = row[i]
    if (char === '"') { if (quoted && row[i + 1] === '"') { value += char; i += 1 } else quoted = !quoted }
    else if (char === ',' && !quoted) { fields.push(value); value = '' } else value += char
  }
  fields.push(value); return fields
}
function rows(path: string): Record<string, string>[] {
  const [header, ...body] = readFileSync(path, 'utf8').trimEnd().split('\n'); const names = csv(header)
  return body.map((line) => Object.fromEntries(csv(line).map((value, index) => [names[index], value])))
}
function countryAreas(): Source['areas'] {
  const output: Source['areas'] = {}
  const rawSources = new Map(rows(join(INPUT, 'critical-area-provenance.csv')).map((row) => [row.id, row.sources]))
  for (const file of ['critical-land-areas.csv', 'austria-area.csv']) for (const row of rows(join(INPUT, file))) {
    if (['AD','AT','BW','CH','ES','FR','IT','LI','MA','MC','SM','VA','ZM'].includes(row.country)) { const sources=rawSources.get(row.id); if(!sources) throw new Error(`Missing raw Overture area sources for ${row.country}.`); output[row.country] = { id: row.id, wkt: row.wkt, sources } }
  }
  return output
}
export function extractPinnedOvertureSource(): Source {
  const wanted = new Set(overridePairs.values()); const boundaries: Source['boundaries'] = {}
  for (const row of rows(join(INPUT, 'country-land-boundaries.csv'))) if (wanted.has(row.id)) boundaries[row.id] = { id: row.id, wkt: row.wkt }
  if (Object.keys(boundaries).length !== 9) throw new Error('Pinned Overture input is missing an approved boundary record.')
  const areas = countryAreas(); if (Object.keys(areas).length !== 13) throw new Error('Pinned Overture input is missing an approved country land area.')
  const provenance = readFileSync(join(INPUT, 'critical-boundary-provenance.csv'), 'utf8')
  const inputHashes = Object.fromEntries(['country-land-boundaries.csv','critical-land-areas.csv','austria-area.csv','critical-boundary-provenance.csv','critical-area-provenance.csv'].map((file) => [file, sha(join(INPUT, file))]))
  return { release: '2026-08-19.0', boundaries, areas, provenance, inputHashes }
}
export function parseLineComponents(wkt: string): Position[][] {
  const body = wkt.replace(/^MULTILINESTRING\s*/i, '').replace(/^LINESTRING\s*/i, '').trim()
  const parts = body.startsWith('((') ? [...body.matchAll(/\(([^()]+)\)/g)].map((match) => match[1]) : [body.replace(/^\(|\)$/g, '')]
  const lines = parts.map((part) => part.split(',').map((pair) => pair.trim().split(/\s+/).map(Number) as unknown as Position).filter(finite)).filter((line) => line.length >= 2)
  if (!lines.length) throw new Error('Expected Overture line WKT.'); return lines
}
function parseRings(wkt: string): Position[][] {
  const rings: Position[][] = []; for (const match of wkt.matchAll(/\(([^()]+)\)/g)) {
    const ring = match[1].split(',').map((pair) => pair.trim().split(/\s+/).map(Number) as unknown as Position).filter(finite)
    if (ring.length >= 4) rings.push(ring)
  }; if (!rings.length) throw new Error('Expected Overture polygon WKT.'); return rings
}
function shapePositions(shape: CountryShape): Position[][] {
  const scale = shape.coordinateScale ?? 1000; const [west,, ,north] = shape.bounds
  return decodeShapePolygons(shape).flatMap((polygon) => polygon.map((ring) => { const output=ring.map(([x,y]) => [west + x / scale, north - y / scale] as Position); return pkey(output[0])===pkey(output.at(-1)!) ? output : [...output,output[0]] }))
}
function segments(rings: readonly Position[][]) { return new Set(rings.flatMap((ring) => ring.slice(1).map((point, index) => skey(ring[index], point)))) }
function distance(a: Position, b: Position): number { const r=Math.PI/180; const dLat=(b[1]-a[1])*r,dLon=(b[0]-a[0])*r; const q=Math.sin(dLat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dLon/2)**2; return 6371e3*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q)) }
export function geodesicLineLength(points: readonly Position[]): number { return points.slice(1).reduce((sum,point,index)=>sum+distance(points[index],point),0) }
export function longestSharedPath(rings: readonly Position[][], other: ReadonlySet<string>): Position[] | undefined {
  let best: Position[] = []; let bestLength = -1
  for (const ring of rings) {
    let candidate = ring
    // Closed rings have no natural first segment. Rotate at a non-shared edge
    // so a continuous run crossing the encoded seam remains one candidate.
    if (ring.length > 3 && pkey(ring[0]) === pkey(ring.at(-1)!) && other.has(skey(ring[0], ring[1])) && other.has(skey(ring.at(-2)!, ring.at(-1)!))) {
      const breakAt = ring.slice(1).findIndex((point, index) => !other.has(skey(ring[index], point)))
      if (breakAt >= 0) candidate = [...ring.slice(breakAt + 1, -1), ...ring.slice(0, breakAt + 2)]
    }
    let current: Position[] = []
    for (let index = 1; index < candidate.length; index += 1) {
      if (other.has(skey(candidate[index - 1], candidate[index]))) { if (!current.length) current = [candidate[index - 1]]; current.push(candidate[index]) }
      else { if (current.length >= 2 && geodesicLineLength(current) > bestLength) { best = current; bestLength=geodesicLineLength(current) } current = [] }
    }; if (current.length >= 2 && geodesicLineLength(current) > bestLength) { best = current; bestLength=geodesicLineLength(current) }
  }
  return best.length >= 2 ? best : undefined
}
function rdp(points: readonly Position[], epsilon: number): Position[] {
  if (points.length < 3) return [...points]; const [a,b] = [points[0], points.at(-1)!]
  const dx=b[0]-a[0], dy=b[1]-a[1], denominator=Math.hypot(dx,dy) || 1
  let max=0, at=0; for(let i=1;i<points.length-1;i+=1){ const p=points[i]; const d=Math.abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/denominator; if(d>max){max=d;at=i} }
  if(max<=epsilon) return [a,b]; return [...rdp(points.slice(0,at+1),epsilon).slice(0,-1),...rdp(points.slice(at),epsilon)]
}
function encode(points: readonly Position[]): number[] { let x = 0, y = 0; const output: number[] = []; for (const point of points) { const nextX = Math.round(point[0] * SCALE), nextY = Math.round(point[1] * SCALE); output.push(nextX - x, nextY - y); x = nextX; y = nextY }; return output }
function simplifyRing(ring: Position[], protectedPoints: ReadonlySet<string>): Position[] {
  const closed = pkey(ring[0]) === pkey(ring.at(-1)!) ? ring : [...ring, ring[0]]
  const anchors = closed.slice(0,-1).map((p,i) => protectedPoints.has(pkey(p)) ? i : -1).filter((i) => i >= 0)
  if (!anchors.length) { const simple = rdp(closed.slice(0, -1), 0.006); const output = simple.length >= 3 ? simple : closed.slice(0, -1); return [...output, output[0]] }
  const first=anchors[0]; const rotated=[...closed.slice(first,-1),...closed.slice(0,first+1)]; const boundaries=rotated.map((p,i)=>protectedPoints.has(pkey(p))?i:-1).filter(i=>i>=0)
  const output: Position[]=[]; for(let i=1;i<boundaries.length;i+=1) output.push(...rdp(rotated.slice(boundaries[i-1],boundaries[i]+1),0.006).slice(i===1?0:1))
  if (output.length < 4) return closed; if (pkey(output[0]) !== pkey(output.at(-1)!)) output.push(output[0]); return output
}
function exactPathForOverride(source: Source, pair: string): Position[] {
  const [left,right] = pair.split(','); const line=parseLineComponents(source.boundaries[overridePairs.get(pair)!].wkt)
  const leftSegments=segments(parseRings(source.areas[overtureCountry[left as keyof typeof overtureCountry]].wkt)); const rightSegments=segments(parseRings(source.areas[overtureCountry[right as keyof typeof overtureCountry]].wkt)); const exact=new Set([...leftSegments].filter((value)=>rightSegments.has(value)))
  const run=longestSharedPath(line,exact); if (!run) throw new Error(`${pair}: no byte-exact Overture area-aligned run.`)
  if (pair === 'ESP,MAR') { const longitude=run.reduce((sum,point)=>sum+point[0],0)/run.length; const kilometres=geodesicLineLength(run)/1000; if (longitude > -2.8 || longitude < -3.1 || kilometres < 9.9 || kilometres > 10.1) throw new Error('ESP,MAR primary run must remain the Melilla fixture.') }
  return run
}
function currentLine(pair: string, shapes: CountryShapeDataset): Position[] {
  const [left,right]=pair.split(','); const a=shapes.shapes[left], b=shapes.shapes[right]; if(!a||!b) throw new Error(`${pair}: missing current shape.`)
  const run=longestSharedPath(shapePositions(a),segments(shapePositions(b))); if(!run) throw new Error(`${pair}: no current exact run.`); return run
}
function derive(source: Source) {
  const shapeDataset=countryShapes as unknown as CountryShapeDataset; const pairs=(neighbours as unknown as { boundaries: { codes: [string,string] }[] }).boundaries.map((edge)=>edge.codes.join(','))
  if(pairs.length!==317) throw new Error('Neighbour authority must contain 317 pairs.')
  const lines: BorderLine[] = pairs.map((pair) => ({ codes: pair.split(',') as [string,string], path: overridePairs.has(pair) ? exactPathForOverride(source,pair) : currentLine(pair,shapeDataset), source: overridePairs.has(pair) ? 'overture-2026-08-19.0' : 'current-shapes' }))
  const overrideShapes: Record<string, readonly Position[][]> = {}; const protect = new Map<string, Set<string>>()
  for(const line of lines.filter((line)=>line.source==='overture-2026-08-19.0')) for(const code of line.codes) { const set=protect.get(code)??new Set<string>(); line.path.forEach((point)=>set.add(pkey(point))); protect.set(code,set) }
  for(const [code,area] of Object.entries(source.areas)) { const studyCode = (Object.entries(overtureCountry).find(([, value]) => value === code)?.[0] ?? code); overrideShapes[studyCode]=parseRings(area.wkt).map((ring)=>simplifyRing(ring,protect.get(studyCode)??new Set())) }
  const output={ version: 1, dataVersion: 'border-lines-v1-orientation-1-overture-2026-08-19.0', primaryRunRule: 'longest-byte-exact-continuous-shared-land-area-run', source: { overtureRelease: source.release, osmPlanetSnapshot: '2026-07-23T00:00:00Z', inputHashes: source.inputHashes, sourceSha256: sha(SOURCE) }, lines: lines.map((line) => [line.codes[0], line.codes[1], line.source === 'current-shapes' ? 0 : 1, encode(line.path)]), overrideShapes: Object.fromEntries(Object.entries(overrideShapes).map(([code, rings]) => [code, rings.map(encode)])) }
  // Exact containment remains a zero-tolerance invariant after the runtime encoding choice.
  for(const line of lines.filter((line)=>line.source==='overture-2026-08-19.0')) for(const code of line.codes) { const areaSegments=segments(overrideShapes[code]); if(line.path.slice(1).some((point,index)=>!areaSegments.has(skey(line.path[index],point)))) throw new Error(`${line.codes.join(',')}: generated area no longer contains primary line.`) }
  return output
}
export function generateBorderLines(): string {
  if (!existsSync(SOURCE)) throw new Error('Pinned Overture source artifact is absent; extraction must not fetch from the network.')
  const source=JSON.parse(gunzipSync(readFileSync(SOURCE)).toString()) as Source
  validatePinnedSource(source)
  return `${JSON.stringify(derive(source))}\n`
}
if (process.argv.includes('--extract')) { writeFileSync(SOURCE, gzipSync(JSON.stringify(extractPinnedOvertureSource()))); console.log(`Wrote ${SOURCE}`) }
if (process.argv.includes('--write')) { const generated=generateBorderLines(); writeFileSync(OUTPUT, generated); writeFileSync(PUBLIC_OUTPUT, generated); console.log(`Wrote ${OUTPUT}`) }
if (process.argv.includes('--check')) { const generated=generateBorderLines(); if(readFileSync(OUTPUT,'utf8')!==generated) throw new Error('Border line output is not deterministic/current; run npm run generate:border-lines -- --write'); if(sha(OUTPUT)!==provenance.generatedSha256 || sha(PUBLIC_OUTPUT)!==provenance.generatedSha256) throw new Error('Generated border-line hash lock failed.'); console.log('Border line output is deterministic.') }
