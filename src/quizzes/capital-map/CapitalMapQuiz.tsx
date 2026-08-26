import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react'
import capitals from '../../data/capitals.json'
import { checkCapitalAnswer } from '../../core/answerMatching'
import type { Capital } from '../../core/capital'
import { entityCatalog } from '../../core/entity'
import { readScoreboard, recordScoreboardEntry, type ScoreboardEntry, type ScoreboardStorage } from '../../core/scoreboard/scoreboard'
import { currentQuestionId, elapsedTimedSessionMs, isTimedSessionComplete, isTimedSessionPaused, pauseTimedSession, resumeTimedSession, startTimedSession, timedSessionOutcome, transitionTimedSession, type TimedSession, type TimedSessionAction } from '../../core/session/timedSession'
import { timedScoreDataVersion } from '../../core/session/timedScoreVersion'
import { advanceQuiz, isComplete, startQuiz, type QuizProgress } from '../../core/shuffledDeck'
import { TimedPause } from '../../components/TimedPause'
import { CapitalMap } from './CapitalMap'
import { capitalMapContinents, capitalsForContinent, isTimedCapitalAnswerAccepted, type CapitalMapContinent, type CapitalMapMode, type CapitalStatus } from './capitalMapModes'

const PracticePreviousAnswerRecap = lazy(() => import('./PracticePreviousAnswerRecap'))
const FULL_SIZE_VIEWPORT_QUERY = '(min-width: 1200px)'

type Feedback = { kind: 'neutral' | 'correct' | 'incorrect' | 'revealed'; message: string }
type AppliedConfig = { mode: CapitalMapMode; continent: CapitalMapContinent }

const capitalData = capitals as Capital[]
const CAPITAL_MAP_DATA_VERSION = `capital-map-v1-entities-${entityCatalog.version}-capitals-1`

function associatedWith(target: Capital): string {
  return target.entities.map((entity) => entity.country).join(' and ')
}

function initialQuiz(data: readonly Capital[]): QuizProgress<Capital> {
  return startQuiz(data)
}

function safeLocalStorage(): ScoreboardStorage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function readableDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1_000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function fullSizeViewportMatches(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(FULL_SIZE_VIEWPORT_QUERY).matches
}

function useFullSizeViewport(): boolean {
  const [fullSizeViewport, setFullSizeViewport] = useState(fullSizeViewportMatches)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      setFullSizeViewport(false)
      return undefined
    }
    const mediaQuery = window.matchMedia(FULL_SIZE_VIEWPORT_QUERY)
    const update = () => setFullSizeViewport(mediaQuery.matches)
    update()
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update)
      return () => mediaQuery.removeEventListener('change', update)
    }
    mediaQuery.addListener(update)
    return () => mediaQuery.removeListener(update)
  }, [])
  return fullSizeViewport
}

function TimedClock({ session }: { session: TimedSession }) {
  const [now, setNow] = useState(() => performance.now())
  const complete = isTimedSessionComplete(session)
  const paused = isTimedSessionPaused(session)

  useEffect(() => {
    const update = () => setNow(performance.now())
    update()
    if (complete || paused) return undefined
    const interval = window.setInterval(update, 250)
    return () => window.clearInterval(interval)
  }, [session, complete, paused])

  const elapsed = readableDuration(elapsedTimedSessionMs(session, now))
  return <p className="timer" aria-label={`Elapsed time ${elapsed}`}>Time {elapsed}</p>
}

type SetupControlsProps = {
  draft: AppliedConfig
  active: AppliedConfig
  availableCount: number
  onDraftMode: (mode: CapitalMapMode) => void
  onDraftContinent: (continent: CapitalMapContinent) => void
  onApply: () => void
}

