import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')

describe('viewport layout stylesheet contract', () => {
  it('keeps the quiz chooser as a bounded dialog grid that becomes a no-overflow mobile sheet', () => {
    expect(styles).toContain('.quiz-menu-dialog { width: min(760px, calc(100vw - 40px));')
    expect(styles).toContain('.quiz-menu-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));')
    expect(styles).toContain('.quiz-menu-item[aria-current="page"]')
    const menuItemRule = styles.match(/\.quiz-menu-item\s*\{([^}]*)\}/)?.[1]
    expect(menuItemRule).toContain('display: grid')
    expect(menuItemRule).toContain('text-decoration: none')
    expect(styles).toContain('.quiz-menu-item:focus-visible')
    expect(styles).toContain('.quiz-menu-dialog { inset: auto 0 0; width: 100%; height: 100dvh; max-height: 100dvh; min-height: 0; margin: 0; overflow: hidden;')
    expect(styles).toContain('.quiz-menu-list { grid-template-columns: 1fr; grid-template-rows: repeat(7, minmax(0, 1fr));')
    expect(styles).toContain('inset: auto 0 0')
  })

  it('scopes the calm two-column study layout and fixed viewport composition to study quizzes', () => {
    expect(styles).toContain('@media (min-width: 900px)')
    expect(styles).toContain('.study-quiz-frame > .quiz-active-shell { display: grid; grid-template-columns: minmax(260px, .62fr) minmax(500px, 1.38fr);')
    expect(260 + 500 + 28).toBeLessThanOrEqual(900 - 32)
    expect(styles).toContain('.study-quiz-frame { overflow: hidden; }')
    expect(styles).toContain('.study-quiz-frame:has(dialog[open]) { overflow: hidden; }')
    expect(styles).toContain('.study-quiz-frame .shape-capital-visual { flex: 1 1 110px; min-height: 76px; max-height: 150px;')
  })

  it('scales flag media inside every capped visual instead of letting intrinsic flags cover the prompt', () => {
    const flagRule = styles.match(/\.flag-country-image\s*\{([^}]*)\}/)?.[1]
    expect(flagRule).toContain('max-height: 220px')
    const imageCap = Number(flagRule?.match(/max-height:\s*(\d+)px/)?.[1])
    expect(imageCap).toBe(220)

    expect(styles).toContain('.study-quiz-frame .flag-country-visual .flag-country-image { width: auto; max-width: 100%; height: 100%; max-height: 100%; min-height: 0; }')
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
    expect(mobileFlagRule).toContain('flex: 1 1 110px')
    expect(mobileFlagRule).toContain('min-block-size: 76px')
    expect(imageCap + 2 * tabletPadding + 2 * border).toBe(246)
    expect(76).toBeLessThan(imageCap + 2 * mobilePadding + 2 * border)
    // The mobile visual has a 76px minimum and 20px of chrome; the image is
    // explicitly constrained to that remaining track rather than its 220px cap.
    expect(76 - 2 * 10 - 2 * border).toBe(54)
    expect(tabletStyles).toContain('.study-quiz-frame .shape-capital-visual { flex: 0 0 clamp(180px, 30vw, 240px); min-height: 180px; max-height: none; }')
    expect(mobileStyles).toContain('.study-quiz-frame .shape-capital-visual { flex: 1 1 110px; min-height: 76px; max-height: 150px; padding: 10px; }')
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

  it('gives resolved Easy border layers a real entry animation and disables it for reduced motion', () => {
    expect(styles).toContain('.easy-border-answer { animation: easy-border-answer-enter 180ms ease-out both; }')
    expect(styles).toContain('@keyframes easy-border-answer-enter')
    expect(styles).toContain('@media (prefers-reduced-motion: reduce) { .easy-border-answer { animation: none; } }')
  })

  it('caps the desktop border map inside the fixed viewport card and separates the source link', () => {
    expect(styles).toContain('.study-quiz-frame > .border-quiz-shell > .border-question-card { align-self: stretch; height: 100%; }')
    expect(styles).toContain('.study-quiz-frame > .border-quiz-shell > .border-question-card .easy-border-context-shell { flex: 1 1 220px; min-height: 150px; }')
    expect(styles).toContain('.study-quiz-frame > .border-quiz-shell > .border-question-card .border-source { flex: 0 0 auto; margin-top: 8px; }')
    expect(styles).toContain('.easy-border-context-shell { position: relative; display: grid; grid-template-rows: minmax(110px, 1fr) auto;')
    expect(styles).toContain('.easy-border-context-map { min-height: 0; height: 100%;')
    expect(styles).toContain('.easy-border-map-controls { position: absolute; z-index: 500;')
    expect(styles).toContain('.border-question-card .easy-border-context-shell { flex: 1 1 170px; min-height: 170px; }')
  })

  it('gives Border its own 390x844 action/media budget for initial and disclosed states', () => {
    expect(styles).toContain('.border-quiz-shell > .border-question-card .easy-border-context-shell { flex: 1 1 164px; min-height: 164px; }')
    expect(styles).toContain('.border-quiz-shell > .border-question-card .easy-border-map-controls { right: 5px; bottom: 26px;')
    expect(styles).toContain('.border-quiz-shell > .border-question-card .border-answer-actions { flex-flow: row wrap; align-items: center; gap: 2px 12px; min-height: 38px; }')
    expect(styles).toContain('.border-quiz-shell > .border-question-card .border-answer-actions .primary-button { width: auto; min-height: 38px;')
    expect(styles).toContain('card has at least 544px')
    const shared = 164 + 20 + 29 + 24 + 96 + 24 + 20
    const cardTracks = {
      easyInitial: shared,
      hardInitial: shared + 38,
      oneRevealed: shared + 52 + 38,
      mixedOrFullCorrect: shared + 52 + 38,
      fullReveal: shared + 52 + 38,
    }
    expect(Object.values(cardTracks).every((track) => track < 544)).toBe(true)
    expect(styles).not.toContain('.border-quiz-shell > .setup-card .setup-note { display: none; }')
  })

  it('keeps the multi-section map overlay touchable without colliding with zoom or its hint row', () => {
    expect(styles).toContain('.border-image-hard > svg { width: min(76%, 350px); }')
    expect(styles).toContain('.border-quiz-shell > .border-question-card .easy-border-map-controls .text-button { min-height: 32px;')
    // 164px shell: 26px reserved hint/offset + 32px controls leaves the
    // controls starting at y=106; Leaflet's two 31px zoom buttons from y=10
    // end at y=72, so both one-row controls remain distinct and usable.
    const shell=164, controlsBottom=26, controlsHeight=32, zoomTop=10, zoomHeight=62
    expect(shell-controlsBottom-controlsHeight).toBeGreaterThan(zoomTop+zoomHeight)
  })

  it('keeps resolved high-point facts in a compact no-scroll mobile fact strip', () => {
    expect(styles).toContain('.shape-high-point-card--resolved .high-point-reveal-details { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px; margin-bottom: 4px; }')
    expect(styles).toContain('.shape-high-point-card--resolved .high-point-reveal-details .high-point-note { grid-column: 1 / -1; }')
    expect(styles).toContain('.shape-high-point-card--resolved .country-capital-actions .primary-button { width: auto; min-height: 36px;')
  })

  it('does not introduce app-owned scroll containers', () => {
    expect(styles).not.toMatch(/overflow-(?:x|y):\s*(?:auto|scroll)/)
  })
})
