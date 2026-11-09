import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Highlight } from './Highlight'

describe('Highlight', () => {
  it('uses the shared hl utility in yellow by default, with no inline style', () => {
    render(<Highlight>CHEM 2</Highlight>)
    const mark = screen.getByText('CHEM 2')
    expect(mark.tagName).toBe('MARK')
    expect(mark).toHaveClass('hl', 'hl-yellow')
    expect(mark).not.toHaveAttribute('style')
  })

  it.each(['green', 'blue', 'pink'])('takes the %s highlighter', (color) => {
    render(<Highlight color={color}>fact</Highlight>)
    expect(screen.getByText('fact')).toHaveClass('hl', `hl-${color}`)
  })

  it('draws only when asked, and only with motion allowed', () => {
    const { rerender } = render(<Highlight>match</Highlight>)
    expect(screen.getByText('match').className).not.toMatch(/animate/)
    rerender(<Highlight animate>match</Highlight>)
    expect(screen.getByText('match')).toHaveClass('motion-safe:animate-hl-draw')
  })
})
