import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import type { Capital } from '../core/capital'
import type { StudyEntity } from '../core/entity'
import { readScoreboard, recordScoreboardEntry, type ScoreboardEntry, type ScoreboardStorage } from '../core/scoreboard/scoreboard'
import { currentQuestionId, elapsedTimedSessionMs, isTimedSessionComplete, isTimedSessionPaused, pauseTimedSession, resumeTimedSession, startTimedSession, timedSessionOutcome, transitionTimedSession, type TimedSession, type TimedSessionAction } from '../core/session/timedSession'
import { timedScoreDataVersion } from '../core/session/timedScoreVersion'
import { advanceQuiz, isComplete, startQuiz, type QuizProgress } from '../core/shuffledDeck'
import { TimedPause } from './TimedPause'

const capitalFieldContinents = ['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const
export type CapitalFieldContinent = (typeof capitalFieldContinents)[number]
export type CapitalFieldMode = 'practice' | 'timed'

export type CapitalField = Readonly<{ capital: Capital; role: string }>
export type CapitalFieldsQuestion = Readonly<{ id: string; entity: StudyEntity; fields: readonly CapitalField[] }>

type AppliedConfig = Readonly<{ mode: CapitalFieldMode; continent: CapitalFieldContinent }>
type FieldState = Readonly<{ values: Readonly<Record<number, string>>; locked: readonly number[]; revealed: readonly number[] }>
type FeedbackKind = 'neutral' | 'correct' | 'incorrect' | 'revealed'
type Feedback = Readonly<{ kind: FeedbackKind; message: string }>
type RevealAcknowledgement = Readonly<{ entityName: string; answers: readonly Readonly<{ role: string; capital: string }>[] }>

export type CapitalFieldsQuizProps = Readonly<{
  quizId: string
  quizTitle: string
  dataVersion: string
  entities: readonly StudyEntity[]
  capitals: readonly Capital[]
  questions: (entities: readonly StudyEntity[], capitals: readonly Capital[], continent?: CapitalFieldContinent) => readonly CapitalFieldsQuestion[]
  isAnswerCorrect: (submitted: string, field: CapitalField, capitals: readonly Capital[]) => boolean
  isTimedAnswerAccepted: (submitted: string, field: CapitalField, capitals: readonly Capital[]) => boolean
  renderChallenge: (question: CapitalFieldsQuestion, context: Readonly<{ mode: CapitalFieldMode; index: number; headingId: string }>) => ReactNode
}>

function safeLocalStorage(): ScoreboardStorage | undefined {
  try { return window.localStorage } catch { return undefined }
}

function readableDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1_000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function emptyFieldState(): FieldState { return { values: {}, locked: [], revealed: [] } }
function isLocked(state: FieldState, index: number): boolean { return state.locked.includes(index) }
function isRevealed(state: FieldState, index: number): boolean { return state.revealed.includes(index) }
function firstUnresolvedField(state: FieldState, fieldCount: number): number | null {
  for (let index = 0; index < fieldCount; index += 1) if (!isLocked(state, index)) return index
  return null
}
function allLocked(state: FieldState, fieldCount: number): boolean { return firstUnresolvedField(state, fieldCount) === null }

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
  }, [complete, paused, session])
  const elapsed = readableDuration(elapsedTimedSessionMs(session, now))
  return <p className="timer" aria-label={`Elapsed time ${elapsed}`}>Time {elapsed}</p>
}

type SetupControlsProps = Readonly<{
  quizId: string
  draft: AppliedConfig
  active: AppliedConfig
  availableCount: number
  onDraftMode: (mode: CapitalFieldMode) => void
  onDraftContinent: (continent: CapitalFieldContinent) => void
  onApply: () => void
}>

