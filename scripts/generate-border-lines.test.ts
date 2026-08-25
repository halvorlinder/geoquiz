import { describe, expect, it } from 'vitest'
import { geodesicLineLength, longestSharedPath, parseLineComponents, sharedPaths } from './generate-border-lines'

type Point = readonly [number, number]
const key = (a: Point,b: Point) => { const left=`${a[0]*10_000_000},${a[1]*10_000_000}`,right=`${b[0]*10_000_000},${b[1]*10_000_000}`; return left<right?`${left}|${right}`:`${right}|${left}` }

describe('border-line run helpers', () => {
  it('keeps MultiLineString components separate and never creates a connector', () => {
    expect(parseLineComponents('MULTILINESTRING ((0 0, 1 0), (9 0, 10 0))')).toEqual([[[0,0],[1,0]],[[9,0],[10,0]]])
  })
  it('joins a shared run across a closed-ring encoding seam', () => {
    const ring: Point[]=[[0,0],[1,0],[1,1],[0,1],[0,0]]
    const shared=new Set([key(ring[3],ring[4]),key(ring[0],ring[1])])
    expect(longestSharedPath([ring],shared)).toEqual([[0,1],[0,0],[1,0]])
    expect(sharedPaths([ring],shared)).toEqual([[[0,1],[0,0],[1,0]]])
  })
  it('ranks runs by geodesic length rather than the number of vertices', () => {
    const dense: Point[]=[[0,0],[.01,0],[.02,0],[.03,0],[.04,0]]
    const long: Point[]=[[0,10],[1,10]]
    const shared=new Set([...dense.slice(1).map((point,index)=>key(dense[index],point)),key(long[0],long[1])])
    expect(longestSharedPath([dense,long],shared)).toEqual(long)
    expect(geodesicLineLength(long)).toBeGreaterThan(geodesicLineLength(dense))
  })
  it('retains independent runs in deterministic geodesic/key order without connectors', () => {
    const short: Point[]=[[9,0],[10,0]], long: Point[]=[[0,0],[2,0]]
    const shared=new Set([key(short[0],short[1]),key(long[0],long[1])])
    expect(sharedPaths([short,long],shared)).toEqual([long,short])
  })
  it('deduplicates reversed copies and canonicalizes equal-length run order', () => {
    const east: Point[]=[[9,0],[10,0]], west: Point[]=[[0,0],[1,0]]
    const shared=new Set([key(east[0],east[1]),key(west[0],west[1])])
    // The reverse duplicate has the same canonical endpoint key and must not
    // become an artificial second section.
    const runs=sharedPaths([east,[...east].reverse(),west],shared)
    expect(runs).toHaveLength(2)
    const canonical=(run: readonly Point[])=>{const forward=run.map(point=>point.join(',')).join(';'),reverse=[...run].reverse().map(point=>point.join(',')).join(';');return forward<reverse?forward:reverse}
    expect(runs.map(canonical)).toEqual([canonical(west),canonical(east)])
  })
})
