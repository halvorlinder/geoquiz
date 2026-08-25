import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { CountryShapeAttribution, CountrySilhouette } from "../../components/CountrySilhouette";
import countryShapesData from "../../data/country-shapes.json";
import { getCountryShape, type CountryShapeDataset } from "../../core/countryShapes";
import {
  entityCatalog,
  studyEntities,
  type StudyEntity,
} from "../../core/entity";
import { matchNeighbourAnswer } from "../../core/entityAnswerMatching";
import { NEIGHBOUR_DATA_VERSION } from "../../core/neighbours";
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
  entityForNeighbourCode,
  neighbourContinents,
  shapeNeighboursQuestions,
  type NeighbourContinent,
  type ShapeNeighboursQuestion,
} from "./shapeNeighbours";
import { NeighbourProgressMap, type NeighbourProgressLayer } from "./NeighbourProgressMap";

type Mode = "practice" | "timed";
type Config = Readonly<{ mode: Mode; continent: NeighbourContinent }>;
type QuestionState = Readonly<{
  value: string;
  foundCodes: readonly string[];
  revealed: boolean;
  complete: boolean;
}>;
type Feedback = Readonly<{
  kind: "neutral" | "correct" | "incorrect" | "revealed";
  message: string;
}>;

const DATA_VERSION = `shape-neighbours-v1-entities-${entityCatalog.version}-shapes-${(countryShapesData as { version: number }).version}-neighbours-${NEIGHBOUR_DATA_VERSION}`;
const countryShapeDataset = countryShapesData as unknown as CountryShapeDataset;
const emptyState = (): QuestionState => ({
  value: "",
  foundCodes: [],
  revealed: false,
  complete: false,
});
const duration = (milliseconds: number) => {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
function storage(): ScoreboardStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
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

function setupCount(
  entities: readonly StudyEntity[],
  continent: NeighbourContinent,
) {
  return shapeNeighboursQuestions(entities, continent).length;
}

/** Direct Chrome-only QA fixture; production builds erase this branch. */
function developmentFixture(entities: readonly StudyEntity[]) {
  if (!import.meta.env.DEV) return undefined;
  if (window.location.hash.split("?")[1] !== "qa=china") return undefined;
  return shapeNeighboursQuestions(entities).find((question) => question.entity.code === "CHN");
}

export type ShapeNeighboursQuizProps = Readonly<{
  entities?: readonly StudyEntity[];
  /** Test seam: production uses the audited local question factory. */
  questionFactory?: (
    continent: NeighbourContinent,
  ) => readonly ShapeNeighboursQuestion[];
}>;

/** A silhouette-only, multiple-answer country-neighbours game. */
export function ShapeNeighboursQuiz({
  entities: suppliedEntities,
  questionFactory,
}: ShapeNeighboursQuizProps) {
  // Tests may inject a small catalog; production always uses the checked local catalog.
  const entities = suppliedEntities ?? studyEntities;
  const fixture = questionFactory ? undefined : developmentFixture(entities);
  const questionsFor = useCallback(
    (continent: NeighbourContinent) =>
      fixture
        ? [fixture]
        : questionFactory
        ? questionFactory(continent)
        : shapeNeighboursQuestions(entities, continent),
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
    QuizProgress<ShapeNeighboursQuestion>
  >(() => startQuiz(allQuestions));
  const [timed, setTimed] = useState<TimedSession | null>(null);
  const [practiceState, setPracticeState] = useState<QuestionState>(emptyState);
  const [timedStates, setTimedStates] = useState<
    Readonly<Record<string, QuestionState>>
  >({});
  const [feedback, setFeedback] = useState<Feedback>({
    kind: "neutral",
    message: "Name one neighbouring country.",
  });
  const [acknowledgement, setAcknowledgement] =
    useState<ShapeNeighboursQuestion | null>(null);
  const [scores, setScores] = useState<readonly ScoreboardEntry[]>([]);
  const [presentation, setPresentation] = useState(0);
  const [showProgressMap, setShowProgressMap] = useState(false);
  const [recenterVersion, setRecenterVersion] = useState(0);
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
  const draftCount = fixture
    ? 1
    : questionFactory
    ? questionsFor(draft.continent).length
    : setupCount(entities, draft.continent);
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
  const progressLayers = useMemo<NeighbourProgressLayer[]>(() => {
    if (!target) return [];
    const foundLayers = state.foundCodes.flatMap<NeighbourProgressLayer>((code) => {
      const shape = getCountryShape(countryShapeDataset, code);
      return shape ? [{ shape, status: "found" as const }] : [];
    });
    const revealedLayers = state.revealed
      ? target.neighbourCodes
          .filter((code) => !state.foundCodes.includes(code))
          .flatMap<NeighbourProgressLayer>((code) => {
            const shape = getCountryShape(countryShapeDataset, code);
            return shape ? [{ shape, status: "revealed" as const }] : [];
          })
      : [];
    return [...foundLayers, ...revealedLayers];
  }, [state.foundCodes, state.revealed, target]);
  const scope = useMemo(
    () => ({
      quizId: "shape-neighbours",
      filters: { continent: active.continent },
      dataVersion: DATA_VERSION,
    }),
    [active.continent],
  );

  useEffect(() => {
    if (
      !target ||
      complete ||
      acknowledgement ||
      state.complete ||
      state.revealed
    )
      return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [
    acknowledgement,
    complete,
    presentation,
    state.complete,
    state.revealed,
    target,
  ]);
  useEffect(() => {
    if (state.complete || state.revealed) nextRef.current?.focus();
  }, [state.complete, state.revealed]);
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
        dataVersion: DATA_VERSION,
      }),
    );
  }, [scope, timed]);

  function resetStates() {
    setPracticeState(emptyState());
    setTimedStates({});
    setAcknowledgement(null);
    composing.current = false;
    actionLock.current = false;
  }
  function start(config: Config) {
    const questions = questionsFor(config.continent);
    if (questions.length === 0) return;
    setActive(config);
    resetStates();
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
          quizId: "shape-neighbours",
          filters: { continent: config.continent },
          dataVersion: DATA_VERSION,
        }),
      );
      setFeedback({
        kind: "neutral",
        message: "Timed run started. Type one neighbour at a time.",
      });
    } else {
      setTimed(null);
      setFeedback({
        kind: "neutral",
        message: "Fresh practice deck ready. Name one neighbouring country.",
      });
    }
  }
  function updateState(update: (current: QuestionState) => QuestionState) {
    if (!target) return;
    if (active.mode === "timed")
      setTimedStates((states) => ({
        ...states,
        [target.id]: update(states[target.id] ?? emptyState()),
      }));
    else setPracticeState(update);
  }
  function focusInput(select = false) {
    window.setTimeout(() => {
      inputRef.current?.focus();
      if (select) inputRef.current?.select();
    }, 0);
  }
  function process(value: string, timedMode: boolean) {
    if (!target || state.revealed || state.complete) return;
    const match = matchNeighbourAnswer(
      value,
      target.neighbourCodes,
      state.foundCodes,
      entities,
      { timed: timedMode },
    );
    if (match.status === "correct-new") {
      const foundCodes = [...state.foundCodes, match.entity.code];
      const finished = foundCodes.length === target.neighbourCodes.length;
      updateState((current) => ({
        ...current,
        value: "",
        foundCodes,
        complete: finished,
      }));
      setFeedback({
        kind: "correct",
        message: finished
          ? `${match.entity.name} accepted. Every neighbour is correct. Continue when you are ready.`
          : `${match.entity.name} accepted. ${target.neighbourCodes.length - foundCodes.length} remaining.`,
      });
      setPresentation((number) => number + 1);
      focusInput();
      if (timedMode && finished)
        transition("correct", "All neighbours are correct.");
      return;
    }
    // A timed incomplete spelling is ordinarily just typing. Exact known
    // mistakes retain useful classification without being accepted.
    if (timedMode && match.status === "invalid") {
      setFeedback({
        kind: "neutral",
        message: "Type one neighbouring country.",
      });
      return;
    }
    const message =
      match.status === "duplicate"
        ? "That neighbour is already recorded."
        : match.status === "known-non-neighbour"
          ? "That country is known, but is not a required neighbour."
          : match.status === "ambiguous"
            ? "That answer is ambiguous. Try a fuller country name."
            : "No new neighbour recognized yet. Try again.";
    setFeedback({ kind: "incorrect", message });
    if (!timedMode) focusInput(true);
  }
  function setValue(value: string) {
    updateState((current) => ({ ...current, value }));
    if (!composing.current && active.mode === "timed") process(value, true);
  }
  function transition(action: "correct" | "skip" | "reveal", message: string) {
    if (!timed || actionLock.current) return;
    actionLock.current = true;
    setTimed((session) =>
      session
        ? transitionTimedSession(session, action, performance.now())
        : session,
    );
    setFeedback({
      kind:
        action === "reveal"
          ? "revealed"
          : action === "correct"
            ? "correct"
            : "neutral",
      message,
    });
    setPresentation((number) => number + 1);
    window.setTimeout(() => {
      actionLock.current = false;
    }, 0);
  }
  function reveal() {
    if (!target || state.revealed || state.complete) return;
    updateState((current) => ({
      ...current,
      revealed: true,
      complete: false,
      value: "",
    }));
    setFeedback({
      kind: "revealed",
      message: "Answers revealed. Continue when you are ready.",
    });
    setPresentation((number) => number + 1);
    if (active.mode === "timed") {
      setAcknowledgement(target);
      transition("reveal", "Neighbour answers revealed.");
    }
  }
  function nextPractice() {
    if (!target || (!state.complete && !state.revealed) || actionLock.current)
      return;
    actionLock.current = true;
    setPractice((current) =>
      advanceQuiz(current, state.complete && !state.revealed),
    );
    setPracticeState(emptyState());
    setFeedback({
      kind: "neutral",
      message: "Next silhouette. Name one neighbouring country.",
    });
    setPresentation((number) => number + 1);
    window.setTimeout(() => {
      actionLock.current = false;
    }, 0);
  }
  function continueReveal() {
    if (!acknowledgement || actionLock.current) return;
    actionLock.current = true;
    setAcknowledgement(null);
    setPresentation((number) => number + 1);
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
    <section className="setup-card" aria-labelledby="shape-neighbours-setup">
      <h2 id="shape-neighbours-setup">Run setup</h2>
      <fieldset className="setup-fieldset">
        <legend>Mode</legend>
        <label className="choice-label">
          <input
            type="radio"
            name="shape-neighbours-mode"
            checked={draft.mode === "practice"}
            onChange={() =>
              setDraft((current) => ({ ...current, mode: "practice" }))
            }
          />{" "}
          Practice
        </label>
        <label className="choice-label">
          <input
            type="radio"
            name="shape-neighbours-mode"
            checked={draft.mode === "timed"}
            onChange={() =>
              setDraft((current) => ({ ...current, mode: "timed" }))
            }
          />{" "}
          Timed
        </label>
      </fieldset>
      <label htmlFor="shape-neighbours-continent">Question set</label>
      <select
        id="shape-neighbours-continent"
        value={draft.continent}
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            continent: event.target.value as NeighbourContinent,
          }))
        }
      >
        {neighbourContinents.map((continent) => (
          <option key={continent}>{continent}</option>
        ))}
      </select>
      <p className="setup-note">
        {draftCount} countries in this setup. Active:{" "}
        {active.mode === "timed" ? "Timed" : "Practice"} · {active.continent}.
      </p>
      <button
        className="secondary-button"
        type="button"
        disabled={draftCount === 0}
        onClick={() => start(draft)}
      >
        {draft.mode === "timed"
          ? "Start timed run"
          : "Start / restart practice"}
      </button>
    </section>
  );

  if (acknowledgement && timed) {
    const answers = acknowledgement.neighbourCodes
      .map((code) => entityForNeighbourCode(code, entities))
      .filter((entity): entity is StudyEntity => Boolean(entity));
    return (
      <main className="app-shell completion-shell">
        <section
          ref={acknowledgementRef}
          className="completion-card country-capital-reveal-card"
          aria-labelledby="shape-neighbours-reveal-title"
          tabIndex={-1}
        >
          <p className="eyebrow">Shape neighbours · answer revealed</p>
          <h1 id="shape-neighbours-reveal-title">Answers revealed</h1>
          <p className="country-capital-reveal-entity">
            {acknowledgement.entity.name}
          </p>
          <ul className="neighbour-answer-list">
            {answers.map((entity) => (
              <li key={entity.code}>{entity.name}</li>
            ))}
          </ul>
          <p className="feedback revealed" role="status">
            Revealed — {acknowledgement.entity.name} and all required
            neighbours.
          </p>
          <Timer session={timed} />
          <button
            className="primary-button completion-action"
            type="button"
            onClick={continueReveal}
          >
            Continue
          </button>
        </section>
      </main>
    );
  }
  if (complete) {
    const outcome = timed ? timedSessionOutcome(timed) : null;
    return (
      <main className="app-shell completion-shell">
        <section
          className="completion-card"
          aria-labelledby="shape-neighbours-complete"
        >
          <p className="eyebrow">Shape neighbours · {active.continent}</p>
          <h1 id="shape-neighbours-complete">
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
                aria-labelledby="shape-neighbours-board"
              >
                <h2 id="shape-neighbours-board">Top 10 · {active.continent}</h2>
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
  const found = state.foundCodes
    .map((code) => entityForNeighbourCode(code, entities))
    .filter((entity): entity is StudyEntity => Boolean(entity));
  const mapEnabled = active.mode === "practice" && showProgressMap;
  const denseRoster = target.neighbourCodes.length >= 12;
  const denseMixedReveal = denseRoster && state.revealed;
  return (
    <main className={`app-shell quiz-active-shell shape-neighbours-shell${denseRoster ? " shape-neighbours-shell--dense-roster" : ""}`}>
      <header className="masthead">
        <div>
          <p className="eyebrow">
            Geoquiz · {active.mode === "timed" ? "Timed" : "Practice"} ·{" "}
            {active.continent}
          </p>
          <h1>Shape neighbours</h1>
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
        className={`country-capital-card shape-neighbours-card ${mapEnabled ? "shape-neighbours-card--map" : "shape-neighbours-card--silhouette"} ${denseRoster ? "shape-neighbours-card--dense-roster" : ""} ${state.foundCodes.length > 0 && !state.complete && !state.revealed ? "shape-neighbours-card--partial" : ""} ${active.mode === "practice" ? "shape-neighbours-card--practice" : "shape-neighbours-card--timed"} ${state.complete ? "shape-neighbours-card--resolved neighbours-correct" : state.revealed ? "shape-neighbours-card--resolved shape-neighbours-card--revealed neighbours-revealed" : ""}`}
        aria-labelledby="shape-neighbours-question"
      >
        <p className="eyebrow">
          {active.mode === "timed"
            ? "Timed question"
            : `Country ${practice.index + 1}`}
        </p>
        {active.mode === "practice" && (
          <div className="shape-neighbours-aid">
            <p className="shape-neighbours-aid-copy">Build the local map as you identify each neighbour.</p>
            <button
              type="button"
              className="map-layer-switch"
              role="switch"
              aria-checked={showProgressMap}
              onClick={() => setShowProgressMap((visible) => !visible)}
            >
              <span>Neighbour map</span>
              <span className="map-layer-switch-state" aria-hidden="true">{showProgressMap ? "On" : "Off"}</span>
            </button>
          </div>
        )}
        {mapEnabled ? (
          <>
            <NeighbourProgressMap
              targetShape={target.shape}
              layers={progressLayers}
              questionKey={target.id}
              recenterVersion={recenterVersion}
            />
            <button
              className="secondary-button shape-neighbours-recenter"
              type="button"
              onClick={() => setRecenterVersion((version) => version + 1)}
            >
              Recenter target
            </button>
          </>
        ) : (
          <>
            <div className="shape-capital-visual">
              <CountrySilhouette
                shape={target.shape}
                accessibleLabel="Country silhouette"
                className="shape-capital-silhouette"
              />
            </div>
            <CountryShapeAttribution shape={target.shape} />
          </>
        )}
        <h2 id="shape-neighbours-question">Country silhouette</h2>
        <p className="country-capital-instruction">
          Name every neighbouring country, one at a time.
        </p>
        <p className="neighbour-progress">
          <strong>
            {target.neighbourCodes.length - state.foundCodes.length} remaining
          </strong>
          <span>{state.foundCodes.length} found</span>
        </p>
        {found.length > 0 && !denseMixedReveal && (
          <ul
            className="neighbour-answer-list"
            aria-label="Answered neighbours"
          >
            {found.map((entity) => (
              <li key={entity.code}>
                <span aria-hidden="true">✓ </span>
                {entity.name}
              </li>
            ))}
          </ul>
        )}
        {state.revealed && (
          <>
            <p className="country-capital-reveal-entity">
              {target.entity.name}
              {denseMixedReveal && <span className="neighbour-answer-legend"><span aria-hidden="true">✓ Correct</span><span aria-hidden="true">Dashed Revealed</span><span className="visually-hidden">Answer key: solid check-mark chips are correct; dashed chips are revealed.</span></span>}
            </p>
            {denseMixedReveal ? (
              <ul className="neighbour-answer-list neighbour-answer-list--mixed" aria-label="Answered and revealed neighbours">
                {target.neighbourCodes.map((code) => {
                  const entity = entityForNeighbourCode(code, entities);
                  const correct = state.foundCodes.includes(code);
                  const status = correct ? "Correct" : "Revealed";
                  return entity ? (
                    <li aria-label={`${entity.name} — ${status}`} className={correct ? "neighbour-answer--correct" : "neighbour-answer--revealed"} key={entity.code}>{entity.name}</li>
                  ) : null;
                })}
              </ul>
            ) : (
              <ul
                className="neighbour-answer-list"
                aria-label="Revealed neighbours"
              >
                {target.neighbourCodes
                  .filter((code) => !state.foundCodes.includes(code))
                  .map((code) => {
                    const entity = entityForNeighbourCode(code, entities);
                    return entity ? (
                      <li key={entity.code}>{entity.name}</li>
                    ) : null;
                  })}
              </ul>
            )}
          </>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (active.mode === "practice") process(state.value, false);
          }}
        >
          <label htmlFor="shape-neighbours-answer">Neighbouring country</label>
          <input
            ref={inputRef}
            id="shape-neighbours-answer"
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
            disabled={state.complete || state.revealed}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck="false"
            placeholder="Type one country"
          />
          <p
            className={`feedback ${feedback.kind}`}
            role="status"
            aria-live="polite"
          >
            {feedback.message}
          </p>
          {active.mode === "practice" && !state.complete && !state.revealed && (
            <button className="primary-button" type="submit">
              Check answer
            </button>
          )}
        </form>
        {active.mode === "practice" ? (
          <div className="country-capital-actions">
            {!state.complete && !state.revealed ? (
              <button className="text-button" type="button" onClick={reveal}>
                Reveal answers
              </button>
            ) : (
              <button
                ref={nextRef}
                className="primary-button"
                type="button"
                onClick={nextPractice}
              >
                Next country <span aria-hidden="true">→</span>
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
                  transition(
                    "skip",
                    timed!.pendingQuestionIds.length === 1
                      ? "Skipped. This is the only pending country."
                      : "Skipped. This country returns after the other pending countries.",
                  );
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
              Reveal answers
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default ShapeNeighboursQuiz;
