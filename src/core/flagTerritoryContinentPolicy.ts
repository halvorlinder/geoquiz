import type { Continent } from './entity'

/**
 * Territory placement is a study filter, not a statement about sovereignty.
 * UN M49 is the baseline where it has a useful regional placement; this fixed
 * table keeps the flag deck deterministic for associated areas without a
 * sovereign entity record.
 */
export const flagTerritoryContinents = Object.freeze({
  AX: 'Europe', FO: 'Europe', GG: 'Europe', IM: 'Europe', JE: 'Europe', GI: 'Europe',
  HK: 'Asia', MO: 'Asia',
  GL: 'North America', AW: 'North America', CW: 'North America', SX: 'North America',
  'BQ-BO': 'North America', 'BQ-SE': 'North America', 'BQ-SA': 'North America',
  AI: 'North America', BM: 'North America', VG: 'North America', KY: 'North America',
  MS: 'North America', TC: 'North America', PR: 'North America', VI: 'North America',
  FK: 'South America',
  CK: 'Oceania', NU: 'Oceania', TK: 'Oceania', CX: 'Oceania', CC: 'Oceania', NF: 'Oceania',
  PF: 'Oceania', PN: 'Oceania', AS: 'Oceania', GU: 'Oceania', MP: 'Oceania',
  'SH-HL': 'Africa', 'SH-AC': 'Africa', 'SH-TA': 'Africa',
} as const satisfies Readonly<Record<string, Continent>>)

export function territoryContinentForFlag(id: string): Continent | undefined {
  return flagTerritoryContinents[id as keyof typeof flagTerritoryContinents]
}
