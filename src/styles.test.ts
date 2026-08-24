import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')

describe('viewport layout stylesheet contract', () => {
  it('keeps the quiz chooser as a bounded dialog grid that becomes a no-overflow mobile sheet', () => {
    expect(styles).toContain('.quiz-menu-dialog { width: min(760px, calc(100vw - 40px));')
    expect(styles).toContain('.quiz-menu-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));')
    expect(styles).toContain('.quiz-menu-item[aria-current="page"]')
    expect(styles).toContain('.quiz-menu-dialog { inset: auto 0 0; width: 100%; max-height: 100dvh;')
    expect(styles).toContain('.quiz-menu-list { grid-template-columns: 1fr; }')
    expect(styles).toContain('inset: auto 0 0')
  })

  it('scopes the calm two-column study layout and mobile scrolling to the four non-map study quizzes', () => {
    expect(styles).toContain('@media (min-width: 900px)')
    expect(styles).toContain('.study-quiz-frame > .quiz-active-shell { display: grid; grid-template-columns: minmax(260px, .62fr) minmax(500px, 1.38fr);')
    expect(260 + 500 + 28).toBeLessThanOrEqual(900 - 32)
    expect(styles).toContain('.study-quiz-frame { overflow-y: auto; }')
    expect(styles).toContain('.study-quiz-frame:has(dialog[open]) { overflow: hidden; }')
    expect(styles).toContain('.study-quiz-frame .shape-capital-visual { flex: 0 0 clamp(150px, 43vw, 220px);')
  })

  it('keeps flag media intrinsically sized from its cap, padding, and borders without inheriting silhouette rules', () => {
    const flagRule = styles.match(/\.flag-country-image\s*\{([^}]*)\}/)?.[1]
    expect(flagRule).toContain('max-height: 220px')
    const imageCap = Number(flagRule?.match(/max-height:\s*(\d+)px/)?.[1])
    expect(imageCap).toBe(220)

    const imageCapOverrides = styles.slice(styles.indexOf('.flag-country-image {') + '.flag-country-image {'.length)
      .match(/\.flag-country-image\s*\{[^}]*max-height:/g) ?? []
    expect(imageCapOverrides).toHaveLength(0)
    expect(styles).toContain('.shape-capital-silhouette { max-height: 100%; }')
    expect(styles).not.toMatch(/\.shape-capital-silhouette\s*,\s*\.flag-country-image\s*\{[^}]*max-height:/)

    const tabletStart = styles.indexOf('@media (min-width: 781px) and (max-width: 899px)')
    const tabletStyles = styles.slice(tabletStart, styles.indexOf('\n}\n\n.masthead', tabletStart))
    const mobileStart = styles.indexOf('@media (max-width: 780px)')
    const mobileStyles = styles.slice(mobileStart, styles.indexOf('\n}\n\n@media (max-width: 430px)', mobileStart))
    const tabletFlagRule = tabletStyles.match(/\.study-quiz-frame \.flag-country-visual\s*\{([^}]*)\}/)?.[1]
    const mobileFlagRule = mobileStyles.match(/\.study-quiz-frame \.flag-country-visual\s*\{([^}]*)\}/)?.[1]
    const border = 1
    const tabletPadding = 12
    const mobilePadding = 14

    expect(tabletFlagRule).toContain('flex: 0 0 auto')
    expect(tabletFlagRule).toContain(`min-block-size: calc(${imageCap}px + ${2 * tabletPadding}px + ${2 * border}px)`)
    expect(mobileFlagRule).toContain('flex: 0 0 auto')
    expect(mobileFlagRule).toContain(`min-block-size: calc(${imageCap}px + ${2 * mobilePadding}px + ${2 * border}px)`)
    expect(imageCap + 2 * tabletPadding + 2 * border).toBe(246)
    expect(imageCap + 2 * mobilePadding + 2 * border).toBe(250)
    expect(tabletStyles).toContain('.study-quiz-frame .shape-capital-visual { flex: 0 0 clamp(180px, 30vw, 240px); min-height: 180px; max-height: none; }')
    expect(mobileStyles).toContain('.study-quiz-frame .shape-capital-visual { flex: 0 0 clamp(150px, 43vw, 220px); min-height: 150px; max-height: none; padding: 14px; }')
    expect(tabletStyles).not.toMatch(/\.shape-capital-visual\s*,\s*\.study-quiz-frame \.flag-country-visual/)
    expect(mobileStyles).not.toMatch(/\.shape-capital-visual\s*,\s*\.study-quiz-frame \.flag-country-visual/)
  })

  it('uses dynamic viewport grid sizing and safe-area-aware intrinsic layout safeguards', () => {
    expect(styles).toContain('height: 100dvh')
    expect(styles).toContain('grid-template-rows: auto minmax(0, 1fr)')
    expect(styles).toContain('grid-template-rows: auto auto minmax(0, 1fr)')
    expect(styles).toContain('env(safe-area-inset-top)')
    expect(styles).not.toContain('min-height: 100vh')
    expect(styles).not.toMatch(/\.quiz-active-shell\s*\{[^}]*overflow:\s*hidden/)
    expect(styles).not.toMatch(/\.completion-shell\s*\{[^}]*overflow:\s*hidden/)
  })

  it('keeps required dense state content in compact grids rather than nested scroll regions', () => {
    expect(styles).toContain('grid-template-columns: repeat(auto-fit, minmax(130px, 1fr))')
    expect(styles).toContain('.country-capital-reveal-list div')
    expect(styles).not.toMatch(/\.country-capital-card\s*\{[^}]*overflow:/)
  })

  it('uses a dedicated multi-field layout and keeps narrow setup controls paired in two columns', () => {
    expect(styles).toContain('.setup-card { grid-template-columns: minmax(0, .72fr) minmax(0, 1.28fr); }')
    expect(styles).toContain('.setup-card > label, .setup-card > select { grid-column: auto; }')
    expect(styles).toContain('.multi-field-card .country-capital-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }')
    expect(styles).toContain('.multi-field-card .country-capital-field:last-child:nth-child(odd) { grid-column: 1 / -1; }')
    expect(styles).toContain('.multi-field-card .country-capital-field input { min-width: 0; margin-bottom: 2px; padding: 7px 5px; font-size: 1rem; }')
    expect(styles).toContain('.multi-field-card .shape-capital-visual { flex: 0 0 76px;')
  })

  it('gives the Capital dots command band a readable desktop composition and an 85dvh quiz area', () => {
    expect(styles).toContain('@media (min-width: 1200px)')
    expect(styles).toContain('.capital-map-frame { grid-template-rows: 30px minmax(0, 1fr); }')
    expect(styles).toContain('grid-template-rows: minmax(0px, max(0px, calc(15dvh - 30px - env(safe-area-inset-top) - env(safe-area-inset-bottom)))) minmax(85dvh, 1fr)')
    expect(styles).toContain('.capital-map-command-bar { grid-template-columns: minmax(300px, .32fr) minmax(0, .68fr); grid-row: 1; border-radius: 0; }')
    expect(styles).toContain('.capital-map-command-bar .capital-map-setup { grid-template-columns: minmax(135px, 1.1fr) minmax(135px, 1.1fr) minmax(150px, 1.25fr) max-content;')
    expect(styles).toContain('.capital-map-shell .quiz-layout { grid-row: 2; min-height: 85dvh; height: 100%; padding-inline: 16px; }')
    expect(styles).toContain('@media (min-width: 781px) and (max-width: 1199px)')
    expect(styles).toContain('.capital-map-command-bar { grid-template-columns: minmax(230px, .7fr) minmax(0, 1.3fr); }')
  })

  it('keeps the Capital dots mobile command band in a route-scoped two-by-two control grid', () => {
    expect(styles).toContain('@media (max-width: 780px)')
    expect(styles).toContain('.capital-map-command-bar .capital-map-setup { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-areas: "mode question-set" "summary action";')
    expect(styles).toContain('.capital-map-command-bar .masthead { display: flex; align-items: center; }')
    expect(styles).toContain('.capital-map-shell .quiz-layout { grid-template-rows: minmax(220px, 1fr) auto; }')
    expect(styles).toContain('.capital-map-setup select { min-height: 36px; padding: 6px 8px; font-size: .88rem; }')
  })

  it('keeps completion setup in its own two-by-two grid instead of inheriting active-band minimum columns', () => {
    expect(styles).toContain('.completion-shell .capital-map-setup { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-areas: "mode question-set" "summary action";')
    expect(styles).toContain('.completion-shell .capital-map-setup .capital-map-mode-group { grid-area: mode; }')
    expect(styles).toContain('.completion-shell .capital-map-setup .capital-map-question-set-group { grid-area: question-set; }')
    expect(styles).toContain('.completion-shell .capital-map-setup .capital-map-setup-summary { grid-area: summary; align-self: center; }')
    expect(styles).toContain('.completion-shell .capital-map-setup .capital-map-setup-action { grid-area: action; min-width: 0; align-self: stretch; }')
    expect(styles).toContain('.completion-shell .capital-map-setup .secondary-button { width: 100%; white-space: normal; }')
    expect(styles).not.toContain('.capital-map-shell .capital-map-setup { grid-template-columns: minmax(135px, 1.1fr)')
  })

  it('keeps the readable Capital dots recap desktop-only without introducing a scroll region', () => {
    const desktopStart = styles.indexOf('@media (min-width: 1200px)')
    const desktopStyles = styles.slice(desktopStart, styles.indexOf('@media (min-width: 781px)', desktopStart))
    expect(desktopStyles).toContain('.capital-map-shell .quiz-layout.quiz-layout-with-recap { grid-template-columns: minmax(0, 1fr) minmax(440px, 34%); }')
    expect(desktopStyles).toContain('.practice-previous-answer-fact { display: grid; grid-template-columns: 110px minmax(0, 1fr);')
    expect(desktopStyles).toContain('.practice-previous-answer-country { display: flex; align-items: center; gap: 9px;')
    expect(desktopStyles).toContain('.practice-previous-answer-details dl div { display: flex; flex-wrap: wrap; align-items: baseline;')
    expect(desktopStyles).not.toContain('overflow-wrap: anywhere')
    expect(styles.slice(styles.indexOf('@media (min-width: 781px) and (max-width: 1199px)'))).not.toContain('.practice-previous-answer-')
    expect(styles).not.toMatch(/\.practice-previous-answer-recap\s*\{[^}]*overflow:/)
  })

  it('keeps visible shape-attribution credits quiet and wrapping in every silhouette surface', () => {
    expect(styles).toContain('.country-shape-attribution { min-width: 0;')
    expect(styles).toContain('overflow-wrap: anywhere')
    expect(styles).toContain('.practice-previous-answer-details .country-shape-attribution')
  })
})
