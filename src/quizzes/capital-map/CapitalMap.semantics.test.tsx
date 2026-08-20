import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Capital } from '../../core/capital'
import { CapitalMap } from './CapitalMap'
import { COUNTRY_OUTLINES_PANE, COUNTRY_OUTLINES_PANE_Z_INDEX } from './countryBoundaries'
import { MAP_LABEL } from './mapViewport'

const leaflet = vi.hoisted(() => ({ fitBounds: vi.fn() }))

vi.mock('react-leaflet', () => {
  const map = {
    fitBounds: leaflet.fitBounds,
    getContainer: () => document.querySelector('.capital-map') as HTMLElement,
  }
  return {
    MapContainer: ({ children, className }: { children: ReactNode; className: string }) => <div className={className}>{children}</div>,
    CircleMarker: () => <div data-testid="capital-marker" />,
    GeoJSON: ({ data, interactive }: { data: { type: string }; interactive: boolean }) => (
      <div data-testid="country-boundaries" data-geometry-type={data.type} data-interactive={String(interactive)} />
    ),
    Pane: ({ children, name, style }: { children: ReactNode; name: string; style: { zIndex: number } }) => (
      <div data-testid="country-boundaries-pane" data-pane={name} data-z-index={style.zIndex}>{children}</div>
    ),
    useMap: () => map,
  }
})

const capital: Capital = {
  id: 'oslo', capital: 'Oslo', latitude: 59.91, longitude: 10.75, aliases: [], coordinateSource: 'test', checked: '2026-08-19',
  entities: [{ code: 'NOR', country: 'Norway', sourceRef: 'test', checked: '2026-08-19' }],
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true }), writable: true })
  leaflet.fitBounds.mockClear()
})

describe('CapitalMap semantics', () => {
  it('labels both the map region and Leaflet container', () => {
    render(<CapitalMap capitals={[capital]} target={capital} questionNumber={0} />)
    expect(screen.getByRole('region', { name: MAP_LABEL })).toBeTruthy()
    expect(document.querySelector('.capital-map')?.getAttribute('role')).toBe('application')
    expect(document.querySelector('.capital-map')?.getAttribute('aria-label')).toBe(MAP_LABEL)
  })

  it('keeps outlines off by default, then toggles one non-interactive layer without resetting the map', () => {
    render(<CapitalMap capitals={[capital]} target={capital} questionNumber={0} />)

    const mapContainer = document.querySelector('.capital-map')
    const toggle = screen.getByRole('switch', { name: 'Country outlines' })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByText('Off')).toBeTruthy()
    expect(screen.queryByTestId('country-boundaries')).toBeNull()
    expect(screen.getAllByTestId('capital-marker')).toHaveLength(2)
    expect(leaflet.fitBounds).toHaveBeenCalledTimes(1)

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('On')).toBeTruthy()
    expect(document.querySelector('.capital-map')).toBe(mapContainer)
    expect(screen.getAllByTestId('capital-marker')).toHaveLength(2)
    expect(leaflet.fitBounds).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('country-boundaries-pane').getAttribute('data-pane')).toBe(COUNTRY_OUTLINES_PANE)
    expect(screen.getByTestId('country-boundaries-pane').getAttribute('data-z-index')).toBe(String(COUNTRY_OUTLINES_PANE_Z_INDEX))
    // Leaflet's default overlay pane is z-index 400, where dots and halo render.
    expect(Number(screen.getByTestId('country-boundaries-pane').getAttribute('data-z-index'))).toBeLessThan(400)
    expect(screen.getByTestId('country-boundaries').getAttribute('data-geometry-type')).toBe('MultiLineString')
    expect(screen.getByTestId('country-boundaries').getAttribute('data-interactive')).toBe('false')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByText('Off')).toBeTruthy()
    expect(screen.queryByTestId('country-boundaries')).toBeNull()
    expect(screen.getAllByTestId('capital-marker')).toHaveLength(2)
    expect(leaflet.fitBounds).toHaveBeenCalledTimes(1)
  })
})
