import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Capital } from '../../core/capital'
import { CapitalMap } from './CapitalMap'
import { COUNTRY_OUTLINES_PANE, COUNTRY_OUTLINES_PANE_Z_INDEX } from './countryBoundaries'
import { MAP_LABEL } from './mapViewport'

const leaflet = vi.hoisted(() => ({
  flyTo: vi.fn(),
  getSize: vi.fn(),
  reducedMotion: true,
  setView: vi.fn(),
  stop: vi.fn(),
}))

vi.mock('react-leaflet', () => {
  const map = {
    flyTo: leaflet.flyTo,
    getContainer: () => document.querySelector('.capital-map') as HTMLElement,
    getSize: leaflet.getSize,
    setView: leaflet.setView,
    stop: leaflet.stop,
  }
  return {
    MapContainer: ({ children, className }: { children: ReactNode; className: string }) => <div className={className}>{children}</div>,
    CircleMarker: ({ children }: { children?: ReactNode }) => <div data-testid="capital-marker">{children}</div>,
    GeoJSON: ({ data, interactive }: { data: { type: string }; interactive: boolean }) => (
      <div data-testid="country-boundaries" data-geometry-type={data.type} data-interactive={String(interactive)} />
    ),
    Pane: ({ children, name, style }: { children: ReactNode; name: string; style: { zIndex: number } }) => (
      <div data-testid="country-boundaries-pane" data-pane={name} data-z-index={style.zIndex}>{children}</div>
    ),
    Tooltip: ({ children, className, direction, interactive, permanent }: {
      children: ReactNode
      className: string
      direction: string
      interactive: boolean
      permanent: boolean
    }) => (
      <span
        data-testid="capital-name-label"
        data-class-name={className}
        data-direction={direction}
        data-interactive={String(interactive)}
        data-permanent={String(permanent)}
      >
        {children}
      </span>
    ),
    useMap: () => map,
  }
})

const capital: Capital = {
  id: 'oslo', capital: 'Oslo', latitude: 59.91, longitude: 10.75, aliases: [], coordinateSource: 'test', checked: '2026-08-19',
  entities: [{ code: 'NOR', country: 'Norway', sourceRef: 'test', checked: '2026-08-19' }],
}

const secondCapital: Capital = {
  ...capital,
  id: 'suva', capital: 'Suva', latitude: -18.14, longitude: 178.43,
}

beforeEach(() => {
  leaflet.reducedMotion = true
  leaflet.getSize.mockReturnValue({ x: 640, y: 640 })
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: leaflet.reducedMotion }), writable: true })
  leaflet.flyTo.mockClear()
  leaflet.setView.mockClear()
  leaflet.stop.mockClear()
})