function SetupControls({ draft, active, availableCount, onDraftMode, onDraftContinent, onApply }: SetupControlsProps) {
  const action = draft.mode === 'timed' ? 'Start timed run' : 'Start / restart practice'
  return (
    <section className="setup-card capital-map-setup" aria-labelledby="setup-heading">
      <h2 id="setup-heading" className="capital-map-setup-title">Run setup</h2>
      <fieldset className="setup-fieldset capital-map-control-group capital-map-mode-group">
        <legend>Mode</legend>
        <label className="choice-label"><input type="radio" name="capital-map-mode" checked={draft.mode === 'practice'} onChange={() => onDraftMode('practice')} /> Practice</label>
        <label className="choice-label"><input type="radio" name="capital-map-mode" checked={draft.mode === 'timed'} onChange={() => onDraftMode('timed')} /> Timed</label>
      </fieldset>
      <div className="capital-map-control-group capital-map-question-set-group">
        <label htmlFor="capital-map-continent">Question set</label>
        <select id="capital-map-continent" value={draft.continent} onChange={(event) => onDraftContinent(event.target.value as CapitalMapContinent)}>
          {capitalMapContinents.map((continent) => <option key={continent} value={continent}>{continent}</option>)}
        </select>
      </div>
      <div className="setup-note capital-map-setup-summary">
        <p>{availableCount} capital {availableCount === 1 ? 'place' : 'places'} in this setup.</p>
        <p>Active: {active.mode === 'timed' ? 'Timed' : 'Practice'} · {active.continent}.</p>
      </div>
      <div className="capital-map-control-group capital-map-setup-action">
        <button className="secondary-button" type="button" onClick={onApply} disabled={availableCount === 0}>{action}</button>
      </div>
    </section>
  )
}

type CapitalMapQuizProps = { data?: readonly Capital[] }

