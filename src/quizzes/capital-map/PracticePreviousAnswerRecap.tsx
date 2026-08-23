import countryShapesData from '../../data/country-shapes.json'
import { CountryShapeAttribution, CountrySilhouette } from '../../components/CountrySilhouette'
import type { Capital } from '../../core/capital'
import { getCountryShape, type CountryShapeDataset } from '../../core/countryShapes'
import { getEntityByCode } from '../../core/entity'
import { flagAssetUrl } from '../../core/flags'
import { getHighPoint } from '../../core/highPoints'

const countryShapeDataset = countryShapesData as unknown as CountryShapeDataset

type PracticePreviousAnswerRecapProps = {
  capital: Capital
}

function readableElevation(elevationMetres: number): string {
  return `${elevationMetres.toLocaleString('en-US')} m`
}

function EntityFacts({ capital, code }: { capital: Capital; code: string }) {
  const entity = getEntityByCode(code)
  const shape = getCountryShape(countryShapeDataset, code)
  const highPoint = getHighPoint(code)

  if (!entity || !shape || !highPoint) return null

  return (
    <article className="practice-previous-answer-fact" aria-label={`${entity.name} facts`}>
      <CountrySilhouette shape={shape} className="practice-previous-answer-shape" accessibleLabel={`Silhouette of ${entity.name}`} />
      <div className="practice-previous-answer-details">
        <div className="practice-previous-answer-country"><h4>{entity.name}</h4><img className="practice-previous-answer-flag" src={flagAssetUrl(code)} alt={`Flag of ${entity.name}`} /></div>
        <dl>
          <div><dt>Capital</dt><dd>{capital.capital}</dd></div>
          <div><dt>Highest point</dt><dd>{highPoint.label}{highPoint.elevationMetres === undefined ? '' : ` · ${readableElevation(highPoint.elevationMetres)}`}</dd></div>
        </dl>
        <CountryShapeAttribution shape={shape} />
      </div>
    </article>
  )
}

export default function PracticePreviousAnswerRecap({ capital }: PracticePreviousAnswerRecapProps) {
  return (
    <section className="practice-previous-answer-recap" aria-labelledby="practice-previous-answer-title">
      <p className="eyebrow">Previous answer</p>
      <h3 id="practice-previous-answer-title">{capital.capital}</h3>
      <div className="practice-previous-answer-facts">
        {capital.entities.map((association) => <EntityFacts key={association.code} capital={capital} code={association.code} />)}
      </div>
    </section>
  )
}
