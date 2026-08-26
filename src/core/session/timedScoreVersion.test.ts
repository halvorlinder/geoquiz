import { describe, expect, it } from 'vitest'
import { TIMED_SCORE_TIMING_RULES_VERSION, timedScoreDataVersion } from './timedScoreVersion'

describe('timed score timing rules version', () => {
  it('adds the one shared timing discriminator without changing quiz data versions', () => {
    expect(timedScoreDataVersion('capital-map-v1')).toBe(`capital-map-v1--${TIMED_SCORE_TIMING_RULES_VERSION}`)
  })

  it('rejects blank, padded, and non-string data versions', () => {
    expect(() => timedScoreDataVersion('')).toThrow('nonblank trimmed')
    expect(() => timedScoreDataVersion(' version ')).toThrow('nonblank trimmed')
    expect(() => timedScoreDataVersion(null as never)).toThrow('nonblank trimmed')
  })
})
