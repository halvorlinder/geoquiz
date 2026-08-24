import data from '../src/data/border-lines.json' with { type: 'json' }
import neighbours from '../src/data/neighbours.json' with { type: 'json' }
import { generateBorderLines } from './generate-border-lines'

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
console.log(`Validated ${lines.length} local primary border-line runs.`)
