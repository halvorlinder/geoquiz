import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { borderEntity, borderQuestions, borderShape, type BorderQuestion } from './borderCountries'
import { normalizeAnswer } from '../../core/answerMatching'
import { borderContextGeometry } from './borderContextGeometry'

const leaflet = vi.hoisted(() => ({ fitBounds: vi.fn(), stop: vi.fn(), invalidateSize: vi.fn() }))
vi.mock('react-leaflet', async () => {
  const React = await import('react')
  function MountedGeoJson({ data, style }: { data: { properties: Record<string, never>; geometry: { type: string; coordinates: unknown } }; style: { className?: string; color?: string; dashArray?: string } }) {
    // React-Leaflet v5 consumes each layer's data at mount: assertions exercise that contract.
    const [initial] = React.useState(data)
    return <div className={style.className} data-properties={JSON.stringify(initial.properties)} data-geometry-type={initial.geometry.type} data-geometry={JSON.stringify(initial.geometry.coordinates).slice(0, 120)} data-color={style.color} data-dash={style.dashArray} />
  }
  return {
    MapContainer: ({ children, className, bounds, boundsOptions }: { children: ReactNode; className: string; bounds: unknown; boundsOptions: { padding: unknown; maxZoom: number } }) => <div className={className} data-initial-bounds={JSON.stringify(bounds)} data-initial-options={JSON.stringify(boundsOptions)}>{children}</div>,
    Pane: ({ children }: { children: ReactNode }) => <>{children}</>,
    GeoJSON: MountedGeoJson,
    useMap: () => ({ ...leaflet, getContainer: () => document.querySelector('.easy-border-context-map') as HTMLElement }),
  }
})
import { EasyBorderContextMap } from './EasyBorderContextMap'

const easy = borderQuestions('easy', 'All', () => 0).find(question => question.codes.join(',') === 'BWA,ZMB')!
const multi = borderQuestions('easy', 'All', () => 0).find(question => question.codes.join(',') === 'CAN,USA')!
const answerName = borderEntity(easy.answerCode!)!.name
function countries(question: BorderQuestion, answerStatus?: 'correct'|'revealed') {
  const known=borderEntity(question.knownCode!)!, knownShape=borderShape(question.knownCode!,question.source)!
  const answer=answerStatus?borderEntity(question.answerCode!)!:undefined, answerShape=answerStatus?borderShape(question.answerCode!,question.source):undefined
  return [{ name: known.name, geometry: borderContextGeometry(knownShape), status: 'known' as const }, ...(answer&&answerShape?[{ name:answer.name, geometry:borderContextGeometry(answerShape), status:answerStatus! }]:[])]
}
function contextMap(question: BorderQuestion, answerStatus?: 'correct'|'revealed', recenterEpoch=0) { return <EasyBorderContextMap path={question.path} countries={countries(question,answerStatus)} recenterEpoch={recenterEpoch} /> }

beforeEach(() => {
  leaflet.fitBounds.mockClear(); leaflet.stop.mockClear(); leaflet.invalidateSize.mockClear()
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false }) })
})
afterEach(() => { Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: undefined }) })

