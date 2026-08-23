import { CapitalFieldsQuiz, type CapitalFieldsQuestion } from '../../components/CapitalFieldsQuiz'
import { entityCatalog } from '../../core/entity'
import { COUNTRY_CAPITAL_CAPITAL_DATA_VERSION, countryCapitalData, countryCapitalQuestions, isCountryCapitalAnswerCorrect, isTimedCountryCapitalAnswerAccepted } from './countryCapital'

const COUNTRY_CAPITAL_DATA_VERSION = `country-capital-v1-entities-${entityCatalog.version}-${COUNTRY_CAPITAL_CAPITAL_DATA_VERSION}`

export type CountryCapitalQuizProps = Readonly<{
  entities?: typeof countryCapitalData.entities
  capitals?: typeof countryCapitalData.capitals
}>

export function CountryCapitalQuiz({ entities = countryCapitalData.entities, capitals = countryCapitalData.capitals }: CountryCapitalQuizProps) {
  return <CapitalFieldsQuiz
    quizId="country-capital"
    quizTitle="Country capitals"
    dataVersion={COUNTRY_CAPITAL_DATA_VERSION}
    entities={entities}
    capitals={capitals}
    questions={countryCapitalQuestions}
    isAnswerCorrect={isCountryCapitalAnswerCorrect}
    isTimedAnswerAccepted={isTimedCountryCapitalAnswerAccepted}
    renderChallenge={(question: CapitalFieldsQuestion, { headingId }) => <>
      <h2 id={headingId}>{question.entity.name}</h2>
      <p className="country-capital-instruction">{question.fields.length === 1 ? 'Name its capital.' : 'Name each capital for the listed role.'}</p>
    </>}
  />
}

export default CountryCapitalQuiz
