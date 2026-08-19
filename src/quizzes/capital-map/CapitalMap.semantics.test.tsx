import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Capital } from '../../core/capital'
import { CapitalMap } from './CapitalMap'
import { MAP_LABEL } from './mapViewport'

vi.mock('react-leaflet', () => {
  const map = {
    fitBounds: vi.fn(),
    getContainer: () => document.querySelector('.capital-map') as HTMLElement,
  }
  return {
    MapContainer: ({ children, className }: { children: ReactNode; className: string }) => <div className={className}>{children}</div>,
    CircleMarker: () => null,
    useMap: () => map,
  }
})

const capital: Capital = {
  id: 'oslo', capital: 'Oslo', latitude: 59.91, longitude: 10.75, aliases: [], coordinateSource: 'test', checked: '2026-08-19',
  entities: [{ code: 'NOR', country: 'Norway', sourceRef: 'test', checked: '2026-08-19' }],
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true }), writable: true })
})

describe('CapitalMap semantics', () => {
  it('labels both the map region and Leaflet container', () => {
    render(<CapitalMap capitals={[capital]} target={capital} questionNumber={0} />)
    expect(screen.getByRole('region', { name: MAP_LABEL })).toBeTruthy()
    expect(document.querySelector('.capital-map')?.getAttribute('role')).toBe('application')
    expect(document.querySelector('.capital-map')?.getAttribute('aria-label')).toBe(MAP_LABEL)
  })
})