export function CapitalMapQuiz({ data = capitalData }: CapitalMapQuizProps) {
  const [draft, setDraft] = useState<AppliedConfig>({ mode: 'practice', continent: 'All' })
  const [active, setActive] = useState<AppliedConfig>({ mode: 'practice', continent: 'All' })
  const [quiz, setQuiz] = useState<QuizProgress<Capital>>(() => initialQuiz(data))
  const [previousAnswer, setPreviousAnswer] = useState<Capital | null>(null)
  const [timedSession, setTimedSession] = useState<TimedSession | null>(null)
  const [answer, setAnswer] = useState('')
  const [advancing, setAdvancing] = useState(false)
  const [presentationKey, setPresentationKey] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'neutral', message: 'Name the capital inside the gold ring.' })
  const [scoreboard, setScoreboard] = useState<readonly ScoreboardEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const restartButtonRef = useRef<HTMLButtonElement>(null)
  const advanceTimerRef = useRef<number | undefined>(undefined)
  const recordedSessionRef = useRef<TimedSession | null>(null)
  const composingRef = useRef(false)
  const timedActionLockRef = useRef(false)
  const timedPausedRef = useRef(false)
  const fullSizeViewport = useFullSizeViewport()

  const activeCapitals = useMemo(() => capitalsForContinent(data, active.continent), [data, active.continent])
  const draftCapitalCount = useMemo(() => capitalsForContinent(data, draft.continent).length, [data, draft.continent])
  const practiceComplete = active.mode === 'practice' && isComplete(quiz)
  const timedComplete = active.mode === 'timed' && timedSession !== null && isTimedSessionComplete(timedSession)
  const complete = practiceComplete || timedComplete
  const timedQuestionId = timedSession ? currentQuestionId(timedSession) : null
  const target = active.mode === 'timed' ? activeCapitals.find((capital) => capital.id === timedQuestionId) : quiz.deck[quiz.index]
  const timedDataVersion = timedScoreDataVersion(CAPITAL_MAP_DATA_VERSION)
  const scope = useMemo(() => ({ quizId: 'capital-map', filters: { continent: active.continent }, dataVersion: timedDataVersion }), [active.continent, timedDataVersion])

  const timedStatuses = useMemo<Readonly<Record<string, CapitalStatus>>>(() => timedSession?.statusByQuestionId ?? {}, [timedSession])
  const showPracticePreviousAnswerRecap = previousAnswer !== null && active.mode === 'practice' && fullSizeViewport

  useEffect(() => {
    if (!complete && target) inputRef.current?.focus()
  }, [active.mode, complete, presentationKey, target])

  useEffect(() => {
    timedActionLockRef.current = false
  }, [timedSession, target])

  useEffect(() => {
    if (active.mode === 'practice' && quiz.revealed) nextButtonRef.current?.focus()
  }, [active.mode, quiz.revealed])

  useEffect(() => {
    if (complete) restartButtonRef.current?.focus()
  }, [complete])

  useEffect(() => () => window.clearTimeout(advanceTimerRef.current), [])

  useEffect(() => {
    if (!timedSession || !isTimedSessionComplete(timedSession) || recordedSessionRef.current === timedSession) return
    recordedSessionRef.current = timedSession
    const outcome = timedSessionOutcome(timedSession)
    const entry: ScoreboardEntry = {
      durationMs: Math.round(elapsedTimedSessionMs(timedSession, performance.now())),
      correctCount: outcome.correctCount,
      revealedCount: outcome.revealedCount,
      totalCount: outcome.totalCount,
      completedAt: new Date().toISOString(),
      dataVersion: timedDataVersion,
    }
    setScoreboard(recordScoreboardEntry(safeLocalStorage(), scope, entry))
  }, [scope, timedDataVersion, timedSession])

  function clearTransitions() {
    window.clearTimeout(advanceTimerRef.current)
    setAdvancing(false)
    timedActionLockRef.current = false
    timedPausedRef.current = false
  }

  function advancePresentation() {
    setPresentationKey((key) => key + 1)
  }

  function resetPractice(config: AppliedConfig) {
    clearTransitions()
    advancePresentation()
    const nextDeck = capitalsForContinent(data, config.continent)
    setActive(config)
    setTimedSession(null)
    setQuiz(initialQuiz(nextDeck))
    setPreviousAnswer(null)
    setAnswer('')
    setFeedback({ kind: 'neutral', message: 'Fresh deck ready. Name the capital inside the gold ring.' })
  }

  function startTimed(config: AppliedConfig) {
    clearTransitions()
    const nextDeck = capitalsForContinent(data, config.continent)
    if (nextDeck.length === 0) return
    advancePresentation()
    setActive(config)
    setQuiz(initialQuiz(nextDeck))
    setPreviousAnswer(null)
    setAnswer('')
    setScoreboard(readScoreboard(safeLocalStorage(), { quizId: 'capital-map', filters: { continent: config.continent }, dataVersion: timedScoreDataVersion(CAPITAL_MAP_DATA_VERSION) }))
    setTimedSession(startTimedSession(nextDeck.map((capital) => capital.id), performance.now()))
    setFeedback({ kind: 'neutral', message: 'Timed run started. Type the circled capital.' })
  }

  function applyDraft() {
    if (draft.mode === 'timed') startTimed(draft)
    else resetPractice(draft)
  }

  function moveOnPractice(wasCorrect: boolean) {
    window.clearTimeout(advanceTimerRef.current)
    if (target) setPreviousAnswer(target)
    setQuiz((current) => advanceQuiz(current, wasCorrect))
    setAnswer('')
    setAdvancing(false)
    advancePresentation()
    setFeedback({ kind: 'neutral', message: wasCorrect ? 'Next capital.' : 'Skipped. Find the next ring.' })
  }

  function submitPracticeAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!target) return
    const result = checkCapitalAnswer(answer, target, data)
    if (result.status === 'correct') {
      setAdvancing(true)
      setFeedback({ kind: 'correct', message: `Correct — ${target.capital} is associated with ${associatedWith(target)}.` })
      advanceTimerRef.current = window.setTimeout(() => moveOnPractice(true), 700)
    } else {
      setFeedback({ kind: 'incorrect', message: 'Not quite. Try again, or reveal the answer.' })
      inputRef.current?.select()
    }
  }

  function revealPracticeAnswer() {
    if (!target) return
    setQuiz((current) => ({ ...current, revealed: true }))
    setFeedback({ kind: 'neutral', message: `The answer is ${target.capital}, associated with ${associatedWith(target)}.` })
  }

  function performTimedAction(action: TimedSessionAction) {
    if (!timedSession || !target || timedPausedRef.current || (action !== 'skip' && timedActionLockRef.current)) return
    const now = performance.now()
    if (action !== 'skip') timedActionLockRef.current = true
    const resolvedTarget = target
    setTimedSession((session) => session ? transitionTimedSession(session, action, now) : session)
    setAnswer('')
    advancePresentation()
    if (action === 'skip') {
      setFeedback({
        kind: 'neutral',
        message: timedSession.pendingQuestionIds.length === 1
          ? 'Skipped. This is the only pending capital, so it remains current.'
          : 'Skipped. It will return after the other pending capitals.',
      })
    } else if (action === 'correct') {
      setFeedback({ kind: 'correct', message: `Correct — ${resolvedTarget.capital}.` })
    } else {
      setFeedback({ kind: 'revealed', message: `Revealed — ${resolvedTarget.capital}.` })
    }
  }

  function updateTimedAnswer(value: string) {
    if (timedPausedRef.current) return
    setAnswer(value)
    if (composingRef.current || !target || timedActionLockRef.current) return
    setFeedback({ kind: 'neutral', message: 'Type the circled capital.' })
    if (isTimedCapitalAnswerAccepted(value, target, data)) performTimedAction('correct')
  }

  function activateManualTimedAction(action: 'skip' | 'reveal', event: MouseEvent<HTMLButtonElement>) {
    if (event.detail > 1) return
    performTimedAction(action)
  }

  function preventRepeatedTimedKeyboardActivation(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault()
  }

  function restartCurrentSetup() {
    if (active.mode === 'timed') startTimed(active)
    else resetPractice(active)
  }

  function pauseTimedRun() {
    if (!timedSession || !target || timedPausedRef.current) return
    const now = performance.now()
    timedPausedRef.current = true
    setTimedSession((session) => session ? pauseTimedSession(session, now) : session)
  }

  function resumeTimedRun() {
    if (!timedPausedRef.current) return
    const now = performance.now()
    timedPausedRef.current = false
    setTimedSession((session) => session ? resumeTimedSession(session, now) : session)
  }

  const setup = <SetupControls draft={draft} active={active} availableCount={draftCapitalCount} onDraftMode={(mode) => setDraft((current) => ({ ...current, mode }))} onDraftContinent={(continent) => setDraft((current) => ({ ...current, continent }))} onApply={applyDraft} />

  if (complete) {
    const timedOutcome = timedSession ? timedSessionOutcome(timedSession) : null
    const duration = timedSession ? elapsedTimedSessionMs(timedSession, performance.now()) : 0
    return (
      <main className="app-shell completion-shell capital-map-shell">
        <section className="completion-card" aria-labelledby="completion-title">
          <p className="eyebrow">Capital dots · {active.continent}</p>
          <h1 id="completion-title">{active.mode === 'timed' ? 'Timed run complete' : 'Deck complete'}</h1>
          {active.mode === 'timed' && timedOutcome ? <>
            <p className="score-number">{readableDuration(duration)} <span>{timedOutcome.correctCount} correct · {timedOutcome.revealedCount} revealed · {timedOutcome.totalCount} total</span></p>
            <p>{feedback.message}</p>
            <p>Results stay on this device when browser storage is available.</p>
            <section className="scoreboard" aria-labelledby="scoreboard-heading">
              <h2 id="scoreboard-heading">Top 10 · {active.continent}</h2>
              {scoreboard.length === 0 ? <p>No stored timed results yet.</p> : <ol>{scoreboard.map((entry, index) => <li key={`${entry.completedAt}-${index}`}>{readableDuration(entry.durationMs)} · {entry.correctCount} correct · {entry.revealedCount} revealed · {entry.totalCount} total</li>)}</ol>}
            </section>
          </> : <>
            <p className="score-number">{quiz.correct} <span>of {activeCapitals.length}</span></p>
            <p>You answered {quiz.correct} capitals without revealing the answer.</p>
          </>}
          <button ref={restartButtonRef} className="primary-button completion-action" type="button" onClick={restartCurrentSetup}>{active.mode === 'timed' ? 'Restart timed run' : 'Start a fresh deck'}</button>
        </section>
        {setup}
      </main>
    )
  }

  if (!target) return <main className="app-shell quiz-active-shell capital-map-shell">{setup}<p className="feedback incorrect" role="status">This setup has no capital places.</p></main>

  const timedOutcome = timedSession ? timedSessionOutcome(timedSession) : null
  return (
    <main className="app-shell quiz-active-shell capital-map-shell">
      <div className="capital-map-command-bar">
        <header className="masthead">
          <div><p className="eyebrow">Geoquiz · {active.mode === 'timed' ? 'Timed' : 'Practice'} · {active.continent}</p><h1>Capital dots</h1></div>
          {active.mode === 'timed' && timedSession && timedOutcome
            ? <div className="timed-summary"><TimedClock session={timedSession} /><p className="progress" aria-label={`${timedOutcome.pendingCount} pending, ${timedOutcome.correctCount} correct, ${timedOutcome.revealedCount} revealed`}><span>{timedOutcome.pendingCount} pending</span><strong>{timedOutcome.correctCount} correct · {timedOutcome.revealedCount} revealed</strong></p></div>
            : <p className="progress" aria-label={`Question ${quiz.index + 1} of ${quiz.deck.length}; ${quiz.correct} correct`}><span>{quiz.index + 1} / {quiz.deck.length}</span><strong>{quiz.correct} correct</strong></p>}
        </header>
        {setup}
      </div>
      <section className={`quiz-layout${showPracticePreviousAnswerRecap ? ' quiz-layout-with-recap' : ''}`} aria-label="Capital map quiz">
        <CapitalMap capitals={activeCapitals} target={target} questionNumber={presentationKey} mode={active.mode} statusByCapitalId={timedStatuses} />
        <aside className="answer-card" aria-labelledby="question-heading">
          <p className="eyebrow">{active.mode === 'timed' ? 'Timed question' : `Round ${quiz.index + 1}`}</p>
          <h2 id="question-heading">Which capital is circled?</h2>
          {active.mode === 'practice' ? <>
            <div className="practice-current-answer">
              <form onSubmit={submitPracticeAnswer}>
                <label htmlFor="capital-answer">Capital city</label>
                <input ref={inputRef} id="capital-answer" name="capital-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={quiz.revealed || advancing} autoComplete="off" autoCapitalize="words" spellCheck="false" placeholder="Type your answer" />
                <button className="primary-button" type="submit" disabled={!answer.trim() || quiz.revealed || advancing}>Check answer</button>
              </form>
              <p className={`feedback ${feedback.kind}`} role="status" aria-live="polite">{feedback.message}</p>
            </div>
            {showPracticePreviousAnswerRecap && previousAnswer && <Suspense fallback={null}><PracticePreviousAnswerRecap capital={previousAnswer} /></Suspense>}
            {quiz.revealed ? <button ref={nextButtonRef} className="text-button" type="button" onClick={() => moveOnPractice(false)}>Next capital <span aria-hidden="true">→</span></button> : <button className="text-button" type="button" onClick={revealPracticeAnswer} disabled={advancing}>Reveal and skip</button>}
            <p className="answer-note">Small spelling slips are accepted. Answers that name another capital are not.</p>
          </> : <>
            <label htmlFor="capital-answer">Capital city</label>
            <input
              ref={inputRef}
              id="capital-answer"
              name="capital-answer"
              value={answer}
              onChange={(event) => updateTimedAnswer(event.target.value)}
              onCompositionStart={() => { composingRef.current = true }}
              onCompositionEnd={(event) => {
                composingRef.current = false
                updateTimedAnswer(event.currentTarget.value)
              }}
              autoComplete="off"
              autoCapitalize="words"
              spellCheck="false"
              placeholder="Type your answer"
            />
            <p className={`feedback ${feedback.kind}`} role="status" aria-live="polite">{feedback.message}</p>
            <div className="timed-actions"><TimedPause paused={isTimedSessionPaused(timedSession!)} canPause={Boolean(target && !timedComplete)} focusRef={inputRef} onPause={pauseTimedRun} onResume={resumeTimedRun} /><button className="secondary-button" type="button" onClick={(event) => activateManualTimedAction('skip', event)} onKeyDown={preventRepeatedTimedKeyboardActivation}>Skip</button><button className="text-button" type="button" onClick={(event) => activateManualTimedAction('reveal', event)} onKeyDown={preventRepeatedTimedKeyboardActivation}>Reveal answer</button></div>
            <p className="timed-legend">Status: white dots are pending or skipped; green dots are correct; red dots were revealed. The gold ring marks the current capital.</p>
          </>}
        </aside>
      </section>
    </main>
  )
}

export default CapitalMapQuiz
