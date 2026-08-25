import { describe, expect, it } from 'vitest'
import { borderQuestions } from './borderCountries'
import { BORDER_CONTEXT_MAP_WIDTHS, allBorderRunsFocus, borderContextFitZoom, borderContextScreenSpan, selectedBorderFocus } from './borderContextViewport'

describe('selectedBorderFocus', () => {
  it('contains every exact run in a finite line-first frame for all Easy orientations', () => {
    for (const random of [() => 0, () => .99]) for (const question of borderQuestions('easy', 'All', random)) {
      for(const run of question.runs) {
        const focus=selectedBorderFocus(run), [south,west,north,east]=focus.bounds
        expect(focus.minimumScreenSpan).toBeGreaterThanOrEqual(96)
        expect([south,west,north,east].every(Number.isFinite)).toBe(true)
        expect(run.every(([longitude,latitude])=>longitude>=west&&longitude<=east&&latitude>=south&&latitude<=north)).toBe(true)
        for (const width of BORDER_CONTEXT_MAP_WIDTHS) {
          expect(Number.isInteger(borderContextFitZoom(focus, width))).toBe(true)
          expect(borderContextScreenSpan(run, focus, width)).toBeGreaterThanOrEqual(96)
        }
      }
      const [south,west,north,east]=allBorderRunsFocus(question.runs).bounds
      expect(question.runs.flat().every(([longitude,latitude])=>longitude>=west&&longitude<=east&&latitude>=south&&latitude<=north)).toBe(true)
    }
  })
  it('locks representative large, microstate and extreme selected-run frames', () => {
    for (const pair of ['PRK,RUS','KAZ,RUS','BWA,ZMB','ITA,VAT','CHE,LIE','FRA,MCO','ESP,MAR']) {
      const question=borderQuestions('easy','All',()=>0).find(value=>value.codes.join(',')===pair)!
      expect(selectedBorderFocus(question.path).maxZoom).toBe(18)
    }
  })
})