function SetupControls({ quizId, draft, active, availableCount, onDraftMode, onDraftContinent, onApply }: SetupControlsProps) {
  const setupHeading = `${quizId}-setup-heading`
  const continentId = `${quizId}-continent`
  return <section className="setup-card" aria-labelledby={setupHeading}>
    <h2 id={setupHeading}>Run setup</h2>
    <fieldset className="setup-fieldset">
      <legend>Mode</legend>
      <label className="choice-label"><input type="radio" name={`${quizId}-mode`} checked={draft.mode === 'practice'} onChange={() => onDraftMode('practice')} /> Practice</label>
      <label className="choice-label"><input type="radio" name={`${quizId}-mode`} checked={draft.mode === 'timed'} onChange={() => onDraftMode('timed')} /> Timed</label>
    </fieldset>
    <label htmlFor={continentId}>Question set</label>
    <select id={continentId} value={draft.continent} onChange={(event) => onDraftContinent(event.target.value as CapitalFieldContinent)}>
      {capitalFieldContinents.map((continent) => <option key={continent} value={continent}>{continent}</option>)}
    </select>
    <p className="setup-note">{availableCount} countries in this setup. Active: {active.mode === 'timed' ? 'Timed' : 'Practice'} · {active.continent}.</p>
    <button className="secondary-button" type="button" onClick={onApply} disabled={availableCount === 0}>{draft.mode === 'timed' ? 'Start timed run' : 'Start / restart practice'}</button>
  </section>
}

