import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, MapContainer, Pane, useMap } from 'react-leaflet'
import type { GeoJsonObject } from 'geojson'
import { type BorderPosition } from './borderCountries'
import { selectedBorderFocus } from './borderContextViewport'
function Refit({ path, epoch, reducedMotion }: { path: readonly BorderPosition[]; epoch: number; reducedMotion: boolean }) { const map=useMap(); const focus=useMemo(()=>selectedBorderFocus(path),[path]); useEffect(()=>{map.stop();map.fitBounds([[focus.bounds[0],focus.bounds[1]],[focus.bounds[2],focus.bounds[3]]],{animate:!reducedMotion,maxZoom:focus.maxZoom,padding:[focus.padding[0],focus.padding[1]]})},[map,focus,epoch,reducedMotion]);return null }
function Semantics({ label }: { label: string }){const map=useMap();useEffect(()=>{const node=map.getContainer();node.setAttribute('role','application');node.setAttribute('aria-label',label);const invalidate=()=>map.invalidateSize({animate:false,pan:false});const Observer=window.ResizeObserver;const observer=Observer?new Observer(invalidate):undefined;observer?.observe(node);if(!observer)window.addEventListener('resize',invalidate);return()=>{node.removeAttribute('role');node.removeAttribute('aria-label');observer?.disconnect();if(!observer)window.removeEventListener('resize',invalidate)}},[map,label]);return null}
export type BorderContextCountry = Readonly<{ name: string; geometry: GeoJsonObject; status: 'known'|'correct'|'revealed' }>

/**
 * Receives only countries already disclosed by the quiz.  In particular it is
 * deliberately unable to derive a country from a border question or its codes.
 */
export function EasyBorderContextMap({ path, countries, recenterEpoch }: { path: readonly BorderPosition[]; countries: readonly BorderContextCountry[]; recenterEpoch: number }) {
  const focus=selectedBorderFocus(path)
  const [manualEpoch,setManualEpoch]=useState(0); const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false; const bounds = [[focus.bounds[0], focus.bounds[1]], [focus.bounds[2], focus.bounds[3]]] as [[number, number], [number, number]]; const padding=[focus.padding[0],focus.padding[1]] as [number,number]
  const disclosedNames=countries.map(country=>country.name).join(' and ')
  return <section className="easy-border-context-shell" aria-label={`Border context map for ${disclosedNames}`}>
    <MapContainer className="easy-border-context-map" bounds={bounds} boundsOptions={{animate:!reducedMotion,maxZoom:focus.maxZoom,padding}} minZoom={2} maxZoom={18} keyboard scrollWheelZoom worldCopyJump={false} attributionControl={false}>
      <Refit path={path} epoch={recenterEpoch+manualEpoch} reducedMotion={reducedMotion}/><Semantics label={`Border context map for ${disclosedNames}`}/>
      <Pane name="easy-border-known" style={{zIndex:300}}>{countries.filter(country=>country.status==='known').map(country=><GeoJSON key={country.name} data={country.geometry} interactive={false} style={{color:'#6684af',weight:2,fillColor:'#dbe8ff',fillOpacity:.82}}/>)}</Pane>
      <Pane name="easy-border-answer" style={{zIndex:310}}>{countries.filter(country=>country.status!=='known').map(country=><GeoJSON key={country.name} data={country.geometry} interactive={false} style={{color:country.status==='correct'?'#75d4ad':'#e08989',weight:2,fillColor:country.status==='correct'?'#3f9678':'#86575b',fillOpacity:.5,dashArray:country.status==='revealed'?'6 5':undefined,className:`easy-border-answer easy-border-answer-${country.status}`}}/>)}</Pane>
      <Pane name="easy-border-line" style={{zIndex:400}}><GeoJSON data={{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:path}} as never} interactive={false} style={{color:'#101b2d',weight:8,className:'easy-border-selected-run-halo'}}/><GeoJSON data={{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:path}} as never} interactive={false} style={{color:'#ffcf70',weight:4,className:'easy-border-selected-run'}}/></Pane>
    </MapContainer><p className="easy-border-context-hint">Drag to move · scroll or pinch to zoom</p><button type="button" className="text-button easy-border-recenter" onClick={()=>setManualEpoch(value=>value+1)}>Recenter shared border</button>
  </section>
}
