import { describe, expect, it } from 'vitest'
import { routeFromHash } from './appRoute'

describe('hash routes', () => {
  it('keeps the landing quiz, hub, quiz routes, and an accessible unknown-route state distinct', () => {
    expect(routeFromHash('')).toBe('capital-map')
    expect(routeFromHash('#/')).toBe('capital-map')
    expect(routeFromHash('#/quizzes')).toBe('hub')
    expect(routeFromHash('#/capital-map')).toBe('capital-map')
    expect(routeFromHash('#/country-capital')).toBe('country-capital')
    expect(routeFromHash('#/shape-capital')).toBe('shape-capital')
    expect(routeFromHash('#/shape-neighbours')).toBe('shape-neighbours')
    expect(routeFromHash('#/shape-high-point')).toBe('shape-high-point')
    expect(routeFromHash('#/flag-country')).toBe('flag-country')
    expect(routeFromHash('#/missing')).toBe('not-found')
  })
})
