import { render, screen } from '@testing-library/react'
import dataset from '../data/country-shapes.json' with { type: 'json' }
import * as countryShapes from '../core/countryShapes'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CountryShapeAttribution, CountrySilhouette } from './CountrySilhouette'
import type { CountryShapeDataset } from '../core/countryShapes'

const shape = {
  bounds: [0, 0, 10, 10] as const,
  viewBox: [0, 0, 10, 10] as const,
  polygons: [[[0, 0, 10000, 0, 0, 10000, -10000, 0], [2000, 2000, 6000, 0, 0, 6000, -6000, 0]]],
}
const generatedShapes = dataset as unknown as CountryShapeDataset

describe('CountrySilhouette', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders generic, non-interactive SVG semantics without leaking the shape code', () => {
    render(<CountrySilhouette shape={shape} className="test-shape" />)
    const image = screen.getByRole('img', { name: 'Country silhouette' })
    expect(image.getAttribute('class')).toBe('test-shape')
    expect(image.getAttribute('tabindex')).toBeNull()
    expect(image.outerHTML).not.toContain('NOR')
    expect(image.querySelectorAll('path')).toHaveLength(1)
    expect(image.querySelector('path')?.getAttribute('d')).toContain('Z M')
    expect(image.getAttribute('stroke')).toBeNull()
    expect(image.getAttribute('stroke-width')).toBeNull()
    expect(image.querySelector('path')?.getAttribute('stroke')).toBe('#5f7ca9')
    expect(image.querySelector('path')?.getAttribute('stroke-width')).toBe('1.25px')
    expect(image.querySelector('path')?.getAttribute('vector-effect')).toBe('non-scaling-stroke')
    expect(image.querySelector('g')?.getAttribute('fill-rule')).toBe('evenodd')
  })

  it('uses the same stable screen-space outline for compact and true-extent generated shapes', () => {
    for (const code of ['MCO', 'VAT', 'TUV', 'MDV', 'KIR'] as const) {
      const countryShape = generatedShapes.shapes[code]
      const { container, unmount } = render(<CountrySilhouette shape={countryShape} />)
      const image = container.querySelector('svg')!
      const paths = Array.from(image.querySelectorAll('path'))
      expect(paths).toHaveLength(countryShapes.decodeShapePaths(countryShape).length)
      expect(paths.map((path) => path.getAttribute('d'))).toEqual(countryShapes.decodeShapePaths(countryShape))
      for (const path of paths) {
        expect(path.getAttribute('stroke')).toBe('#5f7ca9')
        expect(path.getAttribute('stroke-width')).toBe('1.25px')
        expect(path.getAttribute('vector-effect')).toBe('non-scaling-stroke')
      }
      expect(image.getAttribute('stroke-width')).toBeNull()
      unmount()
    }
  })

  it('allows a caller-provided generic accessible label', () => {
    render(<CountrySilhouette shape={shape} accessibleLabel="Quiz shape" />)
    expect(screen.getByRole('img', { name: 'Quiz shape' })).toBeTruthy()
  })

  it('does not decode the silhouette again when its stable props survive a parent rerender', () => {
    const decode = vi.spyOn(countryShapes, 'decodeShapePaths')
    const { rerender } = render(<CountrySilhouette shape={shape} className="test-shape" />)
    rerender(<CountrySilhouette shape={shape} className="test-shape" />)
    expect(decode).toHaveBeenCalledTimes(1)
  })

  it('renders only the required visible geoBoundaries credits for an attributed override', () => {
    const { rerender } = render(<CountryShapeAttribution shape={{ ...shape, attribution: { provider: 'geoBoundaries', licenseLabel: 'ODbL 1.0', osmContributors: true } }} />)
    expect(screen.getByText('Shape:', { exact: false })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'geoBoundaries' }).getAttribute('href')).toBe('/geoquiz/country-shape-credits.html')
    expect(screen.getByText(/ODbL 1\.0/)).toBeTruthy()
    expect(screen.getByRole('link', { name: '© OpenStreetMap contributors' }).getAttribute('href')).toBe('https://www.openstreetmap.org/copyright')
    rerender(<CountryShapeAttribution shape={shape} />)
    expect(screen.queryByText('Shape:', { exact: false })).toBeNull()
  })

  it('does not infer an OpenStreetMap credit from an ODbL licence alone', () => {
    render(<CountryShapeAttribution shape={{ ...shape, attribution: { provider: 'geoBoundaries', licenseLabel: 'ODbL 1.0', osmContributors: false } }} />)
    expect(screen.getByRole('link', { name: 'geoBoundaries' }).getAttribute('href')).toBe('/geoquiz/country-shape-credits.html')
    expect(screen.queryByRole('link', { name: '© OpenStreetMap contributors' })).toBeNull()
  })
})
