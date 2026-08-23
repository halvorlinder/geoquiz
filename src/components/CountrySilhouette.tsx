import { memo, type ReactNode, type SVGProps } from 'react'
import { decodeShapePaths, type CountryShape, type ShapeCoordinateFrame } from '../core/countryShapes'

type CountrySilhouetteProps = {
  shape: CountryShape
  /** Keep challenge-mode wording generic; callers choose any non-answer-revealing label. */
  accessibleLabel?: string
  className?: string
  /** Optional exact-coordinate frame used by a marker overlay. */
  frame?: ShapeCoordinateFrame
  children?: ReactNode
}

export const CountrySilhouette = memo(function CountrySilhouette({ shape, accessibleLabel = 'Country silhouette', className, frame, children }: CountrySilhouetteProps) {
  const paths = decodeShapePaths(shape)
  const [x, y, width, height] = shape.viewBox
  const viewBox = frame ? `0 0 ${frame.width} ${frame.height}` : `${x} ${y} ${width} ${height}`
  const offset = frame?.shapeOffset
  const svgProps: SVGProps<SVGSVGElement> = {
    'aria-label': accessibleLabel,
    className,
    fill: '#d8e4ff',
    focusable: 'false',
    role: 'img',
    viewBox,
  }

  return (
    <svg {...svgProps} xmlns="http://www.w3.org/2000/svg">
      <g fillRule="evenodd" clipRule="evenodd" transform={offset ? `translate(${offset[0]} ${offset[1]})` : undefined}>
        {paths.map((path, index) => <path d={path} key={`${index}-${path.length}`} stroke="#5f7ca9" strokeWidth="1.25px" vectorEffect="non-scaling-stroke" />)}
      </g>
      {children}
    </svg>
  )
})

/** A compact, visible licence credit for the separately identified override data. */
export function CountryShapeAttribution({ shape }: { shape: CountryShape }) {
  const attribution = shape.attribution
  if (!attribution) return null
  const creditsUrl = `${import.meta.env.BASE_URL}country-shape-credits.html`
  return <p className="country-shape-attribution"><span>Shape: </span><a href={creditsUrl}>geoBoundaries</a><span> · {attribution.licenseLabel}</span>{attribution.osmContributors && <> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a></>}</p>
}
