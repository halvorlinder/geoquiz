import { describe, expect, it } from 'vitest'
import { borderQuestions } from './borderCountries'
import { BORDER_CONTEXT_MAP_WIDTHS, borderContextFitZoom, borderContextScreenSpan, selectedBorderFocus } from './borderContextViewport'

describe('selectedBorderFocus', () => {
  it('contains every exact run in a finite line-first frame for all Easy orientations', () => {
    for (const random of [() => 0, () => .99]) for (const question of borderQuestions('easy', 'All', random)) {
      const focus=selectedBorderFocus(question.path), [south,west,north,east]=focus.bounds
      expect(focus.minimumScreenSpan).toBeGreaterThanOrEqual(96)
      expect([south,west,north,east].every(Number.isFinite)).toBe(true)
      expect(question.path.every(([longitude,latitude])=>longitude>=west&&longitude<=east&&latitude>=south&&latitude<=north)).toBe(true)
      for (const width of BORDER_CONTEXT_MAP_WIDTHS) {
        expect(Number.isInteger(borderContextFitZoom(focus, width))).toBe(true)
        expect(borderContextScreenSpan(question.path, focus, width)).toBeGreaterThanOrEqual(96)
      }
    }
  })
  it('locks representative large, microstate and extreme selected-run frames', () => {
    for (const pair of ['PRK,RUS','KAZ,RUS','BWA,ZMB','ITA,VAT','CHE,LIE','FRA,MCO','ESP,MAR']) {
      const question=borderQuestions('easy','All',()=>0).find(value=>value.codes.join(',')===pair)!
      expect(selectedBorderFocus(question.path).maxZoom).toBe(18)
    }
  })
})
