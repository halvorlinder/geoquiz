import { countryShapeToSanitizedGeoJson, type CountryShape } from '../../core/countryShapes'
import type { BorderPosition } from './borderCountries'

type Rings = readonly (readonly BorderPosition[])[]
function isRings(shape: CountryShape | Rings): shape is Rings { return !Object.hasOwn(shape as object, 'polygons') }
function ringArea(ring: readonly BorderPosition[]) { return ring.slice(1).reduce((sum,point,index)=>sum+ring[index][0]*point[1]-point[0]*ring[index][1],0)/2 }
function contains(ring: readonly BorderPosition[], [x,y]: BorderPosition) { let inside=false; for(let i=0,j=ring.length-1;i<ring.length;j=i++) { const a=ring[i],b=ring[j]; if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside } return inside }
/** Property-free adapter for the narrow Overture flat-ring overrides. */
export function borderContextGeometry(shape: CountryShape | Rings) {
  if(!isRings(shape)) return countryShapeToSanitizedGeoJson(shape)
  const outers=shape.filter(ring=>ringArea(ring)>=0),holes=shape.filter(ring=>ringArea(ring)<0),polygons=outers.map(outer=>[outer,...holes.filter(hole=>contains(outer,hole[0]))])
  return { type:'Feature', properties:{}, geometry:{ type:polygons.length===1?'Polygon':'MultiPolygon', coordinates:polygons.length===1?polygons[0]:polygons } } as const
}
