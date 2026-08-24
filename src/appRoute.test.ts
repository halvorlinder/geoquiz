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
    expect(routeFromHash('#/shape-high-point')).toBe('shape-high-point')
    expect(routeFromHash('#/flag-country')).toBe('flag-country')
    expect(routeFromHash('#/border-countries')).toBe('border-countries')
    expect(routeFromHash('#/missing')).toBe('not-found')
  })
})
