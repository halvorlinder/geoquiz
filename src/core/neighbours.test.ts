import { describe, expect, it } from 'vitest'
import neighbourData from '../data/neighbours.json'
import {
  getEligibleNeighbourEntityCodes,
  getNeighbourCodes,
  hasEligibleLandNeighbours,
} from './neighbours'

const expectedZeroNeighbourCodes = [
  'ATG', 'AUS', 'BHR', 'BHS', 'BRB', 'COM', 'CPV', 'CUB', 'CYP', 'DMA', 'FJI', 'FSM',
  'GRD', 'ISL', 'JAM', 'JPN', 'KIR', 'KNA', 'LCA', 'LKA', 'MDG', 'MDV', 'MHL', 'MLT',
  'MUS', 'NRU', 'NZL', 'PHL', 'PLW', 'SGP', 'SLB', 'STP', 'SYC', 'TON', 'TTO',
  'TUV', 'TWN', 'VCT', 'VUT', 'WSM',
]

describe('neighbour data helpers', () => {
  it('distinguishes unknown entities from known zero-neighbour entities', () => {
    expect(getNeighbourCodes('NOT-A-CODE')).toBeUndefined()
    expect(getNeighbourCodes('CYP')).toEqual([])
    expect(hasEligibleLandNeighbours('CYP')).toBe(false)
    expect(hasEligibleLandNeighbours('NOT-A-CODE')).toBe(false)
  })

  it('returns stable, sorted, immutable outputs', () => {
    const russiaNeighbours = getNeighbourCodes('RUS')
    const eligible = getEligibleNeighbourEntityCodes()

    expect(russiaNeighbours).toEqual([...russiaNeighbours ?? []].sort())
    expect(eligible).toEqual([...eligible].sort())
    expect(Object.isFrozen(russiaNeighbours)).toBe(true)
    expect(Object.isFrozen(eligible)).toBe(true)
    expect(() => (russiaNeighbours as string[]).push('ZZZ')).toThrow()
    expect(() => (eligible as string[]).push('ZZZ')).toThrow()
  })

  it('covers every capital-study entity and builds reciprocal, unique, non-self adjacency', () => {
    const codes = neighbourData.entityCodes
    expect(codes).toHaveLength(197)
    expect(new Set(codes).size).toBe(197)
    expect(codes).toEqual([...codes].sort())

    const edgeKeys = neighbourData.boundaries.map((edge) => edge.codes.join(','))
    expect(new Set(edgeKeys).size).toBe(edgeKeys.length)
    expect(edgeKeys).toEqual([...edgeKeys].sort())
    for (const code of codes) {
      const neighbours = getNeighbourCodes(code)
      expect(neighbours).toBeDefined()
      expect(neighbours).toEqual([...neighbours ?? []].sort())
      for (const neighbour of neighbours ?? []) {
        expect(neighbour).not.toBe(code)
        expect(getNeighbourCodes(neighbour)).toContain(code)
      }
    }
  })

  it('snapshots zero-neighbour policy and derives the eligible deck from it', () => {
    const zeroCodes = neighbourData.entityCodes.filter((code) => getNeighbourCodes(code)?.length === 0)
    expect(zeroCodes).toEqual(expectedZeroNeighbourCodes)
    expect(getEligibleNeighbourEntityCodes()).toHaveLength(157)
    expect(getEligibleNeighbourEntityCodes()).not.toEqual(expect.arrayContaining(expectedZeroNeighbourCodes))
  })

  it('keeps the required sensitive inclusions and exclusions', () => {
    expect(getNeighbourCodes('PSE')).toEqual(['EGY', 'ISR', 'JOR'])
    expect(getNeighbourCodes('XKX')).toEqual(['ALB', 'MKD', 'MNE', 'SRB'])
    expect(getNeighbourCodes('MAR')).toEqual(['DZA', 'ESP'])
    expect(getNeighbourCodes('CYP')).toEqual([])

    for (const [left, right] of [
      ['ISR', 'SYR'], ['GEO', 'RUS'], ['UKR', 'RUS'], ['ARM', 'AZE'], ['CHN', 'IND'],
      ['IND', 'PAK'], ['AFG', 'PAK'], ['GUY', 'VEN'], ['GUY', 'SUR'], ['BLZ', 'GTM'],
      ['ERI', 'ETH'], ['SDN', 'SSD'], ['HRV', 'SRB'], ['RUS', 'POL'], ['RUS', 'LTU'],
      ['AZE', 'TUR'], ['AGO', 'COG'], ['FRA', 'BRA'], ['FRA', 'SUR'], ['ESP', 'MAR'],
      ['BWA', 'ZMB'], ['LTU', 'LVA'], ['MLI', 'MRT'], ['MLI', 'NER'], ['MNG', 'RUS'],
      ['OMN', 'SAU'], ['OMN', 'YEM'], ['QAT', 'SAU'], ['HRV', 'MNE'],
    ]) expect(getNeighbourCodes(left)).toContain(right)

    expect(getNeighbourCodes('GBR')).not.toContain('ESP')
    expect(getNeighbourCodes('GBR')).not.toContain('CYP')
    expect(getNeighbourCodes('DNK')).not.toContain('CAN')
    expect(getNeighbourCodes('MAR')).not.toContain('MRT')
  })
})
