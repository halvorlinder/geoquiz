import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useRef, useState } from 'react'
import { TimedPause } from './TimedPause'

function Harness() {
  const [paused, setPaused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  return <><input ref={inputRef} aria-label="Answer" defaultValue="partial answer" /><TimedPause paused={paused} canPause focusRef={inputRef} onPause={() => setPaused(true)} onResume={() => setPaused(false)} /></>
}

describe('TimedPause', () => {
  it('uses a native dialog, keeps backdrop clicks inert, resumes on Escape, and restores useful focus', async () => {
    render(<Harness />)
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    const dialog = document.querySelector('dialog')!
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeTruthy()
    expect(dialog.querySelector('[role="status"]')?.textContent).toBe('Timed run paused.')
    fireEvent.click(dialog)
    expect(dialog.hasAttribute('open')).toBe(true)
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(dialog.hasAttribute('open')).toBe(false)
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    expect(document.activeElement).toBe(screen.getByLabelText('Answer'))
    expect(document.body.querySelector('[aria-live="polite"]')?.textContent).toBe('Timed run resumed.')
  })

  it('contains only the explicit visible resume action in its modal panel', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    const panel = document.querySelector('.timed-pause-panel')!
    expect(panel.querySelector('h2')?.textContent).toBe('Paused')
    expect(panel.querySelectorAll('button')).toHaveLength(1)
  })

  it('prevents held Enter and Space from reactivating pause or resume controls', () => {
    render(<Harness />)
    const pause = screen.getByRole('button', { name: 'Pause' })
    expect(fireEvent.keyDown(pause, { key: 'Enter', repeat: true })).toBe(false)
    fireEvent.click(pause)
    const resume = screen.getByRole('button', { name: 'Resume timed run' })
    expect(fireEvent.keyDown(resume, { key: ' ', repeat: true })).toBe(false)
    expect(document.querySelector('dialog')?.hasAttribute('open')).toBe(true)
  })
})