describe('EasyBorderContextMap', () => {
  it('mounts only property-free known geometry and exact run while unresolved', () => {
    const { container } = render(contextMap(easy))
    expect(screen.getByRole('region', { name: `Border context map for ${borderEntity(easy.knownCode!)!.name}` })).toBeTruthy()
    const map = container.querySelector('.easy-border-context-map')!
    expect(map.getAttribute('role')).toBe('application')
    expect(map.getAttribute('aria-label')).toBe(`Border context map for ${borderEntity(easy.knownCode!)!.name}`)
    expect(container.querySelectorAll('.easy-border-answer')).toHaveLength(0)
    expect(container.querySelectorAll('[data-properties="{}"]')).toHaveLength(3)
    expect(container.innerHTML).not.toContain(answerName)
    expect(container.innerHTML).not.toContain(easy.answerCode!)
  })

  it('mounts exact answer geometry only after resolution, refits with matching initial options, and recenters', () => {
    const { container, rerender } = render(contextMap(easy))
    const map = container.querySelector('.easy-border-context-map')!
    const initialBounds = map.getAttribute('data-initial-bounds')
    const initialOptions = JSON.parse(map.getAttribute('data-initial-options') ?? '{}')
    expect(leaflet.fitBounds).toHaveBeenLastCalledWith(JSON.parse(initialBounds!), expect.objectContaining(initialOptions))
    const initialFitCount = leaflet.fitBounds.mock.calls.length
    rerender(contextMap(easy, 'correct', 1))
    expect(leaflet.fitBounds).toHaveBeenCalledTimes(initialFitCount + 1)
    const correct = container.querySelector('.easy-border-answer-correct')!
    expect(correct.getAttribute('data-color')).toBe('#75d4ad'); expect(correct.getAttribute('data-dash')).toBeNull()
    rerender(contextMap(easy, 'revealed', 2))
    expect(leaflet.fitBounds).toHaveBeenCalledTimes(initialFitCount + 2)
    const revealed = container.querySelector('.easy-border-answer-revealed')!
    expect(revealed.getAttribute('data-color')).toBe('#e08989'); expect(revealed.getAttribute('data-dash')).toBe('6 5')
    const calls = leaflet.fitBounds.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Recenter shared border' }))
    expect(leaflet.fitBounds.mock.calls.length).toBe(calls + 1)
  })

  it('mounts every multi-run section as one property-free MultiLineString and cycles local focus without unmounting runs', () => {
    const { container,rerender }=render(<EasyBorderContextMap runs={multi.runs} countries={countries(multi)} recenterEpoch={0}/>)
    const lines=container.querySelectorAll('.easy-border-selected-run-halo, .easy-border-selected-run')
    expect(lines).toHaveLength(2)
    for(const line of lines){expect(line.getAttribute('data-properties')).toBe('{}');expect(line.getAttribute('data-geometry-type')).toBe('MultiLineString');expect(line.getAttribute('data-geometry')).toContain('[[')}
    expect(screen.getByRole('button',{name:'Focus next section'})).toBeTruthy()
    expect(screen.getByRole('button',{name:'Show all sections'})).toBeTruthy()
    const map=container.querySelector('.easy-border-context-map')!
    const unionBounds=JSON.parse(map.getAttribute('data-initial-bounds')!)
    const unionOptions=JSON.parse(map.getAttribute('data-initial-options')!)
    const fitCount=leaflet.fitBounds.mock.calls.length
    fireEvent.click(screen.getByRole('button',{name:'Focus next section'}))
    expect(leaflet.fitBounds).toHaveBeenCalledTimes(fitCount+1)
    expect(leaflet.fitBounds).toHaveBeenLastCalledWith(expect.not.arrayContaining(unionBounds),expect.anything())
    // Correct/revealed updates externally recenter the all-run union immediately;
    // the prior local section must not leak into either disclosed state.
    rerender(<EasyBorderContextMap runs={multi.runs} countries={countries(multi,'correct')} recenterEpoch={1}/>)
    expect(leaflet.fitBounds).toHaveBeenLastCalledWith(unionBounds,expect.objectContaining(unionOptions))
    expect(container.querySelectorAll('.easy-border-selected-run-halo, .easy-border-selected-run')).toHaveLength(2)
    rerender(<EasyBorderContextMap runs={multi.runs} countries={countries(multi,'revealed')} recenterEpoch={2}/>)
    expect(leaflet.fitBounds).toHaveBeenLastCalledWith(unionBounds,expect.objectContaining(unionOptions))
    expect(container.querySelectorAll('.easy-border-selected-run-halo, .easy-border-selected-run')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button',{name:'Show all sections'}))
    expect(leaflet.fitBounds).toHaveBeenLastCalledWith(unionBounds,expect.objectContaining(unionOptions))
    expect(container.querySelectorAll('.easy-border-selected-run-halo, .easy-border-selected-run')).toHaveLength(2)
  })

  it('uses and cleans up the window-resize fallback when ResizeObserver is unavailable', () => {
    const invalidate = leaflet.invalidateSize
    const { unmount } = render(contextMap(easy))
    fireEvent(window, new Event('resize'))
    expect(invalidate).toHaveBeenCalledWith({ animate: false, pan: false })
    unmount(); invalidate.mockClear(); fireEvent(window, new Event('resize'))
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('uses ResizeObserver instead of the window fallback, invalidates after observation, and disconnects', () => {
    let callback: ResizeObserverCallback | undefined
    const observe = vi.fn(), disconnect = vi.fn()
    class TestResizeObserver {
      constructor(nextCallback: ResizeObserverCallback) { callback = nextCallback }
      observe = observe
      disconnect = disconnect
      unobserve = vi.fn()
    }
    Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: TestResizeObserver })
    const { container, unmount } = render(contextMap(easy))
    const map = container.querySelector('.easy-border-context-map')!
    expect(observe).toHaveBeenCalledWith(map)
    fireEvent(window, new Event('resize'))
    expect(leaflet.invalidateSize).not.toHaveBeenCalled()
    callback?.([], {} as ResizeObserver)
    expect(leaflet.invalidateSize).toHaveBeenCalledWith({ animate: false, pan: false })
    unmount()
    expect(disconnect).toHaveBeenCalledTimes(1)
  })

  it('uses an immediate refit under reduced motion', () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: true }) })
    render(contextMap(easy))
    expect(leaflet.fitBounds).toHaveBeenLastCalledWith(expect.any(Array), expect.objectContaining({ animate: false }))
  })

  it('keeps all 634 unresolved Easy answer identities out of text, attributes, and map properties', () => {
    const token = (value: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${normalizeAnswer(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'iu')
    for (const random of [() => 0, () => .99]) for (const question of borderQuestions('easy', 'All', random)) {
      const view = render(contextMap(question))
      const answer = borderEntity(question.answerCode!)!
      const knownLabel = normalizeAnswer(borderEntity(question.knownCode!)!.name)
      // A few curated alternate names are literal substrings of the intentionally
      // disclosed known-country label (for example the two Congos). Those are not
      // independent answer disclosure, so audit every other answer identity.
      const forbidden = [answer.code, answer.name, ...answer.aliases, ...answer.abbreviations].filter(value => !token(value).test(knownLabel))
      const shell = view.container
      expect(shell.querySelector('.easy-border-answer'), question.id).toBeNull()
      for (const value of forbidden) expect(token(value).test(normalizeAnswer(shell.textContent ?? '')), `${question.id} leaked ${value}`).toBe(false)
      for (const element of shell.querySelectorAll('*')) for (const attribute of element.getAttributeNames()) {
        const attributeValue = normalizeAnswer(element.getAttribute(attribute) ?? '')
        for (const value of forbidden) expect(token(value).test(attributeValue), `${question.id} leaked ${value} through ${attribute}`).toBe(false)
      }
      for (const layer of shell.querySelectorAll('[data-properties]')) expect(layer.getAttribute('data-properties'), question.id).toBe('{}')
      view.unmount()
    }
  }, 30_000)
})
