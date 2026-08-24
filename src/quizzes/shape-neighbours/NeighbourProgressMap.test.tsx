import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import countryShapesData from '../../data/country-shapes.json'
import { getCountryShape, type CountryShapeDataset } from '../../core/countryShapes'

const leaflet = vi.hoisted(() => ({ fitBounds: vi.fn(), stop: vi.fn(), invalidateSize: vi.fn(), getContainer: vi.fn(() => document.createElement('div')) }))
vi.mock('react-leaflet', async () => {
  const React = await import('react')
  type GeoJsonProps = { data: { properties: Record<string, never>; geometry: { coordinates: unknown } }; style: { className: string } }
  /** Mirrors React-Leaflet v5: data is consumed when the layer mounts. */
  function MountOnlyGeoJson({ data, style }: GeoJsonProps) {
    const [initialData] = React.useState(data)
    return <div data-properties={JSON.stringify(initialData.properties)} data-geometry={JSON.stringify(initialData.geometry.coordinates).slice(0, 80)} className={style.className} />
  }
  return {
    MapContainer: ({ children, className, bounds, boundsOptions }: { children: ReactNode; className: string; bounds: unknown; boundsOptions: { maxZoom: number } }) => <div className={className} data-initial-bounds={JSON.stringify(bounds)} data-initial-max-zoom={boundsOptions.maxZoom}>{children}</div>,
    Pane: ({ children }: { children: ReactNode }) => <>{children}</>,
    GeoJSON: MountOnlyGeoJson,
    useMap: () => leaflet,
  }
})
import { NeighbourProgressMap } from './NeighbourProgressMap'

const shapes = countryShapesData as unknown as CountryShapeDataset

describe('NeighbourProgressMap', () => {
  beforeEach(() => {
    leaflet.fitBounds.mockClear(); leaflet.stop.mockClear(); leaflet.invalidateSize.mockClear()
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: true }) })
  })

  it('renders generic sanitized target and progressively distinct local layers', () => {
    const target = getCountryShape(shapes, 'DEU')!
    const denmark = getCountryShape(shapes, 'DNK')!
    const { container, rerender } = render(<NeighbourProgressMap targetShape={target} layers={[]} questionKey="question-one" recenterVersion={0} />)
    expect(screen.getByLabelText('Neighbour study map')).toBeTruthy()
    expect(container.querySelectorAll('.neighbour-map-target')).toHaveLength(1)
    expect(container.querySelectorAll('.neighbour-map-layer')).toHaveLength(0)
    expect(container.querySelector('.neighbour-progress-map')?.getAttribute('data-initial-max-zoom')).toBe('17')
    rerender(<NeighbourProgressMap targetShape={target} layers={[{ shape: denmark, status: 'found' }]} questionKey="question-one" recenterVersion={0} />)
    expect(container.querySelectorAll('.neighbour-map-layer-found')).toHaveLength(1)
    expect(container.innerHTML).not.toContain('DEU')
    expect(container.innerHTML).not.toContain('DNK')
    expect(container.querySelector('[data-properties="{}"]')).toBeTruthy()
    rerender(<NeighbourProgressMap targetShape={target} layers={[{ shape: denmark, status: 'revealed' }]} questionKey="question-one" recenterVersion={1} />)
    expect(container.querySelectorAll('.neighbour-map-layer-revealed')).toHaveLength(1)
    expect(leaflet.fitBounds).toHaveBeenLastCalledWith(expect.any(Array), expect.objectContaining({ animate: false, maxZoom: 17 }))
  })

  it('remounts the target geometry for a new question and keeps generic local credits deduplicated', () => {
    const liechtenstein = getCountryShape(shapes, 'LIE')!
    const monaco = getCountryShape(shapes, 'MCO')!
    const singapore = getCountryShape(shapes, 'SGP')!
    const { container, rerender } = render(<NeighbourProgressMap targetShape={liechtenstein} layers={[{ shape: monaco, status: 'found' }]} questionKey="one" recenterVersion={0} />)
    const targetBefore = container.querySelector('.neighbour-map-target')?.getAttribute('data-geometry')
    expect(screen.getByRole('link', { name: 'geoBoundaries' }).getAttribute('href')).toBe('/geoquiz/country-shape-credits.html')
    expect((container.textContent?.match(/ODbL 1\.0/g) ?? [])).toHaveLength(1)
    expect(screen.getByRole('link', { name: '© OpenStreetMap contributors' }).getAttribute('href')).toBe('https://www.openstreetmap.org/copyright')
    expect(container.innerHTML).not.toContain('LIE')
    expect(container.innerHTML).not.toContain('MCO')
    rerender(<NeighbourProgressMap targetShape={singapore} layers={[]} questionKey="two" recenterVersion={0} />)
    expect(container.querySelector('.neighbour-map-target')?.getAttribute('data-geometry')).not.toBe(targetBefore)
    expect((container.textContent?.match(/ODbL 1\.0/g) ?? [])).toHaveLength(1)
    expect(screen.queryByRole('link', { name: '© OpenStreetMap contributors' })).toBeNull()
    expect(container.innerHTML).not.toContain('SGP')
  })
})
