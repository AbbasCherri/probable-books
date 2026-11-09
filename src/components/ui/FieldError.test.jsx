import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldError } from './FieldError'
import { FieldError as OldPathFieldError } from '@/pages/listing-form/FieldError'
import { TextField } from './TextField'

describe('FieldError', () => {
  it('renders nothing without a message', () => {
    const { container } = render(<FieldError id="x-error">{''}</FieldError>)
    expect(container).toBeEmptyDOMElement()
  })

  it('is one red-pen line: icon (size-4.5) and small text, with the id', () => {
    render(<FieldError id="x-error">Pick a grade.</FieldError>)
    const line = screen.getByText('Pick a grade.').closest('p')
    expect(line).toHaveAttribute('id', 'x-error')
    expect(line).toHaveClass('text-small', 'text-redpen-600')
    const icon = line.querySelector('svg')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveClass('size-4.5')
  })

  it('is still exported from the old listing-form path', () => {
    expect(OldPathFieldError).toBe(FieldError)
  })

  it('is the error line Field renders', () => {
    render(<TextField id="email" label="Email" error="Enter an email." />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveAccessibleDescription('Enter an email.')
    const line = document.getElementById('email-error')
    expect(line.tagName).toBe('P')
    expect(line).toHaveAttribute('data-field-error')
  })
})
