import { CapitalFieldsQuiz, type CapitalFieldsQuestion } from '../../components/CapitalFieldsQuiz'
import { CountryShapeAttribution, CountrySilhouette } from '../../components/CountrySilhouette'
import { entityCatalog } from '../../core/entity'
import { COUNTRY_CAPITAL_CAPITAL_DATA_VERSION, isCountryCapitalAnswerCorrect, isTimedCountryCapitalAnswerAccepted } from '../country-capital/countryCapital'
import { shapeCapitalData, shapeCapitalQuestions, type ShapeCapitalQuestion } from './shapeCapital'

const SHAPE_CAPITAL_DATA_VERSION = `shape-capital-v1-entities-${entityCatalog.version}-${COUNTRY_CAPITAL_CAPITAL_DATA_VERSION}-shapes-${shapeCapitalData.shapes.version}`

export type ShapeCapitalQuizProps = Readonly<{
  entities?: typeof shapeCapitalData.entities
  capitals?: typeof shapeCapitalData.capitals
  questions?: typeof shapeCapitalQuestions
}>

/** The silhouette is the only country-specific challenge cue until resolution. */
export function ShapeCapitalQuiz({ entities = shapeCapitalData.entities, capitals = shapeCapitalData.capitals, questions = shapeCapitalQuestions }: ShapeCapitalQuizProps) {
  return <CapitalFieldsQuiz
    quizId="shape-capital"
    quizTitle="Shape capitals"
    dataVersion={SHAPE_CAPITAL_DATA_VERSION}
    entities={entities}
    capitals={capitals}
    questions={questions}
    isAnswerCorrect={isCountryCapitalAnswerCorrect}
    isTimedAnswerAccepted={isTimedCountryCapitalAnswerAccepted}
    renderChallenge={(question: CapitalFieldsQuestion, { headingId }) => {
      const shapeQuestion = question as ShapeCapitalQuestion
      return <>
        <div className="shape-capital-visual"><CountrySilhouette shape={shapeQuestion.shape} accessibleLabel="Country silhouette" className="shape-capital-silhouette" /></div>
        <CountryShapeAttribution shape={shapeQuestion.shape} />
        <h2 id={headingId}>Country silhouette</h2>
        <p className="country-capital-instruction">{question.fields.length === 1 ? 'Name the shown country’s capital.' : 'Name each capital for the listed role.'}</p>
      </>
    }}
  />
}

export default ShapeCapitalQuiz
