import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BorderLineImage } from './BorderLineImage'
import { borderQuestions } from './borderCountries'

describe('BorderLineImage', () => {
  it('renders Hard mode as only the exact isolated line', () => {
    const question = borderQuestions('hard').find(candidate => candidate.codes.join(',') === 'BWA,ZMB')!
    const { container, getByRole } = render(<BorderLineImage question={question} />)
    expect(getByRole('img', { name: 'One land border line' })).toBeTruthy()
    expect(container.querySelectorAll('.border-line-halo, .border-line-mark')).toHaveLength(2)
    expect(container.querySelectorAll('.border-image-hard, .border-image-hard svg')).toHaveLength(2)
    expect(container.querySelector('.border-country-fill, .border-locator-marker, .border-inset')).toBeNull()
  })
  it('renders every disconnected Hard run as equal anonymous subpaths in one panel', () => {
    const question=borderQuestions('hard').find(candidate=>candidate.codes.join(',')==='CAN,USA')!
    const { container,getByRole,getByText }=render(<BorderLineImage question={question}/>)
    expect(getByRole('img',{name:'4 land border sections'})).toBeTruthy()
    expect(getByText('4 border sections')).toBeTruthy()
    expect(container.querySelectorAll('svg.border-line-multi')).toHaveLength(1)
    expect(container.querySelectorAll('.border-line-atlas-cell')).toHaveLength(0)
    expect(container.querySelectorAll('.border-line-halo, .border-line-mark')).toHaveLength(8)
    const svg=container.querySelector('svg.border-line-multi')!
    const all=question.runs.flat(), west=Math.min(...all.map(([longitude])=>longitude)), east=Math.max(...all.map(([longitude])=>longitude)), south=Math.min(...all.map(([,latitude])=>latitude)), north=Math.max(...all.map(([,latitude])=>latitude)), padding=Math.max(east-west,north-south,.001)*.12
    const framedWest=west-padding,framedNorth=north+padding
    for(const [index,run]of question.runs.entries()){
      const [longitude,latitude]=run[0]
      expect(container.querySelectorAll('.border-line-halo')[index].getAttribute('d')).toContain(`M ${longitude-framedWest} ${framedNorth-latitude}`)
    }
    expect(svg.querySelectorAll('g[transform], path[transform]')).toHaveLength(0)
    expect(svg.getAttribute('viewBox')).toContain('0 0 ')
    expect(container.textContent).not.toMatch(/Canada|United States|primary|secondary/i)
  })
})
