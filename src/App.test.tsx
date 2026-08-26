import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routeMetadata } from './appRoute'
import { App } from './App'

vi.mock('./quizzes/capital-map/CapitalMapQuiz', () => ({ default: () => <main><h1>Capital map mock</h1><input aria-label="Capital answer" /></main> }))

function setPath(path: string) {
  window.history.replaceState(window.history.state, '', path)
  fireEvent.popState(window)
}

async function expectRoute(route: keyof typeof routeMetadata, heading: string) {
  expect(await screen.findByRole('heading', { name: heading })).toBeTruthy()
  expect(window.location.pathname).toBe(routeMetadata[route].path)
  expect(document.title).toBe(routeMetadata[route].title)
  expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(routeMetadata[route].description)
  expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(routeMetadata[route].canonicalUrl)
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  expect((screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).open).toBe(false)
}

afterEach(() => {
  cleanup()
  setPath('/geoquiz/')
  document.head.querySelector('meta[name="robots"]')?.remove()
})

describe('App quiz menu navigation', () => {
  it('opens a modal over the mounted quiz and restores menu-button focus on close', async () => {
    setPath('/geoquiz/country-capital/')
    render(<App />)
    await screen.findByRole('heading', { name: 'Country capitals' })
    const opener = screen.getByRole('button', { name: 'All quizzes' })
    opener.focus()
    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Choose a quiz' })
    expect(window.location.pathname).toBe('/geoquiz/country-capital/')
    expect(screen.getByRole('heading', { name: 'Country capitals' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Country capitals.*Current quiz/ }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(dialog.querySelector('button[aria-label="Close quiz menu"]')!)
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })

  it('uses Escape and current-quiz selection to close without route changes', async () => {
    setPath('/geoquiz/')
    render(<App />)
    await screen.findByRole('heading', { name: 'Capital map mock' })
    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    fireEvent(screen.getByRole('dialog', { name: 'Choose a quiz' }), new Event('cancel', { cancelable: true }))
    expect(window.location.pathname).toBe('/geoquiz/')
    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    fireEvent.click(screen.getByRole('link', { name: /Capital dots.*Current quiz/ }))
    expect(window.location.pathname).toBe('/geoquiz/')
  })

  it('opens the lazy Country borders route from a crawlable menu link with canonical metadata', async () => {
    setPath('/geoquiz/')
    render(<App />)
    await screen.findByRole('heading', { name: 'Capital map mock' })
    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    fireEvent.click(screen.getByRole('link', { name: /Country borders/ }))
    await expectRoute('border-countries', 'Country borders')
  })

  it('marks only the Shape Neighbours route for its desktop rail/card composition', async () => {
    setPath('/geoquiz/shape-neighbours/')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Shape neighbours' })).toBeTruthy()
    expect(document.querySelector('.app-frame.shape-neighbours-frame')).toBeTruthy()
    expect(document.querySelector('.app-frame.shape-neighbours-frame .shape-neighbours-shell')).toBeTruthy()
  })

  it('preserves exact DEV China and Colombia QA hashes for their lazy quiz fixtures', async () => {
    setPath('/geoquiz/#/shape-neighbours?qa=china')
    render(<App />)
    expect(await screen.findByText('14 remaining')).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'Neighbour map' })).toBeTruthy()
    expect(window.location.hash).toBe('#/shape-neighbours?qa=china')

    cleanup()
    setPath('/geoquiz/#/shape-high-point?qa=colombia')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Reveal answer' }))
    expect(await screen.findByText('Pico Simón Bolívar')).toBeTruthy()
    expect(window.location.hash).toBe('#/shape-high-point?qa=colombia')
  })

  it('preserves the exact DEV multi-run Hard border fixture hash', async () => {
    setPath('/geoquiz/#/border-countries?qa=hard-multi')
    render(<App />)
    expect(await screen.findByText('2 border sections')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Which countries share this border?' })).toBeTruthy()
    expect(window.location.hash).toBe('#/border-countries?qa=hard-multi')
  })

  it('promotes every opening to a native modal and closes it before the next opening', async () => {
    const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
    const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
    const showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', '') })
    const close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) })
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: showModal })
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: close })
    try {
      setPath('/geoquiz/')
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

  it('uses History API for ordinary menu choices and synchronizes metadata', async () => {
    setPath('/geoquiz/')
    render(<App />)
    await screen.findByRole('heading', { name: 'Capital map mock' })
    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    fireEvent.click(screen.getByRole('link', { name: /Flag countries/ }))
    expect(window.location.pathname).toBe('/geoquiz/flag-country/')
    expect(await screen.findByRole('heading', { name: 'Flag quiz' })).toBeTruthy()
    expect(document.title).toBe(routeMetadata['flag-country'].title)
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(routeMetadata['flag-country'].description)
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(routeMetadata['flag-country'].canonicalUrl)
  })

  it('keeps History API menu navigation synchronized through Back and Forward', async () => {
    setPath('/geoquiz/')
    render(<App />)
    await screen.findByRole('heading', { name: 'Capital map mock' })

    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    fireEvent.click(screen.getByRole('link', { name: /Country capitals/ }))
    await expectRoute('country-capital', 'Country capitals')

    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    fireEvent.click(screen.getByRole('link', { name: /Flag countries/ }))
    await expectRoute('flag-country', 'Flag quiz')

    window.history.back()
    await expectRoute('country-capital', 'Country capitals')
    await waitFor(() => expect(document.activeElement).toBe(screen.getAllByPlaceholderText('Type your answer')[0]))
    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    expect(screen.getByRole('link', { name: /Country capitals.*Current quiz/ }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('button', { name: 'Close quiz menu' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'All quizzes' })))

    window.history.forward()
    await expectRoute('flag-country', 'Flag quiz')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'country' })))
    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    expect(screen.getByRole('link', { name: /Flag countries.*Current quiz/ }).getAttribute('aria-current')).toBe('page')
  })

  it('keeps modified links native', async () => {
    setPath('/geoquiz/')
    render(<App />)
    await screen.findByRole('heading', { name: 'Capital map mock' })
    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    const link = screen.getByRole('link', { name: /Flag countries/ })
    link.addEventListener('click', (event) => event.preventDefault(), { once: true })
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 1 })
    link.dispatchEvent(event)
    expect(link.getAttribute('href')).toBe('/geoquiz/flag-country/')
    expect(window.location.pathname).toBe('/geoquiz/')
    expect((screen.getByRole('dialog') as HTMLDialogElement).open).toBe(true)
  })

  it('keeps a modified current-quiz link native instead of closing the dialog', async () => {
    setPath('/geoquiz/border-countries/')
    render(<App />)
    await screen.findByRole('heading', { name: 'Country borders' })
    fireEvent.click(screen.getByRole('button', { name: 'All quizzes' }))
    const link = screen.getByRole('link', { name: /Country borders.*Current quiz/ })
    link.addEventListener('click', (event) => event.preventDefault(), { once: true })
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, metaKey: true }))
    expect(link.getAttribute('href')).toBe('/geoquiz/border-countries/')
    expect(window.location.pathname).toBe('/geoquiz/border-countries/')
    expect((screen.getByRole('dialog') as HTMLDialogElement).open).toBe(true)
  })

  it('replaces an ordinary legacy hash with its canonical path and preserves the query', async () => {
    setPath('/geoquiz/?source=bookmark#/border-countries')
    const historyLength = window.history.length
    const replaceState = vi.spyOn(window.history, 'replaceState')
    render(<App />)
    await expectRoute('border-countries', 'Country borders')
    expect(window.location.search).toBe('?source=bookmark')
    expect(window.location.hash).toBe('')
    expect(window.history.length).toBe(historyLength)
    expect(replaceState).toHaveBeenCalledWith(window.history.state, '', '/geoquiz/border-countries/?source=bookmark')
  })

  it('canonicalizes legacy hashes with replacement and opens the former chooser once', async () => {
    setPath('/geoquiz/#/quizzes')
    const historyLength = window.history.length
    const replaceState = vi.spyOn(window.history, 'replaceState')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Capital map mock' })).toBeTruthy()
    expect(window.location.pathname).toBe('/geoquiz/')
    expect(window.location.hash).toBe('')
    expect(replaceState).toHaveBeenCalled()
    expect(window.history.length).toBe(historyLength)
    expect((screen.getByRole('dialog') as HTMLDialogElement).open).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Close quiz menu' }))
    await waitFor(() => expect((screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).open).toBe(false))
    expect(replaceState).toHaveBeenCalledTimes(1)
    setPath('/geoquiz/country-capital/')
    expect(await screen.findByRole('heading', { name: 'Country capitals' })).toBeTruthy()
    expect((screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement).open).toBe(false)
  })

  it('synchronizes routes and noindex metadata on browser history changes', async () => {
    setPath('/geoquiz/shape-high-point/')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Shape highest points' })).toBeTruthy()
    setPath('/geoquiz/not-a-quiz/')
    expect(screen.getByRole('heading', { name: 'Quiz not found' })).toBeTruthy()
    expect(document.title).toBe(routeMetadata['not-found'].title)
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,follow')
  })

  it('recovers from Not Found through the menu and restores the opener after Close and Escape', async () => {
    setPath('/geoquiz/not-a-quiz/')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Quiz not found' })).toBeTruthy()
    const opener = screen.getByRole('button', { name: 'Open quiz menu' })

    fireEvent.click(opener)
    expect(screen.getByRole('dialog', { name: 'Choose a quiz' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close quiz menu' }))
    await waitFor(() => expect(document.activeElement).toBe(opener))

    fireEvent.click(opener)
    fireEvent(screen.getByRole('dialog', { name: 'Choose a quiz' }), new Event('cancel', { cancelable: true }))
    await waitFor(() => expect(document.activeElement).toBe(opener))
  })
})
