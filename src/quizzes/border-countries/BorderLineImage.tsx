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

/** Hard mode deliberately exposes only the isolated exact selected land-border run. */
export function BorderLineImage({ question }: Readonly<{ question: BorderQuestion }>) {
  const visualBounds = frame(boundsFor(question.path))
  return <div className="border-image border-image-hard">
    <svg role="img" aria-label="One land border line" viewBox={svgBox(visualBounds)} preserveAspectRatio="xMidYMid meet">
      <path className="border-line-halo" d={svgPath(question.path, visualBounds)} />
      <path className="border-line-mark" d={svgPath(question.path, visualBounds)} />
    </svg>
  </div>
}
