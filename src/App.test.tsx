import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

vi.mock('./quizzes/capital-map/CapitalMapQuiz', () => ({ default: () => <main><h1>Capital map mock</h1><input aria-label="Capital answer" /></main> }))

function setHash(hash: string) {
  window.location.hash = hash
  fireEvent(window, new HashChangeEvent('hashchange'))
}

afterEach(() => { setHash('#/') })

describe('App quiz menu navigation', () => {
  it('opens a modal over the mounted quiz without changing its route, and restores menu-button focus on close', async () => {
    setHash('#/country-capital')
    render(<App />)
    await screen.findByRole('heading', { name: 'Country capitals' })
    const opener = screen.getByRole('button', { name: 'All quizzes' })
    opener.focus()
    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Choose a quiz' })
    expect(dialog).toBeTruthy()
    expect(window.location.hash).toBe('#/country-capital')
    expect(screen.getByRole('heading', { name: 'Country capitals' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Country capitals.*Current quiz/ }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('dialog', { hidden: true }).querySelector('button[aria-label="Close quiz menu"]')!)
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('uses Escape and current-quiz selection to close the dialog without route changes', async () => {
    setHash('#/')
    render(<App />)
    await screen.findByRole('heading', { name: 'Capital map mock' })
    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    fireEvent(screen.getByRole('dialog', { name: 'Choose a quiz' }), new Event('cancel', { cancelable: true }))
    expect(window.location.hash).toBe('#/')
    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    fireEvent.click(screen.getByRole('button', { name: /Capital dots.*Current quiz/ }))
    expect(window.location.hash).toBe('#/')
  })

  it('navigates only after choosing a different quiz', async () => {
    setHash('#/')
    render(<App />)
    await screen.findByRole('heading', { name: 'Capital map mock' })
    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    fireEvent.click(screen.getByRole('button', { name: /Flag countries/ }))
    expect(window.location.hash).toBe('#/flag-country')
    expect(await screen.findByRole('heading', { name: 'Flag quiz' })).toBeTruthy()
  })

  it('opens the lazy Country borders route from the modal menu with its route title and heading', async () => {
    setHash('#/')
    render(<App />)
    await screen.findByRole('heading', { name: 'Capital map mock' })
    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    fireEvent.click(screen.getByRole('button', { name: /Country borders/ }))
    expect(window.location.hash).toBe('#/border-countries')
    expect(await screen.findByRole('heading', { name: 'Country borders' })).toBeTruthy()
    expect(document.title).toBe('Geoquiz — Country borders')
  })

  it('marks only the Shape Neighbours active route for its desktop rail/card composition', async () => {
    setHash('#/shape-neighbours')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Shape neighbours' })).toBeTruthy()
    expect(document.querySelector('.app-frame.shape-neighbours-frame')).toBeTruthy()
    expect(document.querySelector('.app-frame.shape-neighbours-frame .shape-neighbours-shell')).toBeTruthy()
  })

  it('loads exact DEV China and Colombia QA hashes through their actual lazy routes instead of Not Found', async () => {
    cleanup()
    setHash('#/shape-neighbours?qa=china')
    render(<App />)
    expect(await screen.findByText('14 remaining')).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'Neighbour map' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Quiz not found' })).toBeNull()

    cleanup()
    setHash('#/shape-high-point?qa=colombia')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Reveal answer' }))
    expect(await screen.findByText('Pico Simón Bolívar')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Quiz not found' })).toBeNull()
  })

  it('loads the exact DEV multi-run Hard border fixture through the actual lazy route', async () => {
    cleanup()
    setHash('#/border-countries?qa=hard-multi')
    render(<App />)
    expect(await screen.findByText('2 border sections')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Which countries share this border?' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Quiz not found' })).toBeNull()
  })

  it('canonicalizes the legacy chooser hash to the landing route and opens the modal', async () => {
    cleanup()
    window.history.pushState(window.history.state, '', '#/quizzes')
    const historyLength = window.history.length
    const replaceState = vi.spyOn(window.history, 'replaceState')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Capital map mock' })).toBeTruthy()
    expect(window.location.hash).toBe('#/')
    expect(replaceState).toHaveBeenCalledTimes(1)
    expect(window.history.length).toBe(historyLength)
    const dialog = screen.getByRole('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    expect(dialog.getAttribute('aria-labelledby')).toBe('quiz-menu-title')
    expect(document.title).toBe('Geoquiz — Capital dots')
    fireEvent.click(dialog.querySelector('button[aria-label="Close quiz menu"]')!)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'All quizzes' })))
  })

  it('promotes every opening to a native modal and closes it before the next opening', async () => {
    const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
    const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
    const showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', '') })
    const close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) })
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: showModal })
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: close })
    try {
      setHash('#/')
      render(<App />)
      await screen.findByRole('heading', { name: 'Capital map mock' })
      fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
      expect(showModal).toHaveBeenCalledTimes(1)
      fireEvent.click(screen.getByRole('button', { name: 'Close quiz menu' }))
      expect(close).toHaveBeenCalledTimes(1)
      fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
      expect(showModal).toHaveBeenCalledTimes(2)
    } finally {
      if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal)
      else delete (HTMLDialogElement.prototype as { showModal?: unknown }).showModal
      if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose)
      else delete (HTMLDialogElement.prototype as { close?: unknown }).close
    }
  })

  it('keeps legacy capital-map and unknown routes recoverable without a chooser page', async () => {
    setHash('#/capital-map')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Capital map mock' })).toBeTruthy()
    setHash('#/not-a-quiz')
    expect(screen.getByRole('heading', { name: 'Quiz not found' })).toBeTruthy()
    const notFoundOpener = screen.getByRole('button', { name: 'Open quiz menu' })
    fireEvent.click(notFoundOpener)
    expect(screen.getByRole('dialog', { name: 'Choose a quiz' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close quiz menu' }))
    await waitFor(() => expect(document.activeElement).toBe(notFoundOpener))
    fireEvent.click(notFoundOpener)
    fireEvent(screen.getByRole('dialog', { name: 'Choose a quiz' }), new Event('cancel', { cancelable: true }))
    await waitFor(() => expect(document.activeElement).toBe(notFoundOpener))
    expect(screen.queryByText('Focused, local-first exercises for learning world geography.')).toBeNull()
  })

  it('synchronizes representative lazy routes and titles when hash history changes', async () => {
    setHash('#/shape-high-point')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Shape highest points' })).toBeTruthy()
    expect(document.title).toBe('Geoquiz — Shape highest points')
    setHash('#/flag-country')
    expect(await screen.findByRole('heading', { name: 'Flag quiz' })).toBeTruthy()
    expect(document.title).toBe('Geoquiz — Flag countries')
  })
})
