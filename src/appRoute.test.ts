import { describe, expect, it } from 'vitest'
import { routeFromHash } from './appRoute'

describe('hash routes', () => {
  it('keeps the landing quiz, compatible legacy menu hash, quiz routes, and unknown-route state distinct', () => {
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
  })
})
