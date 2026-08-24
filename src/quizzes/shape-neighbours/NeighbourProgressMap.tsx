import { useEffect, useMemo } from 'react'
import { GeoJSON, MapContainer, Pane, useMap } from 'react-leaflet'
import { countryShapeToSanitizedGeoJson, type CountryShape } from '../../core/countryShapes'
import { neighbourTargetFocus } from './neighbourMapViewport'
import './shapeNeighboursMap.css'

export type NeighbourProgressLayer = Readonly<{ shape: CountryShape; status: 'found' | 'revealed' }>

const MAP_LABEL = 'Neighbour study map'

function FocusTarget({ shape, questionKey, recenterVersion }: { shape: CountryShape; questionKey: string; recenterVersion: number }) {
  const map = useMap()
  const focus = useMemo(() => neighbourTargetFocus(shape), [shape])
  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    map.stop()
    map.fitBounds([[focus.bounds[0], focus.bounds[1]], [focus.bounds[2], focus.bounds[3]]], {
      animate: !reducedMotion,
      maxZoom: focus.maxZoom,
      padding: [20, 20],
    })
  }, [focus, map, questionKey, recenterVersion])
  return null
}

function MapSemanticsAndResize() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    container.setAttribute('role', 'application')
    container.setAttribute('aria-label', MAP_LABEL)
    const invalidate = () => map.invalidateSize({ animate: false, pan: false })
    const ResizeObserverConstructor = window.ResizeObserver
    const observer = ResizeObserverConstructor ? new ResizeObserverConstructor(invalidate) : undefined
    observer?.observe(container)
    if (!observer) window.addEventListener('resize', invalidate)
    return () => {
      container.removeAttribute('role')
      container.removeAttribute('aria-label')
      observer?.disconnect()
      if (!observer) window.removeEventListener('resize', invalidate)
    }
  }, [map])
  return null
}

function attributionSummary(shapes: readonly CountryShape[]) {
  const attributions = shapes.flatMap((shape) => shape.attribution ? [shape.attribution] : [])
  const labels = [...new Set(attributions.map(({ licenseLabel }) => licenseLabel))]
  return labels.length ? labels.join(' · ') : null
}

export function NeighbourProgressMap({ targetShape, layers, questionKey, recenterVersion }: {
  targetShape: CountryShape
  layers: readonly NeighbourProgressLayer[]
  questionKey: string
  recenterVersion: number
}) {
  const focus = useMemo(() => neighbourTargetFocus(targetShape), [targetShape])
  const initialBounds: [[number, number], [number, number]] = [
    [focus.bounds[0], focus.bounds[1]],
    [focus.bounds[2], focus.bounds[3]],
  ]
  const targetGeometry = useMemo(() => countryShapeToSanitizedGeoJson(targetShape), [targetShape])
  const layerGeometry = useMemo(() => layers.map((layer) => ({ ...layer, geometry: countryShapeToSanitizedGeoJson(layer.shape) })), [layers])
  const licenseLabels = attributionSummary([targetShape, ...layers.map(({ shape }) => shape)])
  const showsOsm = [targetShape, ...layers.map(({ shape }) => shape)].some((shape) => shape.attribution?.osmContributors)
  return (
    <section className="neighbour-progress-map-shell" aria-label={MAP_LABEL}>
      <MapContainer
        className="neighbour-progress-map"
        bounds={initialBounds}
        boundsOptions={{ animate: false, maxZoom: focus.maxZoom, padding: [20, 20] }}
        minZoom={2}
        maxZoom={18}
        zoomControl
        attributionControl={false}
        scrollWheelZoom
        keyboard
        worldCopyJump={false}
      >
        <FocusTarget shape={targetShape} questionKey={questionKey} recenterVersion={recenterVersion} />
        <MapSemanticsAndResize />
        <Pane name="neighbour-revealed" style={{ zIndex: 350 }}>
          {layerGeometry.map(({ geometry, status }, index) => (
            <GeoJSON
              key={`${questionKey}-${status}-${index}`}
              data={geometry}
              interactive={false}
              style={{
                color: status === 'found' ? '#75d4ad' : '#d99593',
                weight: 1.5,
                fillColor: status === 'found' ? '#3f9678' : '#86575b',
                fillOpacity: status === 'found' ? 0.7 : 0.36,
                className: `neighbour-map-layer neighbour-map-layer-${status}`,
              }}
            />
          ))}
        </Pane>
        <Pane name="neighbour-target" style={{ zIndex: 400 }}>
          <GeoJSON
            key={`target-${questionKey}`}
            data={targetGeometry}
            interactive={false}
            style={{ color: '#ffcf70', weight: 2.1, fillColor: '#dbe8ff', fillOpacity: 0.9, className: 'neighbour-map-target' }}
          />
        </Pane>
      </MapContainer>
      <p className="neighbour-map-hint">Drag to pan · scroll or pinch to zoom</p>
      {licenseLabels && <p className="neighbour-map-attribution">Map shapes: <a href={`${import.meta.env.BASE_URL}country-shape-credits.html`}>geoBoundaries</a> · {licenseLabels}{showsOsm && <> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a></>}</p>}
    </section>
  )
}
