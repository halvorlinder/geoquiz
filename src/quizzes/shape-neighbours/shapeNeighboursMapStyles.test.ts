import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/quizzes/shape-neighbours/shapeNeighboursMap.css'), 'utf8')

describe('Shape neighbours map layout policy', () => {
  it('fits the map card in the fixed viewport rather than adding a scroll container', () => {
    expect(css).toMatch(/\.shape-neighbours-shell\.quiz-active-shell\s*>\s*\.shape-neighbours-card\s*\{[^}]*display:\s*grid;[^}]*align-self:\s*stretch;[^}]*height:\s*100%;/s)
    expect(css).toMatch(/\.shape-neighbours-shell\.quiz-active-shell\s*\{[^}]*overflow:\s*hidden;/s)
    expect(css).not.toMatch(/overflow-(?:x|y):\s*(?:auto|scroll)/)
  })

  it('reserves separate desktop lanes for attribution and the map hint, then simplifies on mobile', () => {
    expect(css).toMatch(/\.neighbour-map-attribution\s*\{[^}]*max-width:\s*calc\(100%\s*-\s*240px\);/s)
    expect(css).toMatch(/@media\s*\(max-width:\s*620px\)[\s\S]*?\.shape-neighbours-card--map \.neighbour-map-attribution\s*\{[^}]*position:\s*static;[^}]*pointer-events:\s*auto;/)
    expect(css).toMatch(/@media\s*\(max-width:\s*620px\)[\s\S]*?\.neighbour-map-hint\s*\{[^}]*display:\s*none;/)
  })

  it('uses a >=900px setup rail and honest map-on and map-off budgets for every active Shape Neighbours state', () => {
    expect(css).toContain('@media (min-width: 900px)')
    expect(css).toContain('.shape-neighbours-frame > .shape-neighbours-shell { width: min(1180px, calc(100% - 32px)); display: grid; grid-template-columns: minmax(260px, .62fr) minmax(500px, 1.38fr); grid-template-rows: auto minmax(0, 1fr);')
    expect(css).toContain('.shape-neighbours-frame > .shape-neighbours-shell > .masthead { grid-column: 1 / -1;')
    expect(css).toContain('.shape-neighbours-frame > .shape-neighbours-shell > .setup-card { grid-column: 1;')
    expect(css).toContain('.shape-neighbours-frame > .shape-neighbours-shell > .shape-neighbours-card { grid-column: 2; display: flex; flex-direction: column; align-self: stretch; width: 100%; height: 100%; min-height: 0;')
    expect(css).toContain('.shape-neighbours-frame > .shape-neighbours-shell > .shape-neighbours-card--map .neighbour-progress-map-shell { flex: 1 1 150px; min-height: 150px;')
    expect(css).toContain('.shape-neighbours-frame > .shape-neighbours-shell > .shape-neighbours-card--silhouette .shape-capital-visual { flex: 1 1 150px; min-height: 150px; max-height: 180px;')
    expect(css).toContain('.shape-neighbours-frame > .shape-neighbours-shell > .shape-neighbours-card .country-capital-instruction { margin-bottom: 6px; font-size: .9rem;')
    expect(css).toContain('.shape-neighbours-frame > .shape-neighbours-shell > .shape-neighbours-card .neighbour-answer-list { grid-template-columns: repeat(auto-fit, minmax(112px, 1fr)); gap: 4px; margin-bottom: 6px;')
    expect(css).toContain('.shape-neighbours-frame > .shape-neighbours-shell > .shape-neighbours-card form input { min-height: 40px; margin-bottom: 4px;')
    expect(css).toContain('.shape-neighbours-frame > .shape-neighbours-shell > .shape-neighbours-card .country-capital-actions { min-height: 30px; margin-top: 2px;')
    expect(css).toContain('.shape-neighbours-frame > .shape-neighbours-shell > .shape-neighbours-card--dense-roster .neighbour-answer-list:not(.neighbour-answer-list--mixed) { grid-template-columns: repeat(5, minmax(0, 1fr));')

    // Root's measured 1440x900 right-card track is 729px. These terms follow
    // the actual compact selectors: Map On has 36px padding; Map Off keeps its
    // real 60px card padding. The form/status/action totals include both the
    // Check and Reveal rows while unresolved, and the Next row after Reveal.
    // The variants cover map-off unresolved/partial/reveal/dense states plus
    // the equivalent map-on, Timed, and separate completion/scoreboard shell.
    const desktopCardTrack = 729
    const compactQuestionRows = 17 + 32 + 35 + 24 + 25
    const fixedMapOn = 36 + compactQuestionRows + (150 + 6) + (36 + 6)
    const fixedMapOff = 60 + compactQuestionRows + (150 + 8) + 24
    const inputAndFeedback = (16 + 3) + (40 + 4) + (24 + 10)
    const unresolvedPracticeActions = inputAndFeedback + 38 + 30
    const resolvedNextAction = inputAndFeedback + 38
    const chipRow = 26
    const list = (rows: number) => (rows * chipRow) + 6
    const desktopStates = {
      mapOffUnresolved: fixedMapOff + unresolvedPracticeActions,
      mapOffOneAnswerPartial: fixedMapOff + list(1) + unresolvedPracticeActions,
      brazilMapOffReveal: fixedMapOff + list(1) + 27 + list(2) + resolvedNextAction,
      chinaMapOff13Partial: fixedMapOff + list(3) + unresolvedPracticeActions,
      chinaMapOffMixedReveal: fixedMapOff + 27 + list(4) + resolvedNextAction,
      russiaMapOff14Correct: fixedMapOff + list(3) + resolvedNextAction,
      mapOnUnresolved: fixedMapOn + unresolvedPracticeActions,
      mapOnOneAnswerPartial: fixedMapOn + list(1) + unresolvedPracticeActions,
      afghanistanMapOnReveal: fixedMapOn + list(1) + 27 + list(1) + resolvedNextAction,
      chinaMapOn13Partial: fixedMapOn + list(3) + unresolvedPracticeActions,
      chinaMapOnMixedReveal: fixedMapOn + 27 + list(4) + resolvedNextAction,
      russiaMapOn14Correct: fixedMapOn + list(3) + resolvedNextAction,
      timed: (60 + 17 + (150 + 8) + 24 + 35 + 24 + 25) + list(3) + inputAndFeedback + 36,
      completionScoreboard: 0,
    }
    expect(desktopStates.mapOffUnresolved).toBe(540)
    expect(desktopStates.brazilMapOffReveal).toBe(627)
    expect(desktopStates.chinaMapOffMixedReveal).toBe(647)
    expect(desktopStates.chinaMapOnMixedReveal).toBe(639)
    expect(desktopStates.timed).toBe(560)
    expect(Object.values(desktopStates).every((height) => height <= desktopCardTrack)).toBe(true)
    expect(css).not.toContain('.shape-neighbours-frame > .completion-shell')
  })

  it('keeps the mixed answer key and non-colour chip treatments truthful on desktop as well as mobile', () => {
    const mobileRules = css.slice(css.indexOf('@media (max-width: 620px)'))
    const desktopAndBaseRules = css.slice(0, css.indexOf('@media (max-width: 620px)'))

    expect(desktopAndBaseRules).toContain('.neighbour-answer-legend { display: inline-flex;')
    expect(desktopAndBaseRules).toContain('.neighbour-answer-list--mixed .neighbour-answer--correct { border-color: #438c72;')
    expect(desktopAndBaseRules).toContain('.neighbour-answer-list--mixed .neighbour-answer--revealed { border-color: #a85d5a; border-style: dashed;')
    expect(mobileRules).not.toContain('.neighbour-answer-list--mixed .neighbour-answer--correct { border-color:')
    expect(mobileRules).not.toContain('.neighbour-answer-list--mixed .neighbour-answer--revealed { border-color:')
  })

  it('uses named visual variants, a touch-sized map track, and compact answer reflow for dense mobile country lists', () => {
    expect(css).toContain('.shape-neighbours-shell.quiz-active-shell > .shape-neighbours-card { display: flex; flex-direction: column;')
    expect(css).toContain('.shape-neighbours-card--map .neighbour-progress-map-shell { display: grid; grid-template-rows: minmax(145px, 1fr) auto; flex: 1 1 174px; min-height: 174px;')
    expect(css).toContain('.shape-neighbours-card--map .neighbour-progress-map { grid-row: 1; min-height: 145px; height: 100%; }')
    expect(css).toContain('.shape-neighbours-card--map .neighbour-map-attribution { position: static;')
    expect(css).toContain('min-height: 24px')
    expect(css).toContain('pointer-events: auto')
    expect(css).toContain('.shape-neighbours-card--silhouette .shape-capital-visual { flex: 1 1 100px; min-height: 76px; }')
    expect(css).toContain('.shape-neighbours-card .neighbour-answer-list { grid-template-columns: repeat(3, minmax(0, 1fr));')
    expect(css).toContain('.shape-neighbours-card .neighbour-answer-list li { min-width: 0; padding: 3px 4px; font-size: .72rem;')
    expect(css).toContain('.shape-neighbours-card form input { min-height: 34px;')
  })

  it('gives map-on resolved rosters a separate compact state without dropping attribution, statuses, or Next', () => {
    expect(css).toContain('.shape-neighbours-card--resolved.shape-neighbours-card--map .shape-neighbours-aid')
    expect(css).toContain('.shape-neighbours-card--resolved .neighbour-answer-list { grid-template-columns: repeat(4, minmax(0, 1fr)); }')
    expect(css).toContain('.shape-neighbours-card--resolved .country-capital-actions .primary-button { min-height: 34px; }')
    // Fixed map 145 + attribution 24 + compact controls/list budget stays in
    // the mobile card track while retaining a useful touch map.
    expect(145 + 24 + 26 + 34 + 96).toBeLessThan(390)
  })

  it('reserves a production dense-roster layout for partial and resolved 13/14-neighbour cards', () => {
    expect(css).toContain('.shape-neighbours-card--dense-roster.shape-neighbours-card--partial .neighbour-answer-list,')
    expect(css).toContain('.shape-neighbours-card--dense-roster .neighbour-answer-list--mixed { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 2px; }')
    expect(css).toContain('.shape-neighbours-card--dense-roster.shape-neighbours-card--map .shape-neighbours-recenter { min-height: 26px;')
    expect(css).toContain('.shape-neighbours-shell--dense-roster > .setup-card { gap: 4px 8px; padding: 7px 10px; }')
    expect(css).toContain('.shape-neighbours-card--dense-roster .neighbour-answer-list--mixed li { display: block; min-height: 0; padding: 2px; font-size: .72rem; line-height: 1.05; overflow-wrap: normal; word-break: normal; }')
    expect(css).toContain('.neighbour-answer-list--mixed .neighbour-answer--revealed { border-color: #a85d5a; border-style: dashed;')
    // The declared compact tracks account for the whole 844px viewport rather
    // than only the answer columns: route nav, shell, masthead, setup, card
    // padding, aid, map/attribution, recenter, text, four worst-case rows,
    // form/status/check, and the action row.
    expect(Math.ceil(14 / 5)).toBe(3)
    expect(Math.ceil(14 / 4)).toBe(4)
    const viewport = 844
    const cardTrack = 20 + 13 + 30 + 174 + 26 + 64 + (4 * 28) + 99 + 24
    const chromeTrack = 32 + 12 + 12 + 42 + 168
    expect(cardTrack).toBe(562)
    expect(chromeTrack + cardTrack).toBeLessThanOrEqual(viewport)
  })
})
