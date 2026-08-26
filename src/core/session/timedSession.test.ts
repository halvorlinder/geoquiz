import { describe, expect, it } from 'vitest'
import {
  currentQuestionId,
  elapsedTimedSessionMs,
  isTimedSessionComplete,
  isTimedSessionPaused,
  pauseTimedSession,
  resumeTimedSession,
  startTimedSession,
  timedSessionOutcome,
  transitionTimedSession,
} from './timedSession'

describe('timed session', () => {
  it('shuffles deterministically without mutating the supplied IDs', () => {
    const ids = ['one', 'two', 'three', 'four']
    const session = startTimedSession(ids, 100, () => 0)
    expect(session.questionIds).toEqual(['two', 'three', 'four', 'one'])
    expect(ids).toEqual(['one', 'two', 'three', 'four'])
    expect(Object.isFrozen(session)).toBe(true)
    expect(Object.isFrozen(session.questionIds)).toBe(true)
    expect(Object.isFrozen(session.statusByQuestionId)).toBe(true)
  })

  it('preserves prototype-colliding IDs as exact own status properties through transitions', () => {
    const ids = ['__proto__', 'constructor', 'toString']
    const started = startTimedSession(ids, 0, () => 0.99)
    expect(Object.getPrototypeOf(started.statusByQuestionId)).toBeNull()
    expect(Object.keys(started.statusByQuestionId)).toEqual(ids)
    for (const id of ids) {
      expect(Object.hasOwn(started.statusByQuestionId, id)).toBe(true)
      expect(started.statusByQuestionId[id]).toBe('pending')
    }

    const skipped = transitionTimedSession(started, 'skip', 1)
    const correct = transitionTimedSession(skipped, 'correct', 2)
    const revealed = transitionTimedSession(correct, 'reveal', 3)
    const completed = transitionTimedSession(revealed, 'correct', 4)
    expect(started.statusByQuestionId.__proto__).toBe('pending')
    expect(timedSessionOutcome(completed)).toEqual({
      correctCount: 2,
      revealedCount: 1,
      pendingCount: 0,
      totalCount: 3,
    })
    expect(Object.isFrozen(completed.statusByQuestionId)).toBe(true)
    expect(Object.keys(completed.statusByQuestionId)).toEqual(ids)
  })

  it('uses a descriptor snapshot when a forged status proxy throws on property reads', () => {
    const started = startTimedSession(['one'], 0, () => 0.5)
    const statusProxy = new Proxy(
      {},
      {
        getPrototypeOf() {
          return Object.prototype
        },
        ownKeys() {
          return ['one']
        },
        getOwnPropertyDescriptor(_target, key) {
          return key === 'one' ? { value: 'pending', enumerable: true, configurable: true } : undefined
        },
        get() {
          throw new Error('status getter must not escape')
        },
      },
    )
    const forged = { ...started, statusByQuestionId: statusProxy } as unknown as typeof started
    expect(() => currentQuestionId(forged)).not.toThrow()
    expect(() => isTimedSessionComplete(forged)).not.toThrow()
    expect(() => elapsedTimedSessionMs(forged, 1)).not.toThrow()
    expect(() => timedSessionOutcome(forged)).not.toThrow()
    expect(() => transitionTimedSession(forged, 'correct', 1)).not.toThrow()
    expect(transitionTimedSession(forged, 'correct', 1).statusByQuestionId.one).toBe('correct')
  })

  it('cycles skipped questions and leaves a sole skipped question current', () => {
    const session = startTimedSession(['one', 'two', 'three'], 10, () => 0.99)
    expect(currentQuestionId(session)).toBe('one')
    const skipped = transitionTimedSession(session, 'skip', 12)
    expect(skipped.pendingQuestionIds).toEqual(['two', 'three', 'one'])

    const twoDone = transitionTimedSession(skipped, 'correct', 15)
    const threeDone = transitionTimedSession(twoDone, 'reveal', 18)
    expect(threeDone.pendingQuestionIds).toEqual(['one'])
    const skippedOnly = transitionTimedSession(threeDone, 'skip', 20)
    expect(skippedOnly).not.toBe(threeDone)
    expect(skippedOnly.pendingQuestionIds).toEqual(['one'])
    expect(skippedOnly.statusByQuestionId.one).toBe('pending')
  })

  it('records mixed outcomes, completes only after the last pending question, and freezes time', () => {
    const started = startTimedSession(['one', 'two', 'three'], 100, () => 0.99)
    const afterCorrect = transitionTimedSession(started, 'correct', 120)
    const afterReveal = transitionTimedSession(afterCorrect, 'reveal', 140)
    expect(isTimedSessionComplete(afterReveal)).toBe(false)
    expect(timedSessionOutcome(afterReveal)).toEqual({
      correctCount: 1,
      revealedCount: 1,
      pendingCount: 1,
      totalCount: 3,
    })

    const completed = transitionTimedSession(afterReveal, 'correct', 160)
    expect(isTimedSessionComplete(completed)).toBe(true)
    expect(currentQuestionId(completed)).toBeNull()
    expect(completed.completedAtMs).toBe(160)
    expect(timedSessionOutcome(completed)).toEqual({
      correctCount: 2,
      revealedCount: 1,
      pendingCount: 0,
      totalCount: 3,
    })
    expect(elapsedTimedSessionMs(completed, 9_999)).toBe(60)
  })

  it('clamps clock regressions to zero without a ticking mechanism', () => {
    const session = startTimedSession(['one'], 100, () => 0.5)
    expect(elapsedTimedSessionMs(session, 50)).toBe(0)
    const completed = transitionTimedSession(session, 'correct', 50)
    expect(elapsedTimedSessionMs(completed, 1_000)).toBe(0)
  })

  it('freezes elapsed active time and accumulates repeated manual pauses exactly once', () => {
    const started = startTimedSession(['one', 'two'], 100, () => 0.99)
    const paused = pauseTimedSession(started, 140)
    expect(isTimedSessionPaused(paused)).toBe(true)
    expect(elapsedTimedSessionMs(paused, 9_999)).toBe(40)
    expect(() => transitionTimedSession(paused, 'skip', 150)).toThrow('paused')

    const resumed = resumeTimedSession(paused, 200)
    expect(isTimedSessionPaused(resumed)).toBe(false)
    expect(resumed.pausedDurationMs).toBe(60)
    expect(elapsedTimedSessionMs(resumed, 260)).toBe(100)
    const pausedAgain = pauseTimedSession(resumed, 300)
    const oneResolved = transitionTimedSession(resumeTimedSession(pausedAgain, 350), 'correct', 400)
    const completed = transitionTimedSession(oneResolved, 'correct', 410)
    expect(elapsedTimedSessionMs(completed, 9_999)).toBe(200)
  })

  it('rejects invalid IDs, RNG values, clocks, transitions, and corrupted states', () => {
    expect(() => startTimedSession([], 0)).toThrow('at least one question ID')
    expect(() => startTimedSession(['one', 'one'], 0)).toThrow('duplicate question ID')
    expect(() => startTimedSession([' '], 0)).toThrow('non-empty strings')
    expect(() => startTimedSession(['one'], Number.NaN)).toThrow('nowMs')
    expect(() => startTimedSession(['one', 'two'], 0, () => 1)).toThrow('[0, 1)')
    expect(() => startTimedSession(['one', 'two'], 0, () => Number.NaN)).toThrow('[0, 1)')

    const session = startTimedSession(['one'], 0, () => 0.5)
    expect(() => transitionTimedSession(session, 'wrong' as never, 1)).toThrow('action is invalid')
    expect(() => transitionTimedSession(session, 'correct', Number.POSITIVE_INFINITY)).toThrow('nowMs')
    const completed = transitionTimedSession(session, 'correct', 1)
    expect(() => transitionTimedSession(completed, 'skip', 2)).toThrow('completed run')
    expect(() => pauseTimedSession(completed, 2)).toThrow('completed run')
    expect(() => resumeTimedSession(session, 2)).toThrow('not paused')
    expect(() => pauseTimedSession(pauseTimedSession(session, 1), 2)).toThrow('already paused')

    const corrupted = {
      ...session,
      pendingQuestionIds: [],
    }
    expect(() => currentQuestionId(corrupted)).toThrow('pending question IDs must match')

    const arrayStatuses = {
      ...session,
      statusByQuestionId: ['pending'],
    }
    expect(() => currentQuestionId(arrayStatuses as never)).toThrow('question statuses must be a record')

    expect(() => currentQuestionId({ ...session, pausedAtMs: Number.NaN })).toThrow('pausedAtMs')
    expect(() => currentQuestionId({ ...session, pausedDurationMs: -1 })).toThrow('pausedDurationMs')
    expect(() => currentQuestionId({ ...session, pausedDurationMs: Number.POSITIVE_INFINITY })).toThrow('pausedDurationMs')
    expect(() => currentQuestionId({ ...completed, pausedAtMs: 2 })).toThrow('completed state cannot be paused')
  })
})