describe('CapitalMap semantics', () => {
  it('labels both the map region and Leaflet container', () => {
    render(<CapitalMap capitals={[capital]} target={capital} questionNumber={0} />)
    expect(screen.getByRole('region', { name: MAP_LABEL })).toBeTruthy()
    expect(document.querySelector('.capital-map')?.getAttribute('role')).toBe('application')
    expect(document.querySelector('.capital-map')?.getAttribute('aria-label')).toBe(MAP_LABEL)
  })

  it('focuses the initial target and each next target with an immediate compact view for reduced motion', () => {
    const { rerender } = render(<CapitalMap capitals={[capital, secondCapital]} target={capital} questionNumber={0} />)

    expect(leaflet.stop).toHaveBeenCalledTimes(1)
    expect(leaflet.setView).toHaveBeenLastCalledWith([59.91, 10.75], 3, { animate: false })
    expect(leaflet.flyTo).not.toHaveBeenCalled()

    rerender(<CapitalMap capitals={[capital, secondCapital]} target={secondCapital} questionNumber={1} />)
    expect(leaflet.stop).toHaveBeenCalledTimes(2)
    expect(leaflet.setView).toHaveBeenLastCalledWith([-18.14, 178.43], 3, { animate: false })
  })

  it('flies to a wide target view when motion is allowed', () => {
    leaflet.reducedMotion = false
    leaflet.getSize.mockReturnValue({ x: 900, y: 600 })

    render(<CapitalMap capitals={[capital]} target={capital} questionNumber={0} />)

    expect(leaflet.stop).toHaveBeenCalledTimes(1)
    expect(leaflet.flyTo).toHaveBeenCalledWith([59.91, 10.75], 4)
    expect(leaflet.setView).not.toHaveBeenCalled()
  })

  it('keeps display aids off by default, then toggles them without refocusing or resetting the map', () => {
    render(<CapitalMap capitals={[capital, secondCapital]} target={capital} questionNumber={0} />)

    const mapContainer = document.querySelector('.capital-map')
    const outlinesToggle = screen.getByRole('switch', { name: 'Country outlines' })
    const namesToggle = screen.getByRole('switch', { name: 'Capital names' })
    expect(outlinesToggle.getAttribute('aria-checked')).toBe('false')
    expect(namesToggle.getAttribute('aria-checked')).toBe('false')
    expect(within(outlinesToggle).getByText('Off')).toBeTruthy()
    expect(within(namesToggle).getByText('Off')).toBeTruthy()
    expect(screen.queryByTestId('country-boundaries')).toBeNull()
    expect(screen.queryAllByTestId('capital-name-label')).toHaveLength(0)
    expect(screen.getAllByTestId('capital-marker')).toHaveLength(3)
    expect(leaflet.stop).toHaveBeenCalledTimes(1)
    expect(leaflet.setView).toHaveBeenCalledTimes(1)

    fireEvent.click(outlinesToggle)
    expect(outlinesToggle.getAttribute('aria-checked')).toBe('true')
    expect(within(outlinesToggle).getByText('On')).toBeTruthy()
    expect(document.querySelector('.capital-map')).toBe(mapContainer)
    expect(screen.getAllByTestId('capital-marker')).toHaveLength(3)
    expect(leaflet.stop).toHaveBeenCalledTimes(1)
    expect(leaflet.setView).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('country-boundaries-pane').getAttribute('data-pane')).toBe(COUNTRY_OUTLINES_PANE)
    expect(screen.getByTestId('country-boundaries-pane').getAttribute('data-z-index')).toBe(String(COUNTRY_OUTLINES_PANE_Z_INDEX))
    // Leaflet's default overlay pane is z-index 400, where dots and halo render.
    expect(Number(screen.getByTestId('country-boundaries-pane').getAttribute('data-z-index'))).toBeLessThan(400)
    expect(screen.getByTestId('country-boundaries').getAttribute('data-geometry-type')).toBe('MultiLineString')
    expect(screen.getByTestId('country-boundaries').getAttribute('data-interactive')).toBe('false')

    fireEvent.click(namesToggle)
    expect(namesToggle.getAttribute('aria-checked')).toBe('true')
    expect(outlinesToggle.getAttribute('aria-checked')).toBe('true')
    expect(within(namesToggle).getByText('On')).toBeTruthy()
    expect(document.querySelector('.capital-map')).toBe(mapContainer)
    expect(screen.getAllByTestId('capital-marker')).toHaveLength(3)
    expect(screen.getAllByTestId('capital-name-label')).toHaveLength(2)
    expect(screen.getByText('Oslo')).toBeTruthy()
    expect(screen.getByText('Suva')).toBeTruthy()
    expect(screen.getAllByTestId('capital-name-label')).toEqual(expect.arrayContaining([
      expect.objectContaining({ textContent: 'Oslo' }),
      expect.objectContaining({ textContent: 'Suva' }),
    ]))
    for (const label of screen.getAllByTestId('capital-name-label')) {
      expect(label.getAttribute('data-permanent')).toBe('true')
      expect(label.getAttribute('data-interactive')).toBe('false')
      expect(label.getAttribute('data-direction')).toBe('right')
      expect(label.getAttribute('data-class-name')).toBe('capital-name-label')
    }
    expect(leaflet.stop).toHaveBeenCalledTimes(1)
    expect(leaflet.setView).toHaveBeenCalledTimes(1)
    expect(leaflet.flyTo).not.toHaveBeenCalled()

    fireEvent.click(namesToggle)
    expect(namesToggle.getAttribute('aria-checked')).toBe('false')
    expect(outlinesToggle.getAttribute('aria-checked')).toBe('true')
    expect(within(namesToggle).getByText('Off')).toBeTruthy()
    expect(screen.queryAllByTestId('capital-name-label')).toHaveLength(0)
    expect(document.querySelector('.capital-map')).toBe(mapContainer)
    expect(screen.getAllByTestId('capital-marker')).toHaveLength(3)
    expect(leaflet.stop).toHaveBeenCalledTimes(1)
    expect(leaflet.setView).toHaveBeenCalledTimes(1)

    fireEvent.click(outlinesToggle)
    expect(outlinesToggle.getAttribute('aria-checked')).toBe('false')
    expect(within(outlinesToggle).getByText('Off')).toBeTruthy()
    expect(screen.queryByTestId('country-boundaries')).toBeNull()
    expect(screen.getAllByTestId('capital-marker')).toHaveLength(3)
    expect(leaflet.stop).toHaveBeenCalledTimes(1)
    expect(leaflet.setView).toHaveBeenCalledTimes(1)
  })
})
