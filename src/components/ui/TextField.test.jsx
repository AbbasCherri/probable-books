import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TextField } from './TextField'

describe('TextField', () => {
  it('wires label, hint and error', () => {
    render(
      <TextField label="Email" hint="Your school address." error="Enter an email." />,
    )
    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(input).toHaveAccessibleDescription('Your school address. Enter an email.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('has no end padding or wrapper without an endAdornment', () => {
    render(<TextField label="Title" />)
    const input = screen.getByRole('textbox')
    expect(input.className).not.toMatch(/\bpr-/)
    expect(input.parentElement.className).not.toMatch(/\brelative\b/)
  })

  it('endAdornment sits inside the field end, after the input in tab order, with room kept', async () => {
    const user = userEvent.setup()
    render(
      <TextField
        label="Password"
        endAdornment={({ id }) => (
          <button type="button" aria-controls={id}>
            Show
          </button>
        )}
      />,
    )
    const input = screen.getByRole('textbox', { name: 'Password' })
    const button = screen.getByRole('button', { name: 'Show' })
    expect(input).toHaveClass('pr-20')
    expect(button).toHaveAttribute('aria-controls', input.id)
    expect(button.parentElement).toHaveClass('absolute', 'right-0')
    await user.tab()
    expect(input).toHaveFocus()
    await user.tab()
    expect(button).toHaveFocus()
  })

  it('takes a plain node too', () => {
    render(<TextField label="Price" endAdornment={<span>USD</span>} />)
    expect(screen.getByText('USD')).toBeInTheDocument()
  })
})
