import { describe, expect, it } from 'vitest'
import { geodesicLineLength, longestSharedPath, parseLineComponents } from './generate-border-lines'

type Point = readonly [number, number]
const key = (a: Point,b: Point) => { const left=`${a[0]*10_000_000},${a[1]*10_000_000}`,right=`${b[0]*10_000_000},${b[1]*10_000_000}`; return left<right?`${left}|${right}`:`${right}|${left}` }

describe('border-line primary run helpers', () => {
  it('keeps MultiLineString components separate and never creates a connector', () => {
    expect(parseLineComponents('MULTILINESTRING ((0 0, 1 0), (9 0, 10 0))')).toEqual([[[0,0],[1,0]],[[9,0],[10,0]]])
  })
  it('joins a shared run across a closed-ring encoding seam', () => {
    const ring: Point[]=[[0,0],[1,0],[1,1],[0,1],[0,0]]
    const shared=new Set([key(ring[3],ring[4]),key(ring[0],ring[1])])
    expect(longestSharedPath([ring],shared)).toEqual([[0,1],[0,0],[1,0]])
  })
  it('ranks runs by geodesic length rather than the number of vertices', () => {
    const dense: Point[]=[[0,0],[.01,0],[.02,0],[.03,0],[.04,0]]
    const long: Point[]=[[0,10],[1,10]]
    const shared=new Set([...dense.slice(1).map((point,index)=>key(dense[index],point)),key(long[0],long[1])])
    expect(longestSharedPath([dense,long],shared)).toEqual(long)
    expect(geodesicLineLength(long)).toBeGreaterThan(geodesicLineLength(dense))
  })
})
