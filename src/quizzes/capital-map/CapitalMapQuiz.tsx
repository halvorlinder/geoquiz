import { useEffect, useRef, useState, type FormEvent } from 'react'
import capitals from '../../data/capitals.json'
import { checkCapitalAnswer } from '../../core/answerMatching'
import type { Capital } from '../../core/capital'
import { advanceQuiz, isComplete, startQuiz, type QuizProgress } from '../../core/shuffledDeck'
import { CapitalMap } from './CapitalMap'

type Feedback = { kind: 'neutral' | 'correct' | 'incorrect'; message: string }
const capitalData = capitals as Capital[]

function associatedWith(target: Capital): string {
  return target.entities.map((entity) => entity.country).join(' and ')
}

function initialQuiz(data: readonly Capital[]): QuizProgress<Capital> {
  return startQuiz(data)
}

type CapitalMapQuizProps = { data?: readonly Capital[] }

export function CapitalMapQuiz({ data = capitalData }: CapitalMapQuizProps) {
  const [quiz, setQuiz] = useState<QuizProgress<Capital>>(() => initialQuiz(data))
  const [answer, setAnswer] = useState('')
  const [advancing, setAdvancing] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'neutral', message: 'Name the capital inside the gold ring.' })
  const inputRef = useRef<HTMLInputElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const restartButtonRef = useRef<HTMLButtonElement>(null)
  const advanceTimerRef = useRef<number | undefined>(undefined)
  const complete = isComplete(quiz)
  const target = quiz.deck[quiz.index]

  useEffect(() => {
    inputRef.current?.focus()
  }, [quiz.index, complete])

  useEffect(() => {
    if (quiz.revealed) nextButtonRef.current?.focus()
  }, [quiz.revealed])

  useEffect(() => {
    if (complete) restartButtonRef.current?.focus()
  }, [complete])

  useEffect(() => () => window.clearTimeout(advanceTimerRef.current), [])

  function moveOn(wasCorrect: boolean) {
    window.clearTimeout(advanceTimerRef.current)
    setQuiz((current) => advanceQuiz(current, wasCorrect))
    setAnswer('')
    setAdvancing(false)
    setFeedback({ kind: 'neutral', message: wasCorrect ? 'Next capital.' : 'Skipped. Find the next ring.' })
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!target) return
    const result = checkCapitalAnswer(answer, target, data)
    if (result.status === 'correct') {
      setAdvancing(true)
      setFeedback({ kind: 'correct', message: `Correct — ${target.capital} is associated with ${associatedWith(target)}.` })
      advanceTimerRef.current = window.setTimeout(() => moveOn(true), 700)
    } else {
      setFeedback({ kind: 'incorrect', message: 'Not quite. Try again, or reveal the answer.' })
      inputRef.current?.select()
    }
  }

  function revealAnswer() {
    if (!target) return
    setQuiz((current) => ({ ...current, revealed: true }))
    setFeedback({ kind: 'neutral', message: `The answer is ${target.capital}, associated with ${associatedWith(target)}.` })
  }

  function restart() {
    window.clearTimeout(advanceTimerRef.current)
    setQuiz(initialQuiz(data))
    setAnswer('')
    setFeedback({ kind: 'neutral', message: 'Fresh deck ready. Name the capital inside the gold ring.' })
  }

  if (complete) {
    return (
      <main className="app-shell completion-shell">
        <section className="completion-card" aria-labelledby="completion-title">
          <p className="eyebrow">Capital dots</p>
          <h1 id="completion-title">Deck complete</h1>
          <p className="score-number">{quiz.correct} <span>of {data.length}</span></p>
          <p>You answered {quiz.correct} capitals without revealing the answer.</p>
          <button ref={restartButtonRef} className="primary-button" type="button" onClick={restart}>Start a fresh deck</button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">Geoquiz</p>
          <h1>Capital dots</h1>
        </div>
        <p className="progress" aria-label={`Question ${quiz.index + 1} of ${quiz.deck.length}; ${quiz.correct} correct`}>
          <span>{quiz.index + 1} / {quiz.deck.length}</span>
          <strong>{quiz.correct} correct</strong>
        </p>
      </header>

      <section className="quiz-layout" aria-label="Capital map quiz">
        <CapitalMap capitals={data} target={target} questionNumber={quiz.index} />
        <aside className="answer-card" aria-labelledby="question-heading">
          <p className="eyebrow">Round {quiz.index + 1}</p>
          <h2 id="question-heading">Which capital is circled?</h2>
          <form onSubmit={submitAnswer}>
            <label htmlFor="capital-answer">Capital city</label>
            <input
              ref={inputRef}
              id="capital-answer"
              name="capital-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              disabled={quiz.revealed || advancing}
              autoComplete="off"
              autoCapitalize="words"
              spellCheck="false"
              placeholder="Type your answer"
            />
            <button className="primary-button" type="submit" disabled={!answer.trim() || quiz.revealed || advancing}>Check answer</button>
          </form>
          <p className={`feedback ${feedback.kind}`} role="status" aria-live="polite">{feedback.message}</p>
          {quiz.revealed ? (
            <button ref={nextButtonRef} className="text-button" type="button" onClick={() => moveOn(false)}>Next capital <span aria-hidden="true">→</span></button>
          ) : (
            <button className="text-button" type="button" onClick={revealAnswer} disabled={advancing}>Reveal and skip</button>
          )}
          <p className="answer-note">Small spelling slips are accepted. Answers that name another capital are not.</p>
        </aside>
      </section>
    </main>
  )
}
