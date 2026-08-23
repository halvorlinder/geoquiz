import { describe, expect, it } from 'vitest'
import type { Capital } from '../../core/capital'
import { capitalsForContinent, isTimedCapitalAnswerAccepted } from './capitalMapModes'

const oslo: Capital = {
  id: 'oslo', capital: 'Oslo', latitude: 0, longitude: 0, aliases: ['Christiania'], coordinateSource: 'test', checked: '2026-08-20',
  entities: [{ code: 'NOR', country: 'Norway', sourceRef: 'test', checked: '2026-08-20' }],
}
const sanaa: Capital = {
  id: 'sanaa', capital: 'Sanaa', latitude: 0, longitude: 0, aliases: [], coordinateSource: 'test', checked: '2026-08-20',
  entities: [{ code: 'YEM', country: 'Yemen', sourceRef: 'test', checked: '2026-08-20' }],
}
const jerusalem: Capital = {
  id: 'jerusalem', capital: 'Jerusalem', latitude: 0, longitude: 0, aliases: [], coordinateSource: 'test', checked: '2026-08-20',
  entities: [
    { code: 'ISR', country: 'Israel', sourceRef: 'test', checked: '2026-08-20' },
    { code: 'PSE', country: 'Palestine', sourceRef: 'test', checked: '2026-08-20' },
  ],
}
const unknown: Capital = {
  id: 'unknown', capital: 'Unknown', latitude: 0, longitude: 0, aliases: [], coordinateSource: 'test', checked: '2026-08-20',
  entities: [{ code: 'ZZZ', country: 'Unknown', sourceRef: 'test', checked: '2026-08-20' }],
}

describe('capital-map mode adapters', () => {
  it('keeps all places for All, includes a shared place for either matching entity, and excludes missing catalog entities', () => {
    const continents = (code: string) => ({ NOR: 'Europe', YEM: 'Asia', ISR: 'Asia', PSE: 'Europe' } as const)[code]
    expect(capitalsForContinent([oslo, sanaa, jerusalem, unknown], 'All', continents)).toEqual([oslo, sanaa, jerusalem, unknown])
    expect(capitalsForContinent([oslo, sanaa, jerusalem, unknown], 'Europe', continents)).toEqual([oslo, jerusalem])
    expect(capitalsForContinent([oslo, sanaa, jerusalem, unknown], 'Asia', continents)).toEqual([sanaa, jerusalem])
  })

  it('accepts exact names and legitimate typos, but waits through a strict target-name prefix and rejects another capital', () => {
    expect(isTimedCapitalAnswerAccepted('Oslo', oslo, [oslo, sanaa])).toBe(true)
    expect(isTimedCapitalAnswerAccepted('Osloq', oslo, [oslo, sanaa])).toBe(true)
    expect(isTimedCapitalAnswerAccepted('Sana', sanaa, [oslo, sanaa])).toBe(false)
    expect(isTimedCapitalAnswerAccepted('Sanaa', oslo, [oslo, sanaa])).toBe(false)
  })
})
