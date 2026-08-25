import type { BorderPosition, BorderQuestion } from './borderCountries'

type Bounds = readonly [number, number, number, number]
function boundsFor(points: readonly BorderPosition[]): Bounds {
  const longitudes = points.map(([longitude]) => longitude)
  const latitudes = points.map(([, latitude]) => latitude)
  return [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)]
}
function frame([west, south, east, north]: Bounds) {
  const span = Math.max(east - west, north - south, .001)
  const padding = span * .12
  return [west - padding, south - padding, east + padding, north + padding] as const
}
function svgPath(points: readonly BorderPosition[], [west, , , north]: Bounds) {
  return points.map(([longitude, latitude], index) => `${index ? 'L' : 'M'} ${longitude - west} ${north - latitude}`).join(' ')
}
function svgBox([west, south, east, north]: Bounds) { return `0 0 ${east - west} ${north - south}` }

/** Hard mode deliberately exposes only isolated exact shared-border runs. Each
 * paths share one north-up union transform, so disconnected sections retain
 * their true relative geography without an invented connector or a priority. */
export function BorderLineImage({ question }: Readonly<{ question: BorderQuestion }>) {
  const count=question.runs.length
  return <div className={`border-image border-image-hard${count>1?' border-image-hard--multi':''}`}>
    {count>1&&<p className="border-line-section-count">{count} border sections</p>}
    {(()=>{const visualBounds=frame(boundsFor(question.runs.flat()));return <svg className={count>1?'border-line-multi':undefined} role="img" aria-label={count===1?'One land border line':`${count} land border sections`} viewBox={svgBox(visualBounds)} preserveAspectRatio="xMidYMid meet">{question.runs.map((run,index)=><g key={index}><path className="border-line-halo" d={svgPath(run,visualBounds)}/><path className="border-line-mark" d={svgPath(run,visualBounds)}/></g>)}</svg>})()}
  </div>
}
