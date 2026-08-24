import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/quizzes/shape-neighbours/shapeNeighboursMap.css'), 'utf8')

describe('Shape neighbours map layout policy', () => {
  it('keeps the map card intrinsic rather than inheriting the shared fixed flex panel', () => {
    expect(css).toMatch(/\.shape-neighbours-shell\.quiz-active-shell\s*>\s*\.shape-neighbours-card\s*\{[^}]*display:\s*grid;[^}]*align-self:\s*start;[^}]*height:\s*auto;/s)
    expect(css).toMatch(/\.shape-neighbours-shell\.quiz-active-shell\s*\{[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto;/s)
  })

  it('reserves separate desktop lanes for attribution and the map hint, then simplifies on mobile', () => {
    expect(css).toMatch(/\.neighbour-map-attribution\s*\{[^}]*max-width:\s*calc\(100%\s*-\s*240px\);/s)
    expect(css).toMatch(/@media\s*\(max-width:\s*620px\)[\s\S]*?\.neighbour-map-attribution\s*\{[^}]*max-width:\s*calc\(100%\s*-\s*20px\);/)
    expect(css).toMatch(/@media\s*\(max-width:\s*620px\)[\s\S]*?\.neighbour-map-hint\s*\{[^}]*display:\s*none;/)
  })
})
