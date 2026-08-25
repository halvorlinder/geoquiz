import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { BORDER_DATA_VERSION, borderEntity, borderLineContainedInShape, borderQuestions } from './borderCountries'
import { geodesicLineLength } from '../../../scripts/generate-border-lines'

describe('border-country decks', () => {
  it('keeps the complete curated pair roster in both modes', () => {
    const hard = borderQuestions('hard', 'All', () => 0)
    const easy = borderQuestions('easy', 'All', () => 0)
    expect(hard).toHaveLength(317); expect(easy).toHaveLength(317)
    expect(new Set(hard.map(question => question.codes.join(','))).size).toBe(317)
    expect(new Set(easy.map(question => question.codes.join(','))).size).toBe(317)
    expect(BORDER_DATA_VERSION).toContain('v2-orientation-1')
  })
  it('orients Easy with its injected random source and respects selected continent', () => {
    const first = borderQuestions('easy', 'Europe', () => 0)
    const second = borderQuestions('easy', 'Europe', () => .99)
    expect(first).toHaveLength(second.length)
    for (const question of first) expect(borderEntity(question.knownCode!)?.continent).toBe('Europe')
    expect(first.some((question, index) => question.knownCode !== second[index].knownCode)).toBe(true)
  })
  it('locks all exact run sections, including the multi-run registry and Spain–Morocco snapshots', () => {
    const overrides = borderQuestions('hard').filter(question => question.source !== 'current-shapes')
    expect(overrides.map(question => question.codes.join(','))).toEqual(['AND,ESP','AND,FRA','AUT,LIE','BWA,ZMB','CHE,LIE','ESP,MAR','FRA,MCO','ITA,SMR','ITA,VAT'])
    const all=borderQuestions('hard')
    expect(all.reduce((count,question)=>count+question.runs.length,0)).toBe(352)
    expect(all.filter(question=>question.runs.length>1)).toHaveLength(27)
    expect(all.every(question=>question.runs.length<=4)).toBe(true)
    const registry=all.map(question=>`${question.codes.join(',')}:${question.runs.length}`).join('|')
    expect(createHash('sha256').update(registry).digest('hex')).toBe('f48d4b5927b16a38be9a18992e3609b0bceae7dad3c812ca91ef90efec51f31b')
    const runKey=(run: readonly (readonly [number,number])[])=>{const forward=run.map(([x,y])=>`${Math.round(x*10_000_000)},${Math.round(y*10_000_000)}`).join(';');const reverse=[...run].reverse().map(([x,y])=>`${Math.round(x*10_000_000)},${Math.round(y*10_000_000)}`).join(';');return forward<reverse?forward:reverse}
    for(const question of all)for(let index=1;index<question.runs.length;index+=1){const previous=question.runs[index-1],next=question.runs[index];const previousLength=geodesicLineLength(previous),nextLength=geodesicLineLength(next);expect(previousLength>nextLength||previousLength===nextLength&&runKey(previous)<=runKey(next),question.id).toBe(true)}
    expect(all.find(question=>question.codes.join(',')==='ESP,FRA')?.runs).toHaveLength(2)
    const espMar=all.find(question=>question.codes.join(',') === 'ESP,MAR')!
    expect(espMar.runs.map(run=>run.length)).toEqual([117,354])
    expect(espMar.runs.map(run=>Number((geodesicLineLength(run)/1000).toFixed(3)))).toEqual([9.997,7.853])
    expect(all.find(question=>question.codes.join(',')==='CAN,USA')?.runs).toHaveLength(4)
    expect(all.find(question=>question.codes.join(',')==='ARM,AZE')?.runs).toHaveLength(4)
    expect(overrides.find(question => question.codes.join(',') === 'BWA,ZMB')?.path).toHaveLength(2)
  })
  it('keeps every independent run exactly on both eligible source-matched silhouettes', () => {
    for (const random of [() => 0, () => .99]) for (const question of borderQuestions('easy', 'All', random)) {
      expect(borderLineContainedInShape(question, question.knownCode!)).toBe(true)
      expect(borderLineContainedInShape(question, question.answerCode!)).toBe(true)
    }
  })
})
