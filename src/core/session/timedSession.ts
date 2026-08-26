export type QuestionStatus = 'pending' | 'correct' | 'revealed'

export type TimedSessionAction = 'correct' | 'skip' | 'reveal'

export type TimedSession = Readonly<{
  questionIds: readonly string[]
  pendingQuestionIds: readonly string[]
  statusByQuestionId: Readonly<Record<string, QuestionStatus>>
  startedAtMs: number
  completedAtMs: number | null
  /** The monotonic instant at which the run was manually paused. */
  pausedAtMs: number | null
  /** Sum of completed pause intervals; the open interval is derived from pausedAtMs. */
  pausedDurationMs: number
}>

type RandomSource = () => number

const questionStatuses: readonly QuestionStatus[] = ['pending', 'correct', 'revealed']

function fail(message: string): never {
  throw new TypeError(`Invalid timed session: ${message}`)
}

function assertFiniteClock(value: number, label: string): void {
  if (!Number.isFinite(value)) fail(`${label} must be a finite number`)
}

function assertQuestionId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail('question IDs must be non-empty strings')
  }
}

function assertQuestionIds(questionIds: readonly string[]): void {
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    fail('at least one question ID is required')
  }

  const seen = new Set<string>()
  for (const questionId of questionIds) {
    assertQuestionId(questionId)
    if (seen.has(questionId)) fail(`duplicate question ID "${questionId}"`)
    seen.add(questionId)
  }
}

