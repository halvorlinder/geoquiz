import neighbourDataJson from '../data/neighbours.json'

export const NEIGHBOUR_DATA_VERSION = 1 as const

export type BoundaryScope = 'ordinary' | 'exclave' | 'integral-territory'

export type NeighbourSource = {
  readonly id: string
  readonly title: string
  readonly url: string
  readonly checked: string
  readonly description: string
}

export type LandBoundary = {
  readonly codes: readonly [string, string]
  readonly boundaryType: 'land'
  readonly scope: BoundaryScope
  readonly sourceRefs: readonly string[]
  readonly note?: string
}

export type ExcludedContact = {
  readonly codes: readonly [string, string]
  readonly reason: string
  readonly sourceRefs: readonly string[]
}

export type NeighbourData = {
  readonly version: number
  readonly checked: string
  readonly entityCodes: readonly string[]
  readonly sourceCatalog: readonly NeighbourSource[]
  readonly boundaries: readonly LandBoundary[]
  readonly excludedContacts: readonly ExcludedContact[]
}

// JSON imports cannot preserve tuple/string-literal inference; the mechanical
// validator verifies this dataset's runtime shape before it is published.
const neighbourData = neighbourDataJson as unknown as NeighbourData

const entityCodes = Object.freeze([...neighbourData.entityCodes].sort())
const knownCodes = new Set(entityCodes)
const adjacency = new Map<string, readonly string[]>()
const workingAdjacency = new Map(entityCodes.map((code) => [code, new Set<string>()]))

for (const boundary of neighbourData.boundaries) {
  const [left, right] = boundary.codes
  workingAdjacency.get(left)?.add(right)
  workingAdjacency.get(right)?.add(left)
}

for (const [code, neighbours] of workingAdjacency) {
  adjacency.set(code, Object.freeze([...neighbours].sort()))
}

const eligibleCodes = Object.freeze(entityCodes.filter((code) => (adjacency.get(code)?.length ?? 0) > 0))

export function getNeighbourCodes(code: string): readonly string[] | undefined {
  if (!knownCodes.has(code)) return undefined
  return adjacency.get(code)
}

export function hasEligibleLandNeighbours(code: string): boolean {
  return (getNeighbourCodes(code)?.length ?? 0) > 0
}

export function getEligibleNeighbourEntityCodes(): readonly string[] {
  return eligibleCodes
}
