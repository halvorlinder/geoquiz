import { useEffect, useMemo, useRef, useState } from 'react'
import { GeoJSON, MapContainer, Pane, useMap } from 'react-leaflet'
import type { GeoJsonObject } from 'geojson'
import { type BorderPosition } from './borderCountries'
import { allBorderRunsFocus, selectedBorderFocus } from './borderContextViewport'
function Refit({ runs, section, epoch, reducedMotion }: { runs: readonly (readonly BorderPosition[])[]; section: number | undefined; epoch: number; reducedMotion: boolean }) { const map=useMap(), mapRef=useRef(map); mapRef.current=map; const focus=useMemo(()=>section===undefined?allBorderRunsFocus(runs):selectedBorderFocus(runs[section]),[runs,section]); useEffect(()=>{mapRef.current.stop();mapRef.current.fitBounds([[focus.bounds[0],focus.bounds[1]],[focus.bounds[2],focus.bounds[3]]],{animate:!reducedMotion,maxZoom:focus.maxZoom,padding:[focus.padding[0],focus.padding[1]]})},[focus,epoch,reducedMotion]);return null }
function Semantics({ label }: { label: string }){const map=useMap();useEffect(()=>{const node=map.getContainer();node.setAttribute('role','application');node.setAttribute('aria-label',label);const invalidate=()=>map.invalidateSize({animate:false,pan:false});const Observer=window.ResizeObserver;const observer=Observer?new Observer(invalidate):undefined;observer?.observe(node);if(!observer)window.addEventListener('resize',invalidate);return()=>{node.removeAttribute('role');node.removeAttribute('aria-label');observer?.disconnect();if(!observer)window.removeEventListener('resize',invalidate)}},[map,label]);return null}
export type BorderContextCountry = Readonly<{ name: string; geometry: GeoJsonObject; status: 'known'|'correct'|'revealed' }>

/**
 * Receives only countries already disclosed by the quiz.  In particular it is
 * deliberately unable to derive a country from a border question or its codes.
 */
export function EasyBorderContextMap({ path, runs: suppliedRuns, countries, recenterEpoch }: { path?: readonly BorderPosition[]; runs?: readonly (readonly BorderPosition[])[]; countries: readonly BorderContextCountry[]; recenterEpoch: number }) {
  const runs=useMemo(()=>suppliedRuns??(path?[path]:[]),[suppliedRuns,path]); if(!runs.length)throw new Error('Border context map requires at least one run.')
  const focus=allBorderRunsFocus(runs)
  // An answer/reveal advances the caller's epoch. Treat that as an immediate
  // all-runs view even before React commits the local-state reset, so a stale
  // manually focused section can never win the refit race.
  const [view,setView]=useState({ externalEpoch: recenterEpoch, section: undefined as number|undefined, revision: 0 })
  const externalReset=view.externalEpoch!==recenterEpoch
  const section=externalReset?undefined:view.section
  useEffect(()=>{if(externalReset)setView(current=>current.externalEpoch===recenterEpoch?current:{...current,externalEpoch:recenterEpoch,section:undefined})},[externalReset,recenterEpoch])
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false; const bounds = [[focus.bounds[0], focus.bounds[1]], [focus.bounds[2], focus.bounds[3]]] as [[number, number], [number, number]]; const padding=[focus.padding[0],focus.padding[1]] as [number,number]
  const disclosedNames=countries.map(country=>country.name).join(' and ')
  return <section className="easy-border-context-shell" aria-label={`Border context map for ${disclosedNames}`}>
    <MapContainer className="easy-border-context-map" bounds={bounds} boundsOptions={{animate:!reducedMotion,maxZoom:focus.maxZoom,padding}} minZoom={2} maxZoom={18} keyboard scrollWheelZoom worldCopyJump={false} attributionControl={false}>
      <Refit runs={runs} section={section} epoch={recenterEpoch+view.revision} reducedMotion={reducedMotion}/><Semantics label={`Border context map for ${disclosedNames}`}/>
      <Pane name="easy-border-known" style={{zIndex:300}}>{countries.filter(country=>country.status==='known').map(country=><GeoJSON key={country.name} data={country.geometry} interactive={false} style={{color:'#6684af',weight:2,fillColor:'#dbe8ff',fillOpacity:.82}}/>)}</Pane>
      <Pane name="easy-border-answer" style={{zIndex:310}}>{countries.filter(country=>country.status!=='known').map(country=><GeoJSON key={country.name} data={country.geometry} interactive={false} style={{color:country.status==='correct'?'#75d4ad':'#e08989',weight:2,fillColor:country.status==='correct'?'#3f9678':'#86575b',fillOpacity:.5,dashArray:country.status==='revealed'?'6 5':undefined,className:`easy-border-answer easy-border-answer-${country.status}`}}/>)}</Pane>
      <Pane name="easy-border-line" style={{zIndex:400}}><GeoJSON data={{type:'Feature',properties:{},geometry:{type:'MultiLineString',coordinates:runs}} as never} interactive={false} style={{color:'#101b2d',weight:8,className:'easy-border-selected-run-halo'}}/><GeoJSON data={{type:'Feature',properties:{},geometry:{type:'MultiLineString',coordinates:runs}} as never} interactive={false} style={{color:'#ffcf70',weight:4,className:'easy-border-selected-run'}}/></Pane>
    </MapContainer><div className="easy-border-map-controls">{runs.length>1?<><button type="button" className="text-button" onClick={()=>{setView(current=>({externalEpoch:recenterEpoch,section:current.externalEpoch===recenterEpoch?(current.section===undefined?0:(current.section+1)%runs.length):0,revision:current.revision+1}))}}>Focus next section</button><button type="button" className="text-button" onClick={()=>{setView(current=>({externalEpoch:recenterEpoch,section:undefined,revision:current.revision+1}))}}>Show all sections</button></>:<button type="button" className="text-button" onClick={()=>{setView(current=>({externalEpoch:recenterEpoch,section:undefined,revision:current.revision+1}))}}>Recenter shared border</button>}</div><p className="easy-border-context-hint">Drag to move · scroll or pinch to zoom</p>
  </section>
}
