import { useEffect, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Pane, Tooltip, useMap } from 'react-leaflet'
import type { Capital } from '../../core/capital'
import { COUNTRY_OUTLINES_PANE, COUNTRY_OUTLINES_PANE_Z_INDEX, countryBoundaryLines } from './countryBoundaries'
import { MAP_LABEL, MAP_PAN_BOUNDS, MAP_VIEWPORT_OPTIONS, WORLD_BOUNDS, targetFocusZoom } from './mapViewport'

function FocusMapOnTarget({ target, questionNumber }: { target: Capital; questionNumber: number }) {
  const map = useMap()
  useEffect(() => {
    const center: [number, number] = [target.latitude, target.longitude]
    const zoom = targetFocusZoom(map.getSize().x)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    map.stop()
    if (reducedMotion) {
      map.setView(center, zoom, { animate: false })
    } else {
      map.flyTo(center, zoom)
    }
  }, [map, questionNumber, target.latitude, target.longitude])
  return null
}

function SetMapSemantics() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    container.setAttribute('role', 'application')
    container.setAttribute('aria-label', MAP_LABEL)
    return () => {
      container.removeAttribute('role')
      container.removeAttribute('aria-label')
    }
  }, [map])
  return null
}

type CapitalMapProps = {
  capitals: readonly Capital[]
  target: Capital
  questionNumber: number
}

export function CapitalMap({ capitals, target, questionNumber }: CapitalMapProps) {
  const [showCountryOutlines, setShowCountryOutlines] = useState(false)
  const [showCapitalNames, setShowCapitalNames] = useState(false)

  return (
    <section className="map-shell" role="region" aria-label={MAP_LABEL}>
      <MapContainer
        className="capital-map"
        bounds={WORLD_BOUNDS}
        maxBounds={MAP_PAN_BOUNDS}
        maxBoundsViscosity={MAP_VIEWPORT_OPTIONS.maxBoundsViscosity}
        minZoom={MAP_VIEWPORT_OPTIONS.minZoom}
        maxZoom={MAP_VIEWPORT_OPTIONS.maxZoom}
        zoomControl
        attributionControl={false}
        worldCopyJump={MAP_VIEWPORT_OPTIONS.worldCopyJump}
        scrollWheelZoom
      >
        <FocusMapOnTarget target={target} questionNumber={questionNumber} />
        <SetMapSemantics />
        {showCountryOutlines && (
          <Pane name={COUNTRY_OUTLINES_PANE} style={{ zIndex: COUNTRY_OUTLINES_PANE_Z_INDEX }}>
            <GeoJSON
              data={countryBoundaryLines}
              interactive={false}
              style={{ color: '#7898c3', weight: 0.8, opacity: 0.72, fill: false }}
            />
          </Pane>
        )}
        {capitals.map((capital) => (
          <CircleMarker
            key={capital.id}
            center={[capital.latitude, capital.longitude]}
            radius={2.75}
            pathOptions={{ color: '#a8c9ff', weight: 1, fillColor: '#dbe9ff', fillOpacity: 0.9 }}
            interactive={false}
          >
            {showCapitalNames && (
              <Tooltip permanent interactive={false} direction="right" offset={[5, 0]} className="capital-name-label">
                {capital.capital}
              </Tooltip>
            )}
          </CircleMarker>
        ))}
        <CircleMarker
          center={[target.latitude, target.longitude]}
          radius={9}
          pathOptions={{ color: '#ffce71', weight: 2.5, fillColor: '#ffce71', fillOpacity: 0.08, className: 'target-halo' }}
          interactive={false}
        />
      </MapContainer>
      <div className="map-display-options" role="group" aria-label="Map display options">
        <button
          className="map-layer-switch"
          type="button"
          role="switch"
          aria-label="Country outlines"
          aria-checked={showCountryOutlines}
          onClick={() => setShowCountryOutlines((visible) => !visible)}
        >
          <span>Country outlines</span>
          <span className="map-layer-switch-state" aria-hidden="true">{showCountryOutlines ? 'On' : 'Off'}</span>
        </button>
        <button
          className="map-layer-switch"
          type="button"
          role="switch"
          aria-label="Capital names"
          aria-checked={showCapitalNames}
          onClick={() => setShowCapitalNames((visible) => !visible)}
        >
          <span>Capital names</span>
          <span className="map-layer-switch-state" aria-hidden="true">{showCapitalNames ? 'On' : 'Off'}</span>
        </button>
      </div>
      <p className="map-hint">Drag to pan · scroll or pinch to zoom</p>
    </section>
  )
}
