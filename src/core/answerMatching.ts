import type { AnswerResult, Capital } from './capital'

/**
 * Makes comparisons tolerant of typography while intentionally preserving word
 * boundaries. Non-Latin spellings are supported through explicit data aliases.
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Unrestricted Damerau-Levenshtein distance. Unlike optimal-string-alignment,
 * this supports multiple transpositions involving the same characters.
 */
export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length

  const maxDistance = a.length + b.length
  const matrix = Array.from({ length: a.length + 2 }, () => new Array<number>(b.length + 2).fill(0))
  matrix[0][0] = maxDistance
  for (let row = 0; row <= a.length; row += 1) {
    matrix[row + 1][0] = maxDistance
    matrix[row + 1][1] = row
  }
  for (let column = 0; column <= b.length; column += 1) {
    matrix[0][column + 1] = maxDistance
    matrix[1][column + 1] = column
  }

  const lastSeen = new Map<string, number>()
  for (let row = 1; row <= a.length; row += 1) {
    let lastMatchingColumn = 0
    for (let column = 1; column <= b.length; column += 1) {
      const matchingRow = lastSeen.get(b[column - 1]) ?? 0
      const previousMatchingColumn = lastMatchingColumn
      const cost = a[row - 1] === b[column - 1] ? 0 : 1
      matrix[row + 1][column + 1] = Math.min(
        matrix[row][column] + cost,
        matrix[row + 1][column] + 1,
        matrix[row][column + 1] + 1,
        matrix[matchingRow][previousMatchingColumn] + (row - matchingRow - 1) + 1 + (column - previousMatchingColumn - 1),
      )
      if (cost === 0) lastMatchingColumn = column
    }
    lastSeen.set(a[row - 1], row)
  }
  return matrix[a.length + 1][b.length + 1]
}

export function allowedDistance(answerLength: number): number {
  if (answerLength <= 3) return 0
  if (answerLength <= 8) return 1
  return 2
}

export function capitalNames(capital: Capital): string[] {
  return [capital.capital, ...(capital.aliases ?? [])].map(normalizeAnswer)
}

export function checkCapitalAnswer(
  submitted: string,
  target: Capital,
  allCapitals: readonly Capital[],
): AnswerResult {
  const normalized = normalizeAnswer(submitted)
  if (!normalized) return { status: 'incorrect' }

  const targetNames = capitalNames(target)
  if (targetNames.includes(normalized)) return { status: 'correct', matched: target.capital }

  // Do not turn a known answer for another question into an accidental typo.
  const knownOtherCapital = allCapitals.some(
    (capital) => capital.id !== target.id && capitalNames(capital).includes(normalized),
  )
  if (knownOtherCapital) return { status: 'incorrect' }

  const isCloseEnough = targetNames.some(
    (name) => damerauLevenshtein(normalized, name) <= allowedDistance(name.length),
  )
  return isCloseEnough ? { status: 'correct', matched: target.capital } : { status: 'incorrect' }
}
