import linesData from '../../data/border-lines-v2.json'
import { getCountryShape, type CountryShapeDataset } from '../../core/countryShapes'
import { decodeShapePolygons, type CountryShape } from '../../core/countryShapes'
import countryShapes from '../../data/country-shapes.json'
import { studyEntities, type Continent, type StudyEntity } from '../../core/entity'

export const borderContinents = ['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const
export type BorderContinent = (typeof borderContinents)[number]
export type BorderDifficulty = 'easy' | 'hard'
export function borderSetupNote(difficulty: BorderDifficulty, continent: BorderContinent) { return difficulty === 'easy' ? 'Easy shows a known country.' : continent === 'All' ? 'Hard shows only the shared border line.' : 'Borders touching that continent.' }
export type BorderPosition = readonly [number, number]
export type BorderQuestion = Readonly<{ id: string; codes: readonly [string, string]; path: readonly BorderPosition[]; runs: readonly (readonly BorderPosition[])[]; source: string; difficulty: BorderDifficulty; knownCode?: string; answerCode?: string }>

type EncodedLine = readonly [string, string, 0 | 1, readonly (readonly number[])[]]
type BorderData = Readonly<{ version: number; dataVersion: string; lines: readonly EncodedLine[]; overrideShapes: Readonly<Record<string, readonly (readonly number[])[]>> }>
const data = linesData as unknown as BorderData
const byCode = new Map(studyEntities.map((entity) => [entity.code, entity]))
const shapes = countryShapes as unknown as CountryShapeDataset
export const BORDER_DATA_VERSION = data.dataVersion
export const BORDER_ORIENTATION_VERSION = '1' as const
function positionKey([x,y]: BorderPosition) { return `${Math.round(x*10_000_000)},${Math.round(y*10_000_000)}` }
function segmentKey(a: BorderPosition,b: BorderPosition) { const left=positionKey(a),right=positionKey(b); return left<right?`${left}|${right}`:`${right}|${left}` }
function isPositionRings(shape: CountryShape | readonly (readonly BorderPosition[])[]): shape is readonly (readonly BorderPosition[])[] { return !Object.hasOwn(shape as object, 'polygons') }
function borderRings(shape: CountryShape | readonly (readonly BorderPosition[])[]): readonly (readonly BorderPosition[])[] {
  if (isPositionRings(shape)) return shape
  const scale=shape.coordinateScale??1000,[west,,,north]=shape.bounds
  return decodeShapePolygons(shape).flatMap(polygon=>polygon.map(ring=>{const output=ring.map(([x,y])=>[west+x/scale,north-y/scale] as BorderPosition);return [...output,output[0]]}))
}
/** Zero-tolerance audit used by generator-facing tests: every displayed segment belongs to the selected silhouette. */
export function borderLineContainedInShape(question: BorderQuestion, code: string): boolean {
  const shape=borderShape(code,question.source); if(!shape)return false; const segments=new Set(borderRings(shape).flatMap(ring=>ring.slice(1).map((point,index)=>segmentKey(ring[index],point))))
  return question.runs.length>0 && question.runs.every(run=>run.length>=2&&run.slice(1).every((point,index)=>segments.has(segmentKey(run[index],point))))
}
function decode(encoded: readonly number[]): BorderPosition[] { let x=0,y=0; const output: BorderPosition[]=[]; for(let index=0;index<encoded.length;index+=2){x+=encoded[index];y+=encoded[index+1];output.push([x/10_000_000,y/10_000_000])}return output }

export function borderEntity(code: string): StudyEntity | undefined { return byCode.get(code) }
export function isBorderContinent(value: string): value is Continent { return value !== 'All' && borderContinents.includes(value as BorderContinent) }
/** The Overture silhouette is intentionally pair-scoped: it never changes other current-shape cards. */
export function borderShape(code: string, source: string): import('../../core/countryShapes').CountryShape | readonly (readonly BorderPosition[])[] | undefined { return source === 'overture' ? data.overrideShapes[code]?.map(decode) : getCountryShape(shapes, code) }
function eligible(line: EncodedLine, continent: BorderContinent, difficulty: BorderDifficulty): boolean {
  if (continent === 'All') return true
  const [left, right] = [borderEntity(line[0]), borderEntity(line[1])]
  if (!left || !right) return false
  return difficulty === 'hard' ? left.continent === continent || right.continent === continent : left.continent === continent || right.continent === continent
}
/** One question for every curated unordered land-border pair. The injected RNG only orients Easy cards. */
export function borderQuestions(difficulty: BorderDifficulty, continent: BorderContinent = 'All', random: () => number = Math.random): BorderQuestion[] {
  const questions: BorderQuestion[] = []
  for (const line of data.lines.filter((line) => eligible(line, continent, difficulty))) {
    const [left, right, source, encodedRuns] = line; const codes = [left, right] as const; const runs=encodedRuns.map(decode); const path = runs[0]
    if (difficulty === 'hard') { questions.push(Object.freeze({ id: `border-hard:${left}-${right}`, codes, path, runs, source: source === 0 ? 'current-shapes' : 'overture', difficulty })); continue }
    const leftEligible = continent === 'All' || borderEntity(left)?.continent === continent
    const rightEligible = continent === 'All' || borderEntity(right)?.continent === continent
    const knownCode = leftEligible && rightEligible ? (random() < .5 ? left : right) : leftEligible ? left : right
    const answerCode = knownCode === left ? right : left
    questions.push(Object.freeze({ id: `border-easy:${left}-${right}:${knownCode}`, codes, path, runs, source: source === 0 ? 'current-shapes' : 'overture', difficulty, knownCode, answerCode }))
  }
  return questions
}
export function borderQuestionCounts(): Readonly<Record<BorderContinent, Readonly<Record<BorderDifficulty, number>>>> {
  return Object.freeze(Object.fromEntries(borderContinents.map((continent) => [continent, Object.freeze({ easy: borderQuestions('easy', continent, () => 0).length, hard: borderQuestions('hard', continent, () => 0).length })])) as Record<BorderContinent, Readonly<Record<BorderDifficulty, number>>>)
}
