import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Button', () => {
  it('is a type="button" by default', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it.each(['sm', 'md'])('size %s is at least 44px tall (min-h-11)', (size) => {
    render(<Button size={size}>Go</Button>)
    expect(screen.getByRole('button')).toHaveClass('min-h-11')
  })

  it('size icon is a 44px square', () => {
    render(
      <Button size="icon" aria-label="Close">
        <svg aria-hidden="true" />
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Close' })
    expect(button).toHaveClass('size-11')
    expect(button.className).not.toMatch(/\bpx-/)
  })

  it('warns in dev when an icon button has no accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Button size="icon">
        <svg aria-hidden="true" />
      </Button>,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/aria-label/))
  })

  it('does not warn when an icon button is labelled', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<Button size="icon" aria-label="Menu" />)
    render(<Button size="icon" aria-labelledby="x" />)
    expect(warn).not.toHaveBeenCalled()
  })

  it('variant link looks like a prose link but keeps a 44px hit area', () => {
    render(<Button variant="link">Cancel</Button>)
    const button = screen.getByRole('button', { name: 'Cancel' })
    expect(button).toHaveClass(
      'text-pen-600',
      'underline',
      'underline-offset-2',
      'min-h-11',
      'min-w-11',
    )
    expect(button).not.toHaveClass('no-underline')
    expect(button).not.toHaveClass('border-ink-900')
  })

  it('renders another element with as=, without a button type', () => {
    function FakeLink(props) {
      return <a href="/sell" {...props} />
    }
    render(
      <Button as={FakeLink} variant="link">
        Sell
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Sell' })
    expect(link).not.toHaveAttribute('type')
    expect(link).toHaveClass('underline')
  })

  it('merges className', () => {
    render(<Button className="w-full">Wide</Button>)
    expect(screen.getByRole('button')).toHaveClass('w-full')
  })
})
