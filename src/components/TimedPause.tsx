import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type RefObject, type SyntheticEvent } from 'react'

/** Narrow native modal shared by every answerable Timed quiz. */
export function TimedPause({
  paused,
  canPause,
  focusRef,
  onPause,
  onResume,
}: Readonly<{
  paused: boolean
  canPause: boolean
  focusRef: RefObject<HTMLElement | null>
  onPause: () => void
  onResume: () => void
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const resumeRef = useRef<HTMLButtonElement>(null)
  const closingProgrammatically = useRef(false)
  const wasPausedRef = useRef(false)
  const [resumeAnnouncement, setResumeAnnouncement] = useState('')

  useEffect(() => {
    if (paused) {
      wasPausedRef.current = true
      setResumeAnnouncement('')
    } else if (wasPausedRef.current) {
      wasPausedRef.current = false
      setResumeAnnouncement('Timed run resumed.')
    }
  }, [paused])

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (paused) {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal()
        if (!dialog.open) { dialog.setAttribute('open', ''); dialog.open = true }
      }
      window.setTimeout(() => resumeRef.current?.focus(), 0)
    } else {
      closingProgrammatically.current = true
      if (dialog.open && typeof dialog.close === 'function') dialog.close()
      dialog.removeAttribute('open')
      closingProgrammatically.current = false
    }
  }, [paused])

  function resume() {
    onResume()
    window.setTimeout(() => focusRef.current?.focus(), 0)
  }

  function onCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    resume()
  }

  function onBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    // Deliberately inert: only the explicit Resume control and Escape restart time.
    if (event.target === event.currentTarget) event.preventDefault()
  }

  function preventHeldActivation(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault()
  }

  return <>
    <p className="visually-hidden" aria-live="polite" aria-atomic="true">{resumeAnnouncement}</p>
    {canPause && <button className="secondary-button timed-pause-button" type="button" onClick={onPause} onKeyDown={preventHeldActivation}>Pause</button>}
    <dialog ref={dialogRef} className="timed-pause-dialog" aria-labelledby="timed-pause-title" onCancel={onCancel} onClick={onBackdropClick} onClose={() => { if (!closingProgrammatically.current && paused) resume() }}>
      <section className="timed-pause-panel">
        <h2 id="timed-pause-title">Paused</h2>
        {paused && <p className="visually-hidden" role="status">Timed run paused.</p>}
        <button ref={resumeRef} className="primary-button" type="button" onClick={resume} onKeyDown={preventHeldActivation}>Resume timed run</button>
      </section>
    </dialog>
  </>
}
