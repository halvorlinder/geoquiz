import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from "react";
import { CountryShapeAttribution, CountrySilhouette } from "../../components/CountrySilhouette";
import {
  entityCatalog,
  studyEntities,
  type StudyEntity,
} from "../../core/entity";
import { allHighPoints, type HighPointRecord } from "../../core/highPoints";
import {
  readScoreboard,
  recordScoreboardEntry,
  type ScoreboardEntry,
  type ScoreboardStorage,
} from "../../core/scoreboard/scoreboard";
import {
  currentQuestionId,
  elapsedTimedSessionMs,
  isTimedSessionComplete,
  startTimedSession,
  timedSessionOutcome,
  transitionTimedSession,
  type TimedSession,
} from "../../core/session/timedSession";
import {
  advanceQuiz,
  isComplete,
  startQuiz,
  type QuizProgress,
} from "../../core/shuffledDeck";
import {
  isHighPointAnswerCorrect,
  isTimedHighPointAnswerAccepted,
} from "./highPointAnswerMatching";
import {
  highPointContinents,
  shapeHighPointQuestions,
  type HighPointContinent,
  type ShapeHighPointQuestion,
} from "./shapeHighPoint";

type Mode = "practice" | "timed";
type Config = Readonly<{ mode: Mode; continent: HighPointContinent }>;
type State = Readonly<{
  value: string;
  resolved: "correct" | "revealed" | null;
}>;
type Feedback = Readonly<{
  kind: "neutral" | "correct" | "incorrect" | "revealed";
  message: string;
}>;
const dataVersion = `shape-high-point-v1-entities-${entityCatalog.version}-high-points-2026.08.20-shapes-2`;
const emptyState = (): State => ({ value: "", resolved: null });
const duration = (milliseconds: number) => {
  const seconds = Math.floor(milliseconds / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
function storage(): ScoreboardStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Direct Chrome-only QA fixture; production builds erase this branch. */
function developmentFixture(entities: readonly StudyEntity[]) {
  if (!import.meta.env.DEV) return undefined;
  if (window.location.hash.split("?")[1] !== "qa=colombia") return undefined;
  return shapeHighPointQuestions(entities).find((question) => question.entity.code === "COL");
}

function Timer({ session }: { session: TimedSession }) {
  const [now, setNow] = useState(() => performance.now());
  const complete = isTimedSessionComplete(session);
  useEffect(() => {
    setNow(performance.now());
    if (complete) return undefined;
    const id = window.setInterval(() => setNow(performance.now()), 250);
    return () => window.clearInterval(id);
  }, [complete, session]);
  const value = duration(elapsedTimedSessionMs(session, now));
  return (
    <p className="timer" aria-label={`Elapsed time ${value}`}>
      Time {value}
    </p>
  );
}

export type ShapeHighPointQuizProps = Readonly<{
  entities?: readonly StudyEntity[];
  questionFactory?: (
    continent: HighPointContinent,
  ) => readonly ShapeHighPointQuestion[];
  corpus?: readonly HighPointRecord[];
}>;

/** A locally sourced silhouette-and-marker highest-point quiz. */
export function ShapeHighPointQuiz({
  entities: suppliedEntities,
  questionFactory,
  corpus = allHighPoints(),
}: ShapeHighPointQuizProps) {
  const entities = suppliedEntities ?? studyEntities;
  const fixture = questionFactory ? undefined : developmentFixture(entities);
  const questionsFor = useCallback(
    (continent: HighPointContinent) =>
      fixture
        ? [fixture]
        : questionFactory
        ? questionFactory(continent)
        : shapeHighPointQuestions(entities, continent),
    [entities, fixture, questionFactory],
  );
  const allQuestions = useMemo(() => questionsFor("All"), [questionsFor]);
  const [draft, setDraft] = useState<Config>({
    mode: "practice",
    continent: "All",
  });
  const [active, setActive] = useState<Config>({
    mode: "practice",
    continent: "All",
  });
  const [practice, setPractice] = useState<
    QuizProgress<ShapeHighPointQuestion>
  >(() => startQuiz(allQuestions));
  const [timed, setTimed] = useState<TimedSession | null>(null);
  const [practiceState, setPracticeState] = useState<State>(emptyState);
  const [timedStates, setTimedStates] = useState<
    Readonly<Record<string, State>>
  >({});
  const [feedback, setFeedback] = useState<Feedback>({
    kind: "neutral",
    message: "Name the highest point marked on the country silhouette.",
  });
  const [acknowledgement, setAcknowledgement] =
    useState<ShapeHighPointQuestion | null>(null);
  const [scores, setScores] = useState<readonly ScoreboardEntry[]>([]);
  const [presentation, setPresentation] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const acknowledgementRef = useRef<HTMLElement>(null);
  const restartRef = useRef<HTMLButtonElement>(null);
  const composing = useRef(false);
  const actionLock = useRef(false);
  const recorded = useRef<TimedSession | null>(null);
  const activeQuestions = useMemo(
    () => questionsFor(active.continent),
    [active.continent, questionsFor],
  );
  const target =
    active.mode === "timed"
      ? timed
        ? activeQuestions.find(
            (question) => question.id === currentQuestionId(timed),
          )
        : undefined
      : practice.deck[practice.index];
  const state = target
    ? active.mode === "timed"
      ? (timedStates[target.id] ?? emptyState())
      : practiceState
    : emptyState();
  const complete =
    active.mode === "timed"
      ? timed !== null && isTimedSessionComplete(timed)
      : isComplete(practice);
  const scope = useMemo(
    () => ({
      quizId: "shape-high-point",
      filters: { continent: active.continent },
      dataVersion,
    }),
    [active.continent],
  );

  useEffect(() => {
    if (!target || complete || acknowledgement || state.resolved) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [acknowledgement, complete, presentation, state.resolved, target]);
  useEffect(() => {
    if (state.resolved) nextRef.current?.focus();
  }, [state.resolved]);
  useEffect(() => {
    if (acknowledgement) acknowledgementRef.current?.focus();
  }, [acknowledgement]);
  useEffect(() => {
    if (complete && !acknowledgement) restartRef.current?.focus();
  }, [acknowledgement, complete]);
  useEffect(() => {
    actionLock.current = false;
  }, [timed]);
  useEffect(() => {
    if (!timed || !isTimedSessionComplete(timed) || recorded.current === timed)
      return;
    recorded.current = timed;
    const result = timedSessionOutcome(timed);
    setScores(
      recordScoreboardEntry(storage(), scope, {
        durationMs: Math.round(elapsedTimedSessionMs(timed, performance.now())),
        correctCount: result.correctCount,
        revealedCount: result.revealedCount,
        totalCount: result.totalCount,
        completedAt: new Date().toISOString(),
        dataVersion,
      }),
    );
  }, [scope, timed]);

  function reset() {
    setPracticeState(emptyState());
    setTimedStates({});
    setAcknowledgement(null);
    composing.current = false;
    actionLock.current = false;
  }
  function start(config: Config) {
    const questions = questionsFor(config.continent);
    if (!questions.length) return;
    setActive(config);
    reset();
    setPractice(startQuiz(questions));
    setPresentation((value) => value + 1);
    if (config.mode === "timed") {
      recorded.current = null;
      setTimed(
        startTimedSession(
          questions.map((question) => question.id),
          performance.now(),
        ),
      );
      setScores(
        readScoreboard(storage(), {
          quizId: "shape-high-point",
          filters: { continent: config.continent },
          dataVersion,
        }),
      );
      setFeedback({
        kind: "neutral",
        message: "Timed run started. Type the highest point.",
      });
    } else {
      setTimed(null);
      setFeedback({
        kind: "neutral",
        message: "Fresh practice deck ready. Name the marked highest point.",
      });
    }
  }
  function updateState(update: (current: State) => State) {
    if (!target) return;
    if (active.mode === "timed")
      setTimedStates((states) => ({
        ...states,
        [target.id]: update(states[target.id] ?? emptyState()),
      }));
    else setPracticeState(update);
  }
  function transition(
    action: "correct" | "skip" | "reveal",
    message: Feedback,
  ) {
    if (!timed || actionLock.current) return;
    actionLock.current = true;
    setTimed((session) =>
      session
        ? transitionTimedSession(session, action, performance.now())
        : session,
    );
    setFeedback(message);
    setPresentation((value) => value + 1);
    window.setTimeout(() => {
      actionLock.current = false;
    }, 0);
  }
  function checkPractice() {
    if (!target || state.resolved) return;
    if (isHighPointAnswerCorrect(state.value, target.highPoint, corpus)) {
      updateState((current) => ({ ...current, resolved: "correct" }));
      setFeedback({
        kind: "correct",
        message: "Correct. Continue when you are ready.",
      });
      setPresentation((value) => value + 1);
    } else {
      setFeedback({
        kind: "incorrect",
        message: "Not recognized yet. Try again, or reveal the answer.",
      });
      window.setTimeout(() => inputRef.current?.select(), 0);
    }
  }
  function setValue(value: string) {
    updateState((current) => ({ ...current, value }));
    if (
      !target ||
      composing.current ||
      active.mode !== "timed" ||
      state.resolved
    )
      return;
    if (isTimedHighPointAnswerAccepted(value, target.highPoint, corpus)) {
      updateState(() => ({ value, resolved: "correct" }));
      transition("correct", { kind: "correct", message: "Correct." });
    } else setFeedback({ kind: "neutral", message: "Type the highest point." });
  }
  function reveal() {
    if (!target || state.resolved) return;
    updateState(() => ({
      value: target.highPoint.label,
      resolved: "revealed",
    }));
    setFeedback({
      kind: "revealed",
      message: "Answer revealed. Continue when you are ready.",
    });
    setPresentation((value) => value + 1);
    if (active.mode === "timed") {
      setAcknowledgement(target);
      transition("reveal", {
        kind: "revealed",
        message: "Highest point revealed.",
      });
    }
  }
  function nextPractice() {
    if (!target || !state.resolved || actionLock.current) return;
    actionLock.current = true;
    setPractice((current) =>
      advanceQuiz(current, state.resolved === "correct"),
    );
    setPracticeState(emptyState());
    setFeedback({
      kind: "neutral",
      message: "Next silhouette. Name the marked highest point.",
    });
    setPresentation((value) => value + 1);
    window.setTimeout(() => {
      actionLock.current = false;
    }, 0);
  }
  function continueReveal() {
    if (!acknowledgement || actionLock.current) return;
    actionLock.current = true;
    setAcknowledgement(null);
    setPresentation((value) => value + 1);
    window.setTimeout(() => {
      actionLock.current = false;
    }, 0);
  }
  function repeated(
    event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>,
  ) {
    if ("detail" in event && event.detail > 1) return true;
    if (
      "repeat" in event &&
      event.repeat &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      return true;
    }
    return false;
  }

  const setup = (
    <section className="setup-card" aria-labelledby="shape-high-point-setup">
      <h2 id="shape-high-point-setup">Run setup</h2>
      <fieldset className="setup-fieldset">
        <legend>Mode</legend>
        <label className="choice-label">
          <input
            type="radio"
            name="shape-high-point-mode"
            checked={draft.mode === "practice"}
            onChange={() =>
              setDraft((value) => ({ ...value, mode: "practice" }))
            }
          />{" "}
          Practice
        </label>
        <label className="choice-label">
          <input
            type="radio"
            name="shape-high-point-mode"
            checked={draft.mode === "timed"}
            onChange={() => setDraft((value) => ({ ...value, mode: "timed" }))}
          />{" "}
          Timed
        </label>
      </fieldset>
      <label htmlFor="shape-high-point-continent">Question set</label>
      <select
        id="shape-high-point-continent"
        value={draft.continent}
        onChange={(event) =>
          setDraft((value) => ({
            ...value,
            continent: event.target.value as HighPointContinent,
          }))
        }
      >
        {highPointContinents.map((continent) => (
          <option key={continent}>{continent}</option>
        ))}
      </select>
      <p className="setup-note">
        {questionsFor(draft.continent).length} countries in this setup. Active:{" "}
        {active.mode === "timed" ? "Timed" : "Practice"} · {active.continent}.
      </p>
      <button
        className="secondary-button"
        type="button"
        onClick={() => start(draft)}
      >
        {draft.mode === "timed"
          ? "Start timed run"
          : "Start / restart practice"}
      </button>
    </section>
  );

  if (acknowledgement && timed)
    return (
      <RevealCard
        question={acknowledgement}
        session={timed}
        reference={acknowledgementRef}
        onContinue={continueReveal}
      />
    );
  if (complete) {
    const outcome = timed ? timedSessionOutcome(timed) : null;
    return (
      <main className="app-shell completion-shell">
        <section
          className="completion-card"
          aria-labelledby="shape-high-point-complete"
        >
          <p className="eyebrow">Shape highest points · {active.continent}</p>
          <h1 id="shape-high-point-complete">
            {active.mode === "timed" ? "Timed run complete" : "Deck complete"}
          </h1>
          {outcome && timed ? (
            <>
              <p className="score-number">
                {duration(elapsedTimedSessionMs(timed, performance.now()))}
                <span>
                  {outcome.correctCount} correct · {outcome.revealedCount}{" "}
                  revealed · {outcome.totalCount} total
                </span>
              </p>
              <section
                className="scoreboard"
                aria-labelledby="shape-high-point-board"
              >
                <h2 id="shape-high-point-board">Top 10 · {active.continent}</h2>
                {scores.length ? (
                  <ol>
                    {scores.map((entry, index) => (
                      <li key={`${entry.completedAt}-${index}`}>
                        {duration(entry.durationMs)} · {entry.correctCount}{" "}
                        correct · {entry.revealedCount} revealed ·{" "}
                        {entry.totalCount} total
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>No stored timed results yet.</p>
                )}
              </section>
            </>
          ) : (
            <p>
              You completed {practice.correct} countries without revealing an
              answer.
            </p>
          )}
          <button
            ref={restartRef}
            className="primary-button"
            type="button"
            onClick={() => start(active)}
          >
            {active.mode === "timed"
              ? "Restart timed run"
              : "Start a fresh deck"}
          </button>
        </section>
        {setup}
      </main>
    );
  }
  if (!target)
    return (
      <main className="app-shell quiz-active-shell">
        {setup}
        <p className="feedback incorrect" role="status">
          This setup has no countries.
        </p>
      </main>
    );
  const outcome = timed ? timedSessionOutcome(timed) : null;
  return (
    <main className="app-shell quiz-active-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">
            Geoquiz · {active.mode === "timed" ? "Timed" : "Practice"} ·{" "}
            {active.continent}
          </p>
          <h1>Shape highest points</h1>
        </div>
        {timed && outcome ? (
          <div className="timed-summary">
            <Timer session={timed} />
            <p className="progress">
              <span>{outcome.pendingCount} pending</span>
              <strong>
                {outcome.correctCount} correct · {outcome.revealedCount}{" "}
                revealed
              </strong>
            </p>
          </div>
        ) : (
          <p className="progress">
            <span>
              {practice.index + 1} / {practice.deck.length}
            </span>
            <strong>{practice.correct} correct</strong>
          </p>
        )}
      </header>
      {setup}
      <section
        className={`country-capital-card shape-high-point-card ${state.resolved ? `shape-high-point-card--resolved high-point-${state.resolved}` : ""}`}
        aria-labelledby="shape-high-point-question"
      >
        <p className="eyebrow">
          {active.mode === "timed"
            ? "Timed question"
            : `Country ${practice.index + 1}`}
        </p>
        <div className="shape-capital-visual">
          <CountrySilhouette
            shape={target.shape}
            frame={target.frame}
            accessibleLabel="Country silhouette, marked point"
            className="shape-capital-silhouette"
          >
            <g
              className={`high-point-marker${target.markerRelation === "outside" ? " high-point-marker-outside" : ""}`}
              aria-hidden="true"
            >
              <circle
                cx={target.marker[0]}
                cy={target.marker[1]}
                r={Math.max(target.frame.width, target.frame.height) / 38}
                strokeWidth="3px"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={target.marker[0]}
                cy={target.marker[1]}
                r={Math.max(target.frame.width, target.frame.height) / 75}
                strokeWidth="2px"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </CountrySilhouette>
        </div>
        <CountryShapeAttribution shape={target.shape} />
        <h2 id="shape-high-point-question">Country silhouette; marked point</h2>
        <p className="country-capital-instruction">
          Name the highest point. Exact sourced points may sit outside a
          simplified silhouette for border summits or tiny islands.
        </p>
        {state.resolved && (
          <p className="high-point-answer">
            <span>
              {state.resolved === "correct" ? "Correct:" : "Revealed:"}
            </span>{" "}
            {target.highPoint.label}
          </p>
        )}
        {state.resolved === "revealed" && <RevealDetails question={target} />}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (active.mode === "practice") checkPractice();
          }}
        >
          <label htmlFor="shape-high-point-answer">Highest point</label>
          <input
            ref={inputRef}
            id="shape-high-point-answer"
            value={state.value}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setValue(event.target.value)
            }
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(event) => {
              composing.current = false;
              if (active.mode === "timed") setValue(event.currentTarget.value);
            }}
            disabled={Boolean(state.resolved)}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck="false"
            placeholder="Type the highest point"
          />
          <p
            className={`feedback ${feedback.kind}`}
            role="status"
            aria-live="polite"
          >
            {feedback.message}
          </p>
          {active.mode === "practice" && !state.resolved && (
            <button className="primary-button" type="submit">
              Check answer
            </button>
          )}
        </form>
        {active.mode === "practice" ? (
          <div className="country-capital-actions">
            {state.resolved ? (
              <button
                ref={nextRef}
                className="primary-button"
                type="button"
                onClick={nextPractice}
              >
                Next country <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button className="text-button" type="button" onClick={reveal}>
                Reveal answer
              </button>
            )}
          </div>
        ) : (
          <div className="timed-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={(event) => {
                if (!repeated(event))
                  transition("skip", {
                    kind: "neutral",
                    message:
                      timed!.pendingQuestionIds.length === 1
                        ? "Skipped. This is the only pending country."
                        : "Skipped. This country returns after the other pending countries.",
                  });
              }}
              onKeyDown={repeated}
            >
              Skip
            </button>
            <button
              className="text-button"
              type="button"
              onClick={(event) => {
                if (!repeated(event)) reveal();
              }}
              onKeyDown={repeated}
            >
              Reveal answer
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function RevealDetails({ question }: { question: ShapeHighPointQuestion }) {
  const elevation =
    question.highPoint.elevationMetres === undefined
      ? "Elevation not listed"
      : `${question.highPoint.elevationMetres.toLocaleString("en-US")} m`;
  return (
    <dl className="country-capital-reveal-list high-point-reveal-details">
      <div>
        <dt>Country</dt>
        <dd>{question.entity.name}</dd>
      </div>
      <div>
        <dt>Elevation</dt>
        <dd>{elevation}</dd>
      </div>
      <div>
        <dt>Coordinate confidence</dt>
        <dd>{question.highPoint.coordinateConfidence}</dd>
      </div>
      {question.highPoint.note && (
        <div className="high-point-note">
          <dt>Note</dt>
          <dd>{question.highPoint.note}</dd>
        </div>
      )}
    </dl>
  );
}

function RevealCard({
  question,
  session,
  reference,
  onContinue,
}: Readonly<{
  question: ShapeHighPointQuestion;
  session: TimedSession;
  reference: RefObject<HTMLElement | null>;
  onContinue: () => void;
}>) {
  const elevation =
    question.highPoint.elevationMetres === undefined
      ? "Elevation not listed"
      : `${question.highPoint.elevationMetres.toLocaleString("en-US")} m`;
  return (
    <main className="app-shell completion-shell">
      <section
        ref={reference}
        className="completion-card country-capital-reveal-card"
        aria-labelledby="shape-high-point-reveal-title"
        tabIndex={-1}
      >
        <p className="eyebrow">Shape highest points · answer revealed</p>
        <h1 id="shape-high-point-reveal-title">Answer revealed</h1>
        <p className="country-capital-reveal-entity">{question.entity.name}</p>
        <dl className="country-capital-reveal-list">
          <div>
            <dt>Highest point</dt>
            <dd>{question.highPoint.label}</dd>
          </div>
          <div>
            <dt>Elevation</dt>
            <dd>{elevation}</dd>
          </div>
          <div>
            <dt>Coordinate confidence</dt>
            <dd>{question.highPoint.coordinateConfidence}</dd>
          </div>
          {question.highPoint.note && (
            <div>
              <dt>Note</dt>
              <dd>{question.highPoint.note}</dd>
            </div>
          )}
        </dl>
        <p className="feedback revealed" role="status">
          Revealed — highest point answer shown.
        </p>
        <Timer session={session} />
        <button
          className="primary-button completion-action"
          type="button"
          onClick={onContinue}
        >
          Continue
        </button>
      </section>
    </main>
  );
}

export default ShapeHighPointQuiz;
