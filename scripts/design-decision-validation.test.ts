import { cpSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { designDecisionValidationErrors } from './design-decision-validation'

const source = resolve(process.cwd(), 'docs/design-decisions')
const temporaryRoots: string[] = []

function fixture(): string {
  const parent = mkdtempSync(join(tmpdir(), 'geoquiz-design-decisions-'))
  const root = join(parent, 'design-decisions')
  cpSync(source, root, { recursive: true })
  temporaryRoots.push(parent)
  return root
}

function replace(root: string, file: string, from: string, to: string): void {
  const path = join(root, file)
  const current = readFileSync(path, 'utf8')
  expect(current).toContain(from)
  writeFileSync(path, current.replace(from, to))
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('design-decision validation', () => {
  it('accepts the checked-in decision system, including chained supersessions', () => {
    expect(designDecisionValidationErrors({ root: fixture() })).toEqual([])
  })

  it('rejects a supersession cycle without an accepted replacement', () => {
    const root = fixture()
    replace(root, 'DD-0019-overlay-quiz-menu.md', 'supersedes: DD-0001', 'supersedes: DD-0001, DD-0029')
    replace(root, 'DD-0029-crawlable-quiz-routes.md', 'status: accepted', 'status: superseded')
    replace(root, 'DD-0029-crawlable-quiz-routes.md', 'superseded_by: none', 'superseded_by: DD-0019')
    replace(root, 'README.md', '| [DD-0029](DD-0029-crawlable-quiz-routes.md) | Crawlable quiz routes preserve overlay navigation | accepted |', '| [DD-0029](DD-0029-crawlable-quiz-routes.md) | Crawlable quiz routes preserve overlay navigation | superseded |')
    expect(designDecisionValidationErrors({ root })).toContain('DD-0001-capital-dots-landing.md: supersession chain must terminate at an accepted replacement')
  })

  it('rejects malformed DD filenames and stale index rows', () => {
    const root = fixture()
    writeFileSync(join(root, 'DD-0004.md'), 'ignored content')
    replace(root, 'README.md', '| [DD-0003]', '| [DD-0099](DD-0099-missing.md) | Missing | accepted | nowhere |\n| [DD-0003]')
    const errors = designDecisionValidationErrors({ root })
    expect(errors).toContain('DD-0004.md: filename must match DD-NNNN-lowercase-slug.md')
    expect(errors).toContain('README.md: DD-0099 index row has no decision file')
  })

  it('requires exact index metadata parity', () => {
    const root = fixture()
    replace(root, 'README.md', '| [DD-0002](DD-0002-capital-map-viewport-composition.md) | Capital-map viewport composition | accepted | capital map, responsive layout, run setup |', '| [DD-0002](DD-0002-capital-map-viewport-composition.md) | Wrong title | rejected | unrelated |')
    const errors = designDecisionValidationErrors({ root })
    expect(errors).toContain('README.md: DD-0002 title does not match its record')
    expect(errors).toContain('README.md: DD-0002 status does not match its record')
    expect(errors).toContain('README.md: DD-0002 applies-to list does not match its record')
  })

  it('requires substantive sections and observable acceptance criteria', () => {
    const root = fixture()
    const file = 'DD-0001-capital-dots-landing.md'
    const text = readFileSync(join(root, file), 'utf8')
      .replace(/## Context\n[\s\S]*?\n## Decision/, '## Context\n\n## Decision')
      .replace(/## Acceptance criteria\n[\s\S]*?\n## Consequences/, '## Acceptance criteria\n\nNo list.\n\n## Consequences')
    writeFileSync(join(root, file), text)
    const errors = designDecisionValidationErrors({ root })
    expect(errors).toContain(`${file}: missing or empty ## Context`)
    expect(errors).toContain(`${file}: Acceptance criteria requires at least one observable list item`)
  })

  it('rejects impossible dates', () => {
    const root = fixture()
    replace(root, 'DD-0001-capital-dots-landing.md', 'date: 2026-08-21', 'date: 2026-02-31')
    expect(designDecisionValidationErrors({ root })).toContain('DD-0001-capital-dots-landing.md: date must be a real YYYY-MM-DD calendar date')
  })

  it('requires accepted reciprocal supersession links', () => {
    const root = fixture()
    replace(root, 'DD-0003-rendered-browser-design-review.md', 'supersedes: none', 'supersedes: DD-0002')
    const errors = designDecisionValidationErrors({ root })
    expect(errors).toContain('DD-0003-rendered-browser-design-review.md: superseded target DD-0002 must have status superseded')
    expect(errors).toContain('DD-0003-rendered-browser-design-review.md: supersession of DD-0002 is not linked back')
  })

  it('accepts a complete reciprocal supersession lifecycle', () => {
    const root = fixture()
    replace(root, 'DD-0003-rendered-browser-design-review.md', 'supersedes: none', 'supersedes: DD-0002')
    replace(root, 'DD-0002-capital-map-viewport-composition.md', 'status: accepted', 'status: superseded')
    replace(root, 'DD-0002-capital-map-viewport-composition.md', 'superseded_by: none', 'superseded_by: DD-0003')
    replace(root, 'README.md', '| [DD-0002](DD-0002-capital-map-viewport-composition.md) | Capital-map viewport composition | accepted |', '| [DD-0002](DD-0002-capital-map-viewport-composition.md) | Capital-map viewport composition | superseded |')
    expect(designDecisionValidationErrors({ root })).toEqual([])
  })

  it('accepts an auditable reciprocal replacement chain after the middle replacement is superseded', () => {
    const root = fixture()
    replace(root, 'DD-0003-rendered-browser-design-review.md', 'supersedes: none', 'supersedes: DD-0002')
    replace(root, 'DD-0003-rendered-browser-design-review.md', 'status: accepted', 'status: superseded')
    replace(root, 'DD-0003-rendered-browser-design-review.md', 'superseded_by: none', 'superseded_by: DD-0004')
    replace(root, 'DD-0002-capital-map-viewport-composition.md', 'status: accepted', 'status: superseded')
    replace(root, 'DD-0002-capital-map-viewport-composition.md', 'superseded_by: none', 'superseded_by: DD-0003')
    replace(root, 'DD-0004-practice-and-timed-session-behavior.md', 'supersedes: none', 'supersedes: DD-0003')
    replace(root, 'README.md', '| [DD-0002](DD-0002-capital-map-viewport-composition.md) | Capital-map viewport composition | accepted |', '| [DD-0002](DD-0002-capital-map-viewport-composition.md) | Capital-map viewport composition | superseded |')
    replace(root, 'README.md', '| [DD-0003](DD-0003-rendered-browser-design-review.md) | Rendered browser review is required for visual acceptance | accepted |', '| [DD-0003](DD-0003-rendered-browser-design-review.md) | Rendered browser review is required for visual acceptance | superseded |')
    expect(designDecisionValidationErrors({ root })).toEqual([])
  })

  it('still rejects a rejected record as a replacement in a reciprocal chain', () => {
    const root = fixture()
    replace(root, 'DD-0003-rendered-browser-design-review.md', 'supersedes: none', 'supersedes: DD-0002')
    replace(root, 'DD-0003-rendered-browser-design-review.md', 'status: accepted', 'status: rejected')
    replace(root, 'DD-0002-capital-map-viewport-composition.md', 'status: accepted', 'status: superseded')
    replace(root, 'DD-0002-capital-map-viewport-composition.md', 'superseded_by: none', 'superseded_by: DD-0003')
    replace(root, 'README.md', '| [DD-0002](DD-0002-capital-map-viewport-composition.md) | Capital-map viewport composition | accepted |', '| [DD-0002](DD-0002-capital-map-viewport-composition.md) | Capital-map viewport composition | superseded |')
    replace(root, 'README.md', '| [DD-0003](DD-0003-rendered-browser-design-review.md) | Rendered browser review is required for visual acceptance | accepted |', '| [DD-0003](DD-0003-rendered-browser-design-review.md) | Rendered browser review is required for visual acceptance | rejected |')
    const errors = designDecisionValidationErrors({ root })
    expect(errors).toContain('DD-0003-rendered-browser-design-review.md: only accepted replacement records may supersede another decision')
    expect(errors).toContain('DD-0002-capital-map-viewport-composition.md: replacement DD-0003 must be accepted or historically superseded')
  })

  it('rejects deleting or renaming a historical decision', () => {
    const root = fixture()
    const historicalFile = 'DD-0001-capital-dots-landing.md'
    unlinkSync(join(root, historicalFile))
    const index = readFileSync(join(root, 'README.md'), 'utf8').split('\n').filter((line) => !line.includes('[DD-0001]')).join('\n')
    writeFileSync(join(root, 'README.md'), index)
    expect(designDecisionValidationErrors({ root, historicalRecords: new Map([[historicalFile, readFileSync(join(source, historicalFile), 'utf8')]]) })).toContain(`${historicalFile}: historical design decision files cannot be deleted or renamed`)
  })

  it('protects historical identity and accepted outcomes from in-place reuse', () => {
    const root = fixture()
    const file = 'DD-0001-capital-dots-landing.md'
    const historical = readFileSync(join(root, file), 'utf8')
    replace(root, file, 'title: Capital dots is the landing experience', 'title: Reused decision identity')
    replace(root, file, '# DD-0001: Capital dots is the landing experience', '# DD-0001: Reused decision identity')
    replace(root, file, 'The root hash route `#/` opens', 'A replacement product direction opens')
    replace(root, 'README.md', 'Capital dots is the landing experience | superseded', 'Reused decision identity | superseded')
    const errors = designDecisionValidationErrors({ root, historicalRecords: new Map([[file, historical]]) })
    expect(errors).toContain(`${file}: historical title is immutable`)
    expect(errors).toContain(`${file}: historical Decision outcome is immutable`)
  })

  it('requires new IDs to exceed the historical maximum', () => {
    const root = fixture()
    const sourceFile = 'DD-0001-capital-dots-landing.md'
    const historicalRecords = new Map([
      ['DD-0001-capital-dots-landing.md', readFileSync(join(root, 'DD-0001-capital-dots-landing.md'), 'utf8')],
      ['DD-0002-capital-map-viewport-composition.md', readFileSync(join(root, 'DD-0002-capital-map-viewport-composition.md'), 'utf8')],
      ['DD-0003-rendered-browser-design-review.md', readFileSync(join(root, 'DD-0003-rendered-browser-design-review.md'), 'utf8')],
    ])
    const backfilled = readFileSync(join(root, sourceFile), 'utf8')
      .replaceAll('DD-0001', 'DD-0000')
      .replaceAll('Capital dots is the landing experience', 'Backfilled decision')
    writeFileSync(join(root, 'DD-0000-backfilled-decision.md'), backfilled)
    replace(root, 'README.md', '| [DD-0001]', '| [DD-0000](DD-0000-backfilled-decision.md) | Backfilled decision | accepted | app shell, routing, capital map |\n| [DD-0001]')
    expect(designDecisionValidationErrors({ root, historicalRecords })).toContain('DD-0000-backfilled-decision.md: new decision IDs must be greater than historical maximum DD-0003')
  })
})
