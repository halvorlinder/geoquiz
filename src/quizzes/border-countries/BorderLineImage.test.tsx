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
    expect(container.querySelector('.border-country-fill, .border-locator-marker, .border-inset')).toBeNull()
  })
})
