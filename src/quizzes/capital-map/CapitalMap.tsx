import { useEffect } from 'react'
import { CircleMarker, MapContainer, useMap } from 'react-leaflet'
import type { Capital } from '../../core/capital'
import { MAP_LABEL, MAP_VIEWPORT_OPTIONS, WORLD_BOUNDS } from './mapViewport'

function ResetMapOnQuestion({ questionNumber }: { questionNumber: number }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(WORLD_BOUNDS, { padding: [20, 20], animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches })
  }, [map, questionNumber])
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
  return (
    <section className="map-shell" role="region" aria-label={MAP_LABEL}>
      <MapContainer
        className="capital-map"
        bounds={WORLD_BOUNDS}
        maxBounds={WORLD_BOUNDS}
        maxBoundsViscosity={MAP_VIEWPORT_OPTIONS.maxBoundsViscosity}
        minZoom={MAP_VIEWPORT_OPTIONS.minZoom}
        maxZoom={MAP_VIEWPORT_OPTIONS.maxZoom}
        zoomControl
        attributionControl={false}
        worldCopyJump={MAP_VIEWPORT_OPTIONS.worldCopyJump}
        scrollWheelZoom
      >
        <ResetMapOnQuestion questionNumber={questionNumber} />
        <SetMapSemantics />
        {capitals.map((capital) => (
          <CircleMarker
            key={capital.id}
            center={[capital.latitude, capital.longitude]}
            radius={2.75}
            pathOptions={{ color: '#a8c9ff', weight: 1, fillColor: '#dbe9ff', fillOpacity: 0.9 }}
            interactive={false}
          />
        ))}
        <CircleMarker
          center={[target.latitude, target.longitude]}
          radius={9}
          pathOptions={{ color: '#ffce71', weight: 2.5, fillColor: '#ffce71', fillOpacity: 0.08, className: 'target-halo' }}
          interactive={false}
        />
      </MapContainer>
      <p className="map-hint">Drag to pan · scroll or pinch to zoom</p>
    </section>
  )
}
