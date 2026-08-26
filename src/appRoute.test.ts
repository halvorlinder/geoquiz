import { describe, expect, it } from 'vitest'
import { legacyHashRoute, routeFromHash, routeFromPath, routeMetadata } from './appRoute'

describe('canonical quiz routes', () => {
  it('maps exactly the seven emitted canonical paths and keeps unknown paths recoverable', () => {
    expect(routeFromPath('/geoquiz/')).toBe('capital-map')
    expect(routeFromPath('/geoquiz/country-capital/')).toBe('country-capital')
    expect(routeFromPath('/geoquiz/shape-capital/')).toBe('shape-capital')
    expect(routeFromPath('/geoquiz/shape-neighbours/')).toBe('shape-neighbours')
    expect(routeFromPath('/geoquiz/shape-high-point/')).toBe('shape-high-point')
    expect(routeFromPath('/geoquiz/flag-country/')).toBe('flag-country')
    expect(routeFromPath('/geoquiz/border-countries/')).toBe('border-countries')
    expect(routeFromPath('/geoquiz/missing/')).toBe('not-found')
  })

  it('keeps legacy hashes compatible while identifying their replacement route', () => {
    expect(routeFromHash('')).toBe('capital-map')
    expect(routeFromHash('#/')).toBe('capital-map')
    expect(routeFromHash('#/quizzes')).toBe('capital-map')
    expect(routeFromHash('#/capital-map')).toBe('capital-map')
    expect(routeFromHash('#/country-capital')).toBe('country-capital')
    expect(routeFromHash('#/shape-capital')).toBe('shape-capital')
    expect(routeFromHash('#/shape-neighbours')).toBe('shape-neighbours')
    expect(routeFromHash('#/shape-neighbours?qa=china')).toBe('shape-neighbours')
    expect(routeFromHash('#/shape-high-point')).toBe('shape-high-point')
    expect(routeFromHash('#/flag-country')).toBe('flag-country')
    expect(routeFromHash('#/shape-high-point?qa=colombia')).toBe('shape-high-point')
    expect(routeFromHash('#/shape-neighbours?qa=russia')).toBe('not-found')
    expect(routeFromHash('#/shape-neighbours?qa=china&extra=1')).toBe('not-found')
    expect(routeFromHash('#/shape-high-point?qa=russia')).toBe('not-found')
    expect(routeFromHash('#/flag-country?qa=brazil')).toBe('not-found')
    expect(routeFromHash('#/border-countries')).toBe('border-countries')
    for (const fixture of ['esp-fra','esp-mar','can-usa','arm-aze','hard-multi']) expect(routeFromHash(`#/border-countries?qa=${fixture}`)).toBe('border-countries')
    expect(routeFromHash('#/border-countries?qa=unknown')).toBe('not-found')
    expect(routeFromHash('#/border-countries?qa=esp-mar&extra=1')).toBe('not-found')
    expect(routeFromHash('#/missing')).toBe('not-found')
    expect(legacyHashRoute('#/capital-map')).toBe('capital-map')
    expect(legacyHashRoute('#/flag-country')).toBe('flag-country')
    expect(legacyHashRoute('#/quizzes')).toBeNull()
  })

  it('defines indexable absolute metadata for every canonical quiz route', () => {
    for (const [route, metadata] of Object.entries(routeMetadata)) {
      if (route === 'not-found') continue
      expect(metadata.indexable).toBe(true)
      expect(metadata.path).toMatch(/^\/geoquiz\/(?:[a-z-]+\/)?$/)
      expect(metadata.canonicalUrl).toBe(`https://halvorlinder.github.io${metadata.path}`)
      expect(metadata.title).not.toBe('')
      expect(metadata.description).not.toBe('')
    }
  })
})
