/**
 * Timed results are comparable only when they use the same active-time rules.
 * Keep this discriminator shared so every timed board migrates together.
 */
export const TIMED_SCORE_TIMING_RULES_VERSION = 'active-elapsed-manual-pause-1'

export function timedScoreDataVersion(quizDataVersion: string): string {
  if (typeof quizDataVersion !== 'string' || quizDataVersion.trim() !== quizDataVersion || !quizDataVersion) {
    throw new TypeError('Timed score data version must be a nonblank trimmed string')
  }
  return `${quizDataVersion}--${TIMED_SCORE_TIMING_RULES_VERSION}`
}
