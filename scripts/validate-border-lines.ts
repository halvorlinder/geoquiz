import data from '../src/data/border-lines.json' with { type: 'json' }
import dataV2 from '../src/data/border-lines-v2.json' with { type: 'json' }
import neighbours from '../src/data/neighbours.json' with { type: 'json' }
import provenance from './border-lines-provenance.json' with { type: 'json' }
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { generateBorderLines, generateBorderLinesV2 } from './generate-border-lines'

const lines = (data as unknown as { lines: readonly (readonly [string, string, number, readonly number[]])[] }).lines
const ids = new Set(lines.map((line) => `${line[0]},${line[1]}`))
if (lines.length !== 317 || ids.size !== 317 || lines.some((line) => line[3].length < 4 || line[3].length % 2)) throw new Error('Border lines must contain exactly 317 unique non-empty curated pair runs.')
const expected = (neighbours as unknown as { boundaries: readonly { codes: readonly [string, string] }[] }).boundaries.map(boundary => boundary.codes.join(','))
if (JSON.stringify([...ids].sort()) !== JSON.stringify(expected)) throw new Error('Border lines must retain the exact sorted curated neighbour roster.')
for (const [left,right,,encoded] of lines) {
  let x=0,y=0; const points: [number,number][]=[]
  for(let index=0;index<encoded.length;index+=2){x+=encoded[index];y+=encoded[index+1];const point:[number,number]=[x/10_000_000,y/10_000_000];if(!Number.isFinite(point[0])||!Number.isFinite(point[1])||point[1]<-90||point[1]>90)throw new Error(`${left},${right}: invalid coordinate`);points.push(point)}
  if(points.slice(1).some((point,index)=>Math.abs(point[0]-points[index][0])>180)||points.every(point=>point[0]===points[0][0]&&point[1]===points[0][1])) throw new Error(`${left},${right}: degenerate or cross-world run`)
}
if (generateBorderLines() !== `${JSON.stringify(data)}\n`) throw new Error('Border line data is not deterministic/current; run npm run generate:border-lines -- --write')
type EncodedRun = readonly number[]
type V2Line = readonly [string,string,number,readonly EncodedRun[]]
const v2=dataV2 as unknown as { version: number; dataVersion: string; runOrdering: string; source: { overtureRelease: string; osmPlanetSnapshot: string; inputHashes: Record<string,string>; sourceSha256: string }; lines: readonly V2Line[] }
if(v2.version!==2||v2.dataVersion!=='border-lines-v2-orientation-1-overture-2026-08-19.0'||v2.runOrdering!=='geodesic-length-descending-then-canonical-orientation-independent-coordinate-key'||v2.source.overtureRelease!==provenance.release||v2.source.osmPlanetSnapshot!==provenance.osmPlanetSnapshot||v2.source.sourceSha256!==provenance.sourceSha256||JSON.stringify(v2.source.inputHashes)!==JSON.stringify((data as unknown as { source: { inputHashes: Record<string,string> } }).source.inputHashes))throw new Error('Border v2 schema/version/source lock failed.')
const v2Lines=v2.lines
const v2Ids=new Set(v2Lines.map(line=>`${line[0]},${line[1]}`));const runCount=v2Lines.reduce((total,line)=>total+line[3].length,0);const multi=v2Lines.filter(line=>line[3].length>1)
const multiRunRegistry: Readonly<Record<string,number>>=Object.freeze({
  'AGO,COD':2,'ARE,OMN':3,'ARG,CHL':2,'ARM,AZE':4,'AUT,CHE':2,'AZE,IRN':2,'BIH,HRV':2,'BRN,MYS':2,'CAN,USA':4,'CHN,IND':3,'CHN,RUS':2,'CIV,GHA':2,'DEU,POL':2,'ESP,FRA':2,'ESP,MAR':2,'IDN,MYS':2,'IDN,TLS':2,'ISR,JOR':2,'ISR,PSE':2,'KGZ,TJK':2,'KGZ,UZB':3,'LTU,RUS':2,'MOZ,MWI':3,'MOZ,ZAF':2,'ROU,UKR':2,'RUS,UKR':2,'TJK,UZB':2,
})
if(v2Lines.length!==317||v2Ids.size!==317||runCount!==352||multi.length!==27||JSON.stringify([...v2Ids].sort())!==JSON.stringify(expected))throw new Error('Border v2 run registry must retain 317 pairs / 352 runs / 27 multi-run pairs.')
if(JSON.stringify(multi.map(line=>`${line[0]},${line[1]}`).sort())!==JSON.stringify(Object.keys(multiRunRegistry).sort()))throw new Error('Border v2 multi-run pair registry changed.')
const radians=(value:number)=>value*Math.PI/180
function geodesicLength(points: readonly (readonly number[])[]) { return points.slice(1).reduce((total,point,index)=>{const prior=points[index],lat=radians(point[1]-prior[1]),lon=radians(point[0]-prior[0]),a=Math.sin(lat/2)**2+Math.cos(radians(prior[1]))*Math.cos(radians(point[1]))*Math.sin(lon/2)**2;return total+2*6_371_008.8*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))},0) }
function decode(encoded: EncodedRun) { let x=0,y=0;const points:[number,number][]=[];for(let index=0;index<encoded.length;index+=2){x+=encoded[index];y+=encoded[index+1];points.push([x/10_000_000,y/10_000_000])}return points }
function canonicalRun(points: readonly (readonly number[])[]) { const forward=points.map(point=>`${Math.round(point[0]*10_000_000)},${Math.round(point[1]*10_000_000)}`).join(';'),reverse=[...points].reverse().map(point=>`${Math.round(point[0]*10_000_000)},${Math.round(point[1]*10_000_000)}`).join(';');return forward<reverse?forward:reverse }
for(const [left,right,,runs]of v2Lines){
  const pair=`${left},${right}`;if(runs.length!==(multiRunRegistry[pair]??1)||runs.length>4)throw new Error(`${pair}: unexpected v2 run count.`)
  const seen=new Set<string>();let previousLength=Infinity,previousKey=''
  for(const encoded of runs){const points=decode(encoded),key=canonicalRun(points),length=geodesicLength(points);if(encoded.length<4||encoded.length%2||points.some(point=>!Number.isFinite(point[0])||!Number.isFinite(point[1])||point[1]<-90||point[1]>90)||points.slice(1).some((point,index)=>Math.abs(point[0]-points[index][0])>180)||points.every(point=>point[0]===points[0][0]&&point[1]===points[0][1]))throw new Error(`${pair}: invalid v2 run`);if(seen.has(key))throw new Error(`${pair}: duplicate reverse-equivalent run.`);seen.add(key);if(length>previousLength+1e-6||(Math.abs(length-previousLength)<=1e-6&&key<previousKey))throw new Error(`${pair}: v2 runs are not canonically ordered.`);previousLength=length;previousKey=key}
}
const snapshots: Readonly<Record<string,readonly (readonly [number,number])[]>>={
  'ESP,FRA':[[54,346.381814],[21,140.002131]],
  'ESP,MAR':[[117,9.997498],[354,7.852832]],
}
for(const [pair,expectedRuns]of Object.entries(snapshots)){const line=v2Lines.find(candidate=>`${candidate[0]},${candidate[1]}`===pair)!;for(const [index,[vertices,kilometres]]of expectedRuns.entries()){const run=decode(line[3][index]);if(run.length!==vertices||Math.abs(geodesicLength(run)/1000-kilometres)>.00001)throw new Error(`${pair}: v2 vertex/geodesic snapshot changed.`)}}
const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex')
if(hash('src/data/border-lines.json')!==provenance.generatedSha256||hash('public/data-sources/border-countries/border-lines-v1.json')!==provenance.generatedSha256)throw new Error('Historical v1 border artifact changed.')
// generateBorderLinesV2 performs the matching both-shape segment-containment
// assertion for every decoded run before this deterministic byte comparison.
if(generateBorderLinesV2()!==`${JSON.stringify(dataV2)}\n`||hash('src/data/border-lines-v2.json')!==provenance.generatedV2Sha256||readFileSync('public/data-sources/border-countries/border-lines-v2.json','utf8')!==readFileSync('src/data/border-lines-v2.json','utf8'))throw new Error('Border v2 data is not deterministic/current or no longer contained by both source-matched shapes.')
console.log(`Validated ${lines.length} historical primary runs and ${runCount} local v2 border runs.`)