/** A narrow shared run shell for quizzes asking role-labelled capital fields. */
export function CapitalFieldsQuiz({ quizId, quizTitle, dataVersion, entities, capitals, questions, isAnswerCorrect, isTimedAnswerAccepted, renderChallenge }: CapitalFieldsQuizProps) {
  const initialQuestions = useMemo(() => questions(entities, capitals), [capitals, entities, questions])
  const [draft, setDraft] = useState<AppliedConfig>({ mode: 'practice', continent: 'All' })
  const [active, setActive] = useState<AppliedConfig>({ mode: 'practice', continent: 'All' })
  const [quiz, setQuiz] = useState<QuizProgress<CapitalFieldsQuestion>>(() => startQuiz(initialQuestions))
  const [timedSession, setTimedSession] = useState<TimedSession | null>(null)
  const [practiceState, setPracticeState] = useState<FieldState>(emptyFieldState)
  const [timedStates, setTimedStates] = useState<Readonly<Record<string, FieldState>>>({})
  const [revealed, setRevealed] = useState(false)
  const [revealAcknowledgement, setRevealAcknowledgement] = useState<RevealAcknowledgement | null>(null)
  const [questionComplete, setQuestionComplete] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'neutral', message: 'Name this country’s capital.' })
  const [presentationKey, setPresentationKey] = useState(0)
  const [scoreboard, setScoreboard] = useState<readonly ScoreboardEntry[]>([])
  const fieldRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const pauseFocusRef = useRef<HTMLElement | null>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const revealSummaryRef = useRef<HTMLElement>(null)
  const restartButtonRef = useRef<HTMLButtonElement>(null)
  const actionLockRef = useRef(false)
  const timedPausedRef = useRef(false)
  const practiceActionLockRef = useRef(false)
  const acknowledgementLockRef = useRef(false)
  const composingRef = useRef(false)
  const recordedSessionRef = useRef<TimedSession | null>(null)

  const activeQuestions = useMemo(() => questions(entities, capitals, active.continent), [active.continent, capitals, entities, questions])
  const draftQuestions = useMemo(() => questions(entities, capitals, draft.continent), [capitals, draft.continent, entities, questions])
  const timedQuestionId = timedSession ? currentQuestionId(timedSession) : null
  const target = active.mode === 'timed' ? activeQuestions.find((question) => question.id === timedQuestionId) : quiz.deck[quiz.index]
  const currentState = target ? active.mode === 'timed' ? timedStates[target.id] ?? emptyFieldState() : practiceState : emptyFieldState()
  const practiceComplete = active.mode === 'practice' && isComplete(quiz)
  const timedComplete = active.mode === 'timed' && timedSession !== null && isTimedSessionComplete(timedSession)
  const complete = practiceComplete || timedComplete
  const focusIndex = target ? firstUnresolvedField(currentState, target.fields.length) : null
  const targetId = target?.id
  const timedDataVersion = timedScoreDataVersion(dataVersion)
  const scope = useMemo(() => ({ quizId, filters: { continent: active.continent }, dataVersion: timedDataVersion }), [active.continent, quizId, timedDataVersion])

  useEffect(() => {
    if (!targetId || complete || focusIndex === null) return
    const timer = window.setTimeout(() => fieldRefs.current[focusIndex]?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [complete, focusIndex, presentationKey, targetId])
  useEffect(() => { if (questionComplete || revealed) nextButtonRef.current?.focus() }, [questionComplete, revealed])
  useEffect(() => { if (revealAcknowledgement) revealSummaryRef.current?.focus() }, [revealAcknowledgement])
  useEffect(() => { if (complete && !revealAcknowledgement) restartButtonRef.current?.focus() }, [complete, revealAcknowledgement])
  useEffect(() => { actionLockRef.current = false }, [timedQuestionId, timedSession])
  useEffect(() => {
    if (!timedSession || !isTimedSessionComplete(timedSession) || recordedSessionRef.current === timedSession) return
    recordedSessionRef.current = timedSession
    const outcome = timedSessionOutcome(timedSession)
    setScoreboard(recordScoreboardEntry(safeLocalStorage(), scope, {
      durationMs: Math.round(elapsedTimedSessionMs(timedSession, performance.now())), correctCount: outcome.correctCount,
      revealedCount: outcome.revealedCount, totalCount: outcome.totalCount, completedAt: new Date().toISOString(), dataVersion: timedDataVersion,
    }))
  }, [scope, timedDataVersion, timedSession])

  function resetQuestionState() {
    setPracticeState(emptyFieldState()); setTimedStates({}); setRevealed(false); setRevealAcknowledgement(null); setQuestionComplete(false)
    composingRef.current = false; actionLockRef.current = false; timedPausedRef.current = false; practiceActionLockRef.current = false; acknowledgementLockRef.current = false
  }
  function startPractice(config: AppliedConfig) {
    setActive(config); setQuiz(startQuiz(questions(entities, capitals, config.continent))); setTimedSession(null); resetQuestionState()
    setPresentationKey((key) => key + 1); setFeedback({ kind: 'neutral', message: 'Fresh practice deck ready. Name this country’s capital.' })
  }
  function startTimed(config: AppliedConfig) {
    const currentQuestions = questions(entities, capitals, config.continent)
    if (currentQuestions.length === 0) return
    setActive(config); setQuiz(startQuiz(currentQuestions)); resetQuestionState(); recordedSessionRef.current = null
    setTimedSession(startTimedSession(currentQuestions.map((question) => question.id), performance.now()))
    setScoreboard(readScoreboard(safeLocalStorage(), { quizId, filters: { continent: config.continent }, dataVersion: timedScoreDataVersion(dataVersion) }))
    setPresentationKey((key) => key + 1); setFeedback({ kind: 'neutral', message: 'Timed run started. Type each required capital.' })
  }
  function applyDraft() { if (draft.mode === 'timed') startTimed(draft); else startPractice(draft) }
  function restartCurrentSetup() { if (active.mode === 'timed') startTimed(active); else startPractice(active) }
  function setPracticeValue(index: number, value: string) {
    if (isLocked(practiceState, index) || revealed || questionComplete) return
    setPracticeState((state) => ({ ...state, values: { ...state.values, [index]: value } }))
  }
  function checkPracticeAnswers() {
    if (!target || revealed || questionComplete) return
    const newlyLocked = target.fields.reduce<number[]>((result, field, index) => !isLocked(practiceState, index) && isAnswerCorrect(practiceState.values[index] ?? '', field, capitals) ? [...result, index] : result, [])
    const nextState: FieldState = { values: practiceState.values, locked: [...practiceState.locked, ...newlyLocked].sort((left, right) => left - right), revealed: practiceState.revealed }
    setPracticeState(nextState)
    if (allLocked(nextState, target.fields.length)) { setQuestionComplete(true); setFeedback({ kind: 'correct', message: 'All required capitals are correct. Continue when you are ready.' }) }
    else if (newlyLocked.length > 0) { setPresentationKey((key) => key + 1); setFeedback({ kind: 'correct', message: `${newlyLocked.length} capital ${newlyLocked.length === 1 ? 'is' : 'are'} correct. Complete the remaining fields.` }) }
    else {
      setFeedback({ kind: 'incorrect', message: 'No new correct answers yet. Try again, or reveal the remaining capitals.' })
      const unresolved = firstUnresolvedField(nextState, target.fields.length)
      if (unresolved !== null) window.setTimeout(() => { fieldRefs.current[unresolved]?.focus(); fieldRefs.current[unresolved]?.select() }, 0)
    }
  }
  function revealPracticeAnswers() {
    if (!target || revealed || questionComplete) return
    const values = { ...practiceState.values }
    target.fields.forEach((field, index) => { if (!isLocked(practiceState, index)) values[index] = field.capital.capital })
    setPracticeState({ values, locked: target.fields.map((_, index) => index), revealed: target.fields.flatMap((_, index) => isLocked(practiceState, index) ? [] : [index]) })
    setRevealed(true); setFeedback({ kind: 'revealed', message: 'Remaining capitals revealed. Continue when you are ready.' })
  }
  function nextPracticeQuestion() {
    if (!target || (!revealed && !questionComplete) || practiceActionLockRef.current) return
    setQuiz((current) => advanceQuiz(current, questionComplete && !revealed)); resetQuestionState(); practiceActionLockRef.current = true
    setPresentationKey((key) => key + 1); setFeedback({ kind: 'neutral', message: 'Next country. Name each required capital.' })
    window.setTimeout(() => { practiceActionLockRef.current = false }, 0)
  }
  function updateTimedState(questionId: string, update: (state: FieldState) => FieldState) { setTimedStates((states) => ({ ...states, [questionId]: update(states[questionId] ?? emptyFieldState()) })) }
  function transitionTimed(action: TimedSessionAction, message: Feedback) {
    if (!timedSession || !target || timedPausedRef.current || actionLockRef.current) return
    actionLockRef.current = true; setTimedSession((session) => session ? transitionTimedSession(session, action, performance.now()) : session)
    setPresentationKey((key) => key + 1); setFeedback(message); window.setTimeout(() => { actionLockRef.current = false }, 0)
  }
  function updateTimedValue(index: number, value: string) {
    if (!target || timedPausedRef.current || actionLockRef.current || isLocked(currentState, index)) return
    if (composingRef.current) { updateTimedState(target.id, (state) => ({ ...state, values: { ...state.values, [index]: value } })); return }
    const field = target.fields[index]
    const accepted = isTimedAnswerAccepted(value, field, capitals)
    const nextState: FieldState = accepted ? { values: { ...currentState.values, [index]: value }, locked: [...currentState.locked, index].sort((left, right) => left - right), revealed: currentState.revealed } : { ...currentState, values: { ...currentState.values, [index]: value } }
    updateTimedState(target.id, () => nextState)
    if (accepted && allLocked(nextState, target.fields.length)) transitionTimed('correct', { kind: 'correct', message: 'All required capitals are correct.' })
    else if (accepted) { setFeedback({ kind: 'correct', message: `${field.role} is correct. Continue with the remaining fields.` }); setPresentationKey((key) => key + 1) }
    else setFeedback({ kind: 'neutral', message: 'Type each required capital.' })
  }
  function revealTimedAnswers() {
    if (!target || timedPausedRef.current) return
    const values = { ...currentState.values }
    target.fields.forEach((field, index) => { if (!isLocked(currentState, index)) values[index] = field.capital.capital })
    updateTimedState(target.id, () => ({ values, locked: target.fields.map((_, index) => index), revealed: target.fields.flatMap((_, index) => isLocked(currentState, index) ? [] : [index]) }))
    setRevealAcknowledgement({ entityName: target.entity.name, answers: target.fields.map((field) => ({ role: field.role, capital: field.capital.capital })) })
    transitionTimed('reveal', { kind: 'revealed', message: 'Capital answers revealed.' })
  }
  function continueAfterReveal() {
    if (!revealAcknowledgement || acknowledgementLockRef.current) return
    acknowledgementLockRef.current = true; setRevealAcknowledgement(null); setFeedback({ kind: 'neutral', message: complete ? 'Timed run complete.' : 'Continue with the next country.' })
    setPresentationKey((key) => key + 1); window.setTimeout(() => { acknowledgementLockRef.current = false }, 0)
  }
  function skipTimedQuestion() {
    if (!timedSession) return
    transitionTimed('skip', { kind: 'neutral', message: timedSession.pendingQuestionIds.length === 1 ? 'Skipped. This is the only pending country, so it remains current.' : 'Skipped. This country returns after the other pending countries.' })
  }
  function pauseTimedRun() { if (!timedSession || !target || timedPausedRef.current) return; const now = performance.now(); timedPausedRef.current = true; setTimedSession((session) => session ? pauseTimedSession(session, now) : session) }
  function resumeTimedRun() { if (!timedPausedRef.current) return; const now = performance.now(); timedPausedRef.current = false; setTimedSession((session) => session ? resumeTimedSession(session, now) : session) }
  function manualTimedAction(action: 'skip' | 'reveal', event: MouseEvent<HTMLButtonElement>) { if (event.detail > 1) return; if (action === 'skip') skipTimedQuestion(); else revealTimedAnswers() }
  function preventRepeatedKeyboardActivation(event: KeyboardEvent<HTMLButtonElement>) { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault() }

  const setup = <SetupControls quizId={quizId} draft={draft} active={active} availableCount={draftQuestions.length} onDraftMode={(mode) => setDraft((current) => ({ ...current, mode }))} onDraftContinent={(continent) => setDraft((current) => ({ ...current, continent }))} onApply={applyDraft} />
  const headingId = `${quizId}-question-heading`
  if (revealAcknowledgement && timedSession) {
    const outcome = timedSessionOutcome(timedSession)
    return <main className="app-shell completion-shell"><section ref={revealSummaryRef} className="completion-card country-capital-reveal-card" aria-labelledby={`${quizId}-reveal-title`} aria-describedby={`${quizId}-reveal-description`} tabIndex={-1}>
      <p className="eyebrow">{quizTitle} · answer revealed</p><h1 id={`${quizId}-reveal-title`}>Answers revealed</h1><p className="country-capital-reveal-entity">{revealAcknowledgement.entityName}</p>
      <dl className="country-capital-reveal-list">{revealAcknowledgement.answers.map(({ role, capital }) => <div key={role}><dt>{role}</dt><dd>{capital}</dd></div>)}</dl>
      <p id={`${quizId}-reveal-description`} className="feedback revealed">Revealed — {revealAcknowledgement.entityName}: {revealAcknowledgement.answers.map(({ role, capital }) => `${role}: ${capital}`).join('; ')}.</p><TimedClock session={timedSession} />
      {!isTimedSessionComplete(timedSession) && <p className="progress"><span>{outcome.pendingCount} pending</span><strong>{outcome.correctCount} correct · {outcome.revealedCount} revealed</strong></p>}<button ref={nextButtonRef} className="primary-button completion-action" type="button" onClick={continueAfterReveal}>Continue</button>
    </section></main>
  }
  if (complete) {
    const outcome = timedSession ? timedSessionOutcome(timedSession) : null
    const duration = timedSession ? elapsedTimedSessionMs(timedSession, performance.now()) : 0
    return <main className="app-shell completion-shell"><section className="completion-card" aria-labelledby={`${quizId}-completion-title`}>
      <p className="eyebrow">{quizTitle} · {active.continent}</p><h1 id={`${quizId}-completion-title`}>{active.mode === 'timed' ? 'Timed run complete' : 'Deck complete'}</h1>
      {active.mode === 'timed' && outcome ? <><p className="score-number">{readableDuration(duration)} <span>{outcome.correctCount} correct · {outcome.revealedCount} revealed · {outcome.totalCount} total</span></p><p>{feedback.message}</p><section className="scoreboard" aria-labelledby={`${quizId}-scoreboard-heading`}><h2 id={`${quizId}-scoreboard-heading`}>Top 10 · {active.continent}</h2>{scoreboard.length === 0 ? <p>No stored timed results yet.</p> : <ol>{scoreboard.map((entry, index) => <li key={`${entry.completedAt}-${index}`}>{readableDuration(entry.durationMs)} · {entry.correctCount} correct · {entry.revealedCount} revealed · {entry.totalCount} total</li>)}</ol>}</section></> : <><p className="score-number">{quiz.correct} <span>of {activeQuestions.length}</span></p><p>You completed {quiz.correct} countries without revealing an answer.</p></>}
      <button ref={restartButtonRef} className="primary-button completion-action" type="button" onClick={restartCurrentSetup}>{active.mode === 'timed' ? 'Restart timed run' : 'Start a fresh deck'}</button>
    </section>{setup}</main>
  }
  if (!target) return <main className="app-shell quiz-active-shell">{setup}<p className="feedback incorrect" role="status">This setup has no countries.</p></main>
  const timedOutcome = timedSession ? timedSessionOutcome(timedSession) : null
  const resolved = revealed || questionComplete
  return <main className="app-shell quiz-active-shell"><header className="masthead"><div><p className="eyebrow">Geoquiz · {active.mode === 'timed' ? 'Timed' : 'Practice'} · {active.continent}</p><h1>{quizTitle}</h1></div>
    {active.mode === 'timed' && timedSession && timedOutcome ? <div className="timed-summary"><TimedClock session={timedSession} /><p className="progress" aria-label={`${timedOutcome.pendingCount} pending, ${timedOutcome.correctCount} correct, ${timedOutcome.revealedCount} revealed`}><span>{timedOutcome.pendingCount} pending</span><strong>{timedOutcome.correctCount} correct · {timedOutcome.revealedCount} revealed</strong></p></div> : <p className="progress"><span>{quiz.index + 1} / {quiz.deck.length}</span><strong>{quiz.correct} correct</strong></p>}</header>
    {setup}<section className={`country-capital-card${target.fields.length > 1 ? ' multi-field-card' : ''}`} aria-labelledby={headingId}><p className="eyebrow">{active.mode === 'timed' ? 'Timed question' : `Country ${quiz.index + 1}`}</p>{renderChallenge(target, { mode: active.mode, index: quiz.index, headingId })}<form onSubmit={(event) => { event.preventDefault(); if (active.mode === 'practice') checkPracticeAnswers() }}>
      <div className="country-capital-fields">{target.fields.map((field, index) => {
        const locked = isLocked(currentState, index); const fieldRevealed = isRevealed(currentState, index); const status = fieldRevealed ? 'Revealed' : locked ? 'Correct' : 'Pending'
        const fieldId = `${quizId}-field-${index}`; const statusId = `${quizId}-status-${index}`
        return <div className={`country-capital-field field-${status.toLowerCase()}`} key={field.capital.id}><label htmlFor={fieldId}>{field.role}</label><input ref={(element) => { fieldRefs.current[index] = element; if (index === focusIndex) pauseFocusRef.current = element }} id={fieldId} name={fieldId} value={currentState.values[index] ?? ''} onChange={(event: ChangeEvent<HTMLInputElement>) => active.mode === 'timed' ? updateTimedValue(index, event.target.value) : setPracticeValue(index, event.target.value)} onCompositionStart={() => { composingRef.current = true }} onCompositionEnd={(event) => { composingRef.current = false; if (active.mode === 'timed') updateTimedValue(index, event.currentTarget.value) }} disabled={locked || resolved} autoComplete="off" autoCapitalize="words" spellCheck="false" placeholder="Type your answer" aria-describedby={statusId} /><p id={statusId} className="field-status"><span aria-hidden="true">{status === 'Correct' ? '✓ ' : status === 'Revealed' ? '↳ ' : '○ '}</span>{status}</p></div>
      })}</div><p className={`feedback ${feedback.kind}`} role="status" aria-live="polite">{feedback.message}</p>
      {active.mode === 'practice' ? <div className="country-capital-actions">{!resolved ? <><button className="primary-button" type="submit">Check answers</button><button className="text-button" type="button" onClick={revealPracticeAnswers}>Reveal answers</button></> : <button ref={nextButtonRef} className="primary-button" type="button" onClick={nextPracticeQuestion}>Next country <span aria-hidden="true">→</span></button>}</div> : <div className="timed-actions"><TimedPause paused={isTimedSessionPaused(timedSession!)} canPause={!timedComplete && !revealAcknowledgement} focusRef={pauseFocusRef} onPause={pauseTimedRun} onResume={resumeTimedRun} /><button className="secondary-button" type="button" onClick={(event) => manualTimedAction('skip', event)} onKeyDown={preventRepeatedKeyboardActivation}>Skip</button><button className="text-button" type="button" onClick={(event) => manualTimedAction('reveal', event)} onKeyDown={preventRepeatedKeyboardActivation}>Reveal answers</button></div>}</form>
    </section></main>
}