function shuffle(questionIds: readonly string[], random: RandomSource): string[] {
  if (typeof random !== 'function') fail('random source must be a function')

  const shuffled = [...questionIds]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const value = random()
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      fail('random source must return a finite number in [0, 1)')
    }
    const swapIndex = Math.floor(value * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function freezeSession(
  questionIds: readonly string[],
  pendingQuestionIds: readonly string[],
  statusByQuestionId: Record<string, QuestionStatus>,
  startedAtMs: number,
  completedAtMs: number | null,
  pausedAtMs: number | null,
  pausedDurationMs: number,
): TimedSession {
  const copiedStatuses = createStatusRecord(questionIds, statusByQuestionId)
  return Object.freeze({
    questionIds: Object.freeze([...questionIds]),
    pendingQuestionIds: Object.freeze([...pendingQuestionIds]),
    statusByQuestionId: Object.freeze(copiedStatuses),
    startedAtMs,
    completedAtMs,
    pausedAtMs,
    pausedDurationMs,
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  try {
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
  } catch {
    return false
  }
}

function createStatusRecord(
  questionIds: readonly string[],
  source: Readonly<Record<string, QuestionStatus>>,
): Record<string, QuestionStatus> {
  const statuses = Object.create(null) as Record<string, QuestionStatus>
  for (const questionId of questionIds) {
    Object.defineProperty(statuses, questionId, {
      value: source[questionId],
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  return statuses
}

function assertExactStatusRecord(
  statusByQuestionId: unknown,
  questionIds: readonly string[],
): Readonly<Record<string, QuestionStatus>> {
  if (!isRecord(statusByQuestionId)) fail('question statuses must be a record')
  try {
    const expectedIds = new Set(questionIds)
    const ownKeys = Reflect.ownKeys(statusByQuestionId)
    if (
      ownKeys.length !== expectedIds.size ||
      ownKeys.some((key) => typeof key !== 'string' || !expectedIds.has(key))
    ) {
      fail('question statuses must match the question IDs')
    }
    const snapshot = Object.create(null) as Record<string, QuestionStatus>
    for (const questionId of questionIds) {
      const descriptor = Object.getOwnPropertyDescriptor(statusByQuestionId, questionId)
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor) || !questionStatuses.includes(descriptor.value)) {
        fail('question status is invalid')
      }
      Object.defineProperty(snapshot, questionId, {
        value: descriptor.value,
        enumerable: true,
        configurable: false,
        writable: false,
      })
    }
    return Object.freeze(snapshot)
  } catch (error) {
    if (error instanceof TypeError && error.message.startsWith('Invalid timed session:')) throw error
    fail('question statuses must be a readable record')
  }
}

function assertValidSession(session: TimedSession): Readonly<Record<string, QuestionStatus>> {
  if (typeof session !== 'object' || session === null) fail('state must be an object')
  assertQuestionIds(session.questionIds)
  if (!Array.isArray(session.pendingQuestionIds)) fail('pending question IDs must be an array')
  const statusByQuestionId = assertExactStatusRecord(session.statusByQuestionId, session.questionIds)
  assertFiniteClock(session.startedAtMs, 'startedAtMs')
  if (session.pausedAtMs !== null) assertFiniteClock(session.pausedAtMs, 'pausedAtMs')
  if (!Number.isFinite(session.pausedDurationMs) || session.pausedDurationMs < 0) {
    fail('pausedDurationMs must be a non-negative finite number')
  }

  const allQuestionIds = new Set(session.questionIds)

  const pendingIds = new Set<string>()
  for (const questionId of session.pendingQuestionIds) {
    if (!allQuestionIds.has(questionId) || pendingIds.has(questionId)) {
      fail('pending question IDs must be unique known question IDs')
    }
    pendingIds.add(questionId)
  }

  for (const questionId of session.questionIds) {
    const status = statusByQuestionId[questionId]
    if ((status === 'pending') !== pendingIds.has(questionId)) {
      fail('pending question IDs must match pending statuses')
    }
  }

  if (session.pendingQuestionIds.length === 0) {
    if (session.completedAtMs === null) fail('completed state requires completedAtMs')
    assertFiniteClock(session.completedAtMs, 'completedAtMs')
  } else if (session.completedAtMs !== null) {
    fail('incomplete state cannot have completedAtMs')
  }
  if (session.completedAtMs !== null && session.pausedAtMs !== null) fail('completed state cannot be paused')
  return statusByQuestionId
}

/** Starts a deterministic, circular timed run. The caller owns the clock. */
export function startTimedSession(
  questionIds: readonly string[],
  nowMs: number,
  random: RandomSource = Math.random,
): TimedSession {
  assertQuestionIds(questionIds)
  assertFiniteClock(nowMs, 'nowMs')
  const shuffledQuestionIds = shuffle(questionIds, random)
  const statusByQuestionId = Object.create(null) as Record<string, QuestionStatus>
  for (const questionId of shuffledQuestionIds) {
    Object.defineProperty(statusByQuestionId, questionId, {
      value: 'pending',
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  return freezeSession(
    shuffledQuestionIds,
    shuffledQuestionIds,
    statusByQuestionId,
    nowMs,
    null,
    null,
    0,
  )
}

export function currentQuestionId(session: TimedSession): string | null {
  assertValidSession(session)
  return session.pendingQuestionIds[0] ?? null
}

export function isTimedSessionComplete(session: TimedSession): boolean {
  assertValidSession(session)
  return session.pendingQuestionIds.length === 0
}

export function elapsedTimedSessionMs(session: TimedSession, nowMs: number): number {
  assertValidSession(session)
  assertFiniteClock(nowMs, 'nowMs')
  const endMs = session.completedAtMs ?? session.pausedAtMs ?? nowMs
  return Math.max(0, endMs - session.startedAtMs - session.pausedDurationMs)
}

export function isTimedSessionPaused(session: TimedSession): boolean {
  assertValidSession(session)
  return session.pausedAtMs !== null
}

/** Freezes active elapsed time without changing the pending queue or outcomes. */
export function pauseTimedSession(session: TimedSession, nowMs: number): TimedSession {
  const statusByQuestionId = assertValidSession(session)
  assertFiniteClock(nowMs, 'nowMs')
  if (session.pendingQuestionIds.length === 0) fail('cannot pause a completed run')
  if (session.pausedAtMs !== null) fail('run is already paused')
  return freezeSession(session.questionIds, session.pendingQuestionIds, createStatusRecord(session.questionIds, statusByQuestionId), session.startedAtMs, null, nowMs, session.pausedDurationMs)
}

/** Resumes a manually paused run, accumulating exactly its just-finished pause interval. */
export function resumeTimedSession(session: TimedSession, nowMs: number): TimedSession {
  const statusByQuestionId = assertValidSession(session)
  assertFiniteClock(nowMs, 'nowMs')
  if (session.pausedAtMs === null) fail('run is not paused')
  const addedPause = Math.max(0, nowMs - session.pausedAtMs)
  return freezeSession(session.questionIds, session.pendingQuestionIds, createStatusRecord(session.questionIds, statusByQuestionId), session.startedAtMs, null, null, session.pausedDurationMs + addedPause)
}

/**
 * Applies one action to the current pending question. Correct and reveal remove
 * it; skip rotates it to the back while preserving its pending status.
 */
export function transitionTimedSession(
  session: TimedSession,
  action: TimedSessionAction,
  nowMs: number,
): TimedSession {
  const statusByQuestionId = assertValidSession(session)
  assertFiniteClock(nowMs, 'nowMs')
  if (!['correct', 'skip', 'reveal'].includes(action)) fail('action is invalid')
  if (session.pendingQuestionIds.length === 0) fail('cannot transition a completed run')
  if (session.pausedAtMs !== null) fail('cannot transition a paused run')

  const [currentQuestionId, ...remainingQuestionIds] = session.pendingQuestionIds
  if (action === 'skip') {
    return freezeSession(
      session.questionIds,
      [...remainingQuestionIds, currentQuestionId],
      createStatusRecord(session.questionIds, statusByQuestionId),
      session.startedAtMs,
      null,
      null,
      session.pausedDurationMs,
    )
  }

  const nextStatusByQuestionId = createStatusRecord(session.questionIds, statusByQuestionId)
  Object.defineProperty(nextStatusByQuestionId, currentQuestionId, {
    value: action === 'correct' ? 'correct' : 'revealed',
    enumerable: true,
    configurable: true,
    writable: true,
  })
  const completedAtMs = remainingQuestionIds.length === 0 ? nowMs : null
  return freezeSession(
    session.questionIds,
    remainingQuestionIds,
    nextStatusByQuestionId,
    session.startedAtMs,
    completedAtMs,
    null,
    session.pausedDurationMs,
  )
}

export function timedSessionOutcome(session: TimedSession): Readonly<{
  correctCount: number
  revealedCount: number
  pendingCount: number
  totalCount: number
}> {
  const statusByQuestionId = assertValidSession(session)
  let correctCount = 0
  let revealedCount = 0
  for (const questionId of session.questionIds) {
    if (statusByQuestionId[questionId] === 'correct') correctCount += 1
    if (statusByQuestionId[questionId] === 'revealed') revealedCount += 1
  }
  return Object.freeze({
    correctCount,
    revealedCount,
    pendingCount: session.pendingQuestionIds.length,
    totalCount: session.questionIds.length,
  })
}
