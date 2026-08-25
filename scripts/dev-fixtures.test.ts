import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const fixtureSources = [
  ['src/quizzes/shape-neighbours/ShapeNeighboursQuiz.tsx', 'qa=china'],
  ['src/quizzes/shape-high-point/ShapeHighPointQuiz.tsx', 'qa=colombia'],
  ['src/quizzes/border-countries/BorderCountriesQuiz.tsx', 'esp-fra'],
  ['src/quizzes/border-countries/BorderCountriesQuiz.tsx', 'esp-mar'],
  ['src/quizzes/border-countries/BorderCountriesQuiz.tsx', 'can-usa'],
  ['src/quizzes/border-countries/BorderCountriesQuiz.tsx', 'arm-aze'],
  ['src/quizzes/border-countries/BorderCountriesQuiz.tsx', 'hard-multi'],
] as const

describe('DEV-only Chrome QA fixtures', () => {
  it('keeps each deterministic route target behind Vite DEV gating', () => {
    for (const [path, token] of fixtureSources) {
      const source = readFileSync(resolve(process.cwd(), path), 'utf8')
      expect(source, path).toContain('if (!import.meta.env.DEV) return')
      expect(source, path).toContain(token)
      expect(source, path).toContain('Direct Chrome-only QA fixture; production builds erase this branch.')
    }
    const routeSource = readFileSync(resolve(process.cwd(), 'src/appRoute.ts'), 'utf8')
    expect(routeSource).toContain("import.meta.env.DEV && hash === '#/shape-neighbours?qa=china'")
    expect(routeSource).toContain("import.meta.env.DEV && hash === '#/shape-high-point?qa=colombia'")
    for (const token of ['esp-fra','esp-mar','can-usa','arm-aze','hard-multi']) expect(routeSource).toContain(`#/border-countries?qa=${token}`)
  })
})
