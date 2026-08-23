import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

vi.mock('./quizzes/capital-map/CapitalMapQuiz', () => ({ default: () => <main><h1>Capital map mock</h1></main> }))

function setHash(hash: string) {
  window.location.hash = hash
  fireEvent(window, new HashChangeEvent('hashchange'))
}

afterEach(() => { setHash('#/quizzes') })

describe('App quiz hub navigation', () => {
  it('keeps Capital dots on the landing route and places the chooser on its own stable route', async () => {
    setHash('#/')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Capital map mock' })).toBeTruthy()
    expect(document.title).toBe('Geoquiz — Capital dots')
    expect(document.querySelector('.capital-map-frame')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'All quizzes' }).getAttribute('href')).toBe('#/quizzes')

    setHash('#/quizzes')
    const hubHeading = screen.getByRole('heading', { name: 'Choose a quiz' })
    expect(hubHeading).toBeTruthy()
    expect(document.activeElement).toBe(hubHeading)
    expect(document.title).toBe('Geoquiz — All quizzes')
    expect(document.querySelector('.capital-map-frame')).toBeNull()
    expect(screen.getByRole('link', { name: /^Capital dots/ }).getAttribute('href')).toBe('#/')
    expect(screen.getByRole('link', { name: /^Country capitals/ }).getAttribute('href')).toBe('#/country-capital')
    expect(screen.getByRole('link', { name: /^Shape capitals/ }).getAttribute('href')).toBe('#/shape-capital')
    expect(screen.getByRole('link', { name: /^Shape neighbours/ }).getAttribute('href')).toBe('#/shape-neighbours')
    expect(screen.getByRole('link', { name: /^Shape highest points/ }).getAttribute('href')).toBe('#/shape-high-point')
    expect(screen.getByRole('link', { name: /^Flag countries/ }).getAttribute('href')).toBe('#/flag-country')
    setHash('#/not-a-quiz')
    const notFoundHeading = screen.getByRole('heading', { name: 'Quiz not found' })
    expect(notFoundHeading).toBeTruthy()
    expect(document.activeElement).toBe(notFoundHeading)
    expect(notFoundHeading.closest('main')?.classList.contains('not-found')).toBe(true)
    expect(document.title).toBe('Geoquiz — Quiz not found')
    expect(screen.getByRole('link', { name: 'All quizzes' }).getAttribute('href')).toBe('#/quizzes')
  })

  it('loads the real country-capital route and updates the route title', async () => {
    setHash('#/country-capital')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Country capitals' })).toBeTruthy()
    expect(document.title).toBe('Geoquiz — Country capitals')
    expect(screen.getByRole('link', { name: 'All quizzes' }).getAttribute('href')).toBe('#/quizzes')
  })

  it('loads the capital-map route without retaining country-capital route state', async () => {
    setHash('#/capital-map')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Capital map mock' })).toBeTruthy()
    expect(document.title).toBe('Geoquiz — Capital dots')
    expect(screen.queryByRole('heading', { name: 'Country capitals' })).toBeNull()
  })

  it('updates the rendered route when the browser moves through hash history', async () => {
    setHash('#/country-capital')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Country capitals' })).toBeTruthy()

    window.location.hash = '#/quizzes'
    fireEvent(window, new PopStateEvent('popstate'))
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(screen.getByRole('heading', { name: 'Choose a quiz' })).toBeTruthy()

    window.location.hash = '#/'
    fireEvent(window, new PopStateEvent('popstate'))
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(await screen.findByRole('heading', { name: 'Capital map mock' })).toBeTruthy()
  })

  it('loads the lazy shape-capital route and updates the route title', async () => {
    setHash('#/shape-capital')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Shape capitals' })).toBeTruthy()
    expect(document.title).toBe('Geoquiz — Shape capitals')
  })

  it('loads the lazy shape-neighbours route and updates the route title', async () => {
    setHash('#/shape-neighbours')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Shape neighbours' })).toBeTruthy()
    expect(document.title).toBe('Geoquiz — Shape neighbours')
  })

  it('loads the lazy shape-high-point route and updates the route title', async () => {
    setHash('#/shape-high-point')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Shape highest points' })).toBeTruthy()
    expect(document.title).toBe('Geoquiz — Shape highest points')
  })

  it('loads the lazy flag-country route and updates the route title', async () => {
    setHash('#/flag-country')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Flag quiz' })).toBeTruthy()
    expect(document.title).toBe('Geoquiz — Flag countries')
  })
})
