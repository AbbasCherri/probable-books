import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('is a labelled native checkbox with the app accent', () => {
    render(<Checkbox label="Open to offers" />)
    const box = screen.getByRole('checkbox', { name: 'Open to offers' })
    expect(box).toHaveClass('size-5', 'accent-ink-900')
  })

  it('wraps the label so the whole row (44px tall) toggles it', async () => {
    function Harness() {
      const [on, setOn] = useState(false)
      return (
        <Checkbox
          label="Remember me"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
        />
      )
    }
    const user = userEvent.setup()
    render(<Harness />)
    const label = screen.getByText('Remember me').closest('label')
    expect(label).toHaveClass('min-h-11')
    await user.click(screen.getByText('Remember me'))
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('ties the hint and error to the box', () => {
    render(
      <Checkbox
        id="terms"
        label="I agree"
        hint="You can change this later."
        error="Tick this to go on."
      />,
    )
    const box = screen.getByRole('checkbox', { name: 'I agree' })
    expect(box).toHaveAccessibleDescription('You can change this later. Tick this to go on.')
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById('terms-error')).toHaveAttribute('data-field-error')
  })

  it('passes native props through and merges className on the wrapper', () => {
    render(<Checkbox label="Textbooks" name="category" value="textbook" className="mt-2" />)
    const box = screen.getByRole('checkbox')
    expect(box).toHaveAttribute('name', 'category')
    expect(box).toHaveAttribute('value', 'textbook')
    expect(box.closest('div')).toHaveClass('mt-2')
  })
})
