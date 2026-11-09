import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RadioCard } from './RadioCard'
import { ToggleChip } from './ToggleChip'

describe('ToggleChip', () => {
  it('is an aria-pressed toggle, 44px tall, ink fill when on', async () => {
    function Harness() {
      const [on, setOn] = useState(false)
      return (
        <ToggleChip pressed={on} onClick={() => setOn((v) => !v)}>
          Good
        </ToggleChip>
      )
    }
    const user = userEvent.setup()
    render(<Harness />)
    const chip = screen.getByRole('button', { name: 'Good' })
    expect(chip).toHaveAttribute('type', 'button')
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    expect(chip).toHaveClass('min-h-11', 'bg-paper-50')
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(chip).toHaveClass('bg-ink-900', 'text-paper-50', 'border-ink-900')
  })
})

describe('RadioCard', () => {
  function Picker() {
    const [value, setValue] = useState('textbook')
    return (
      <fieldset>
        <legend>Category</legend>
        {['textbook', 'calculator'].map((v) => (
          <RadioCard
            key={v}
            name="category"
            value={v}
            checked={value === v}
            onChange={() => setValue(v)}
            description={v === 'calculator' ? 'Graphing or scientific' : undefined}
          >
            {v === 'textbook' ? 'Textbooks' : 'Calculators'}
          </RadioCard>
        ))}
      </fieldset>
    )
  }

  it('is a native radio in a clickable card, one selected treatment', async () => {
    const user = userEvent.setup()
    render(<Picker />)
    const books = screen.getByRole('radio', { name: 'Textbooks' })
    const calcs = screen.getByRole('radio', { name: /Calculators/ })
    expect(books).toBeChecked()
    const card = (radio) => radio.closest('label')
    expect(card(books)).toHaveClass('bg-pen-50', 'border-ink-900', 'ring-1', 'ring-ink-900')
    expect(card(calcs)).toHaveClass('bg-paper-50', 'border-paper-400')
    expect(card(calcs)).toHaveClass('min-h-11', 'has-focus-visible:outline-2')
    await user.click(screen.getByText('Calculators'))
    expect(calcs).toBeChecked()
    expect(card(calcs)).toHaveClass('bg-pen-50')
  })

  it('arrow keys move between cards like any radio group', async () => {
    const user = userEvent.setup()
    render(<Picker />)
    screen.getByRole('radio', { name: 'Textbooks' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: /Calculators/ })).toBeChecked()
  })

  it('ties its description to the radio', () => {
    render(<Picker />)
    expect(screen.getByRole('radio', { name: /Calculators/ })).toHaveAccessibleDescription(
      'Graphing or scientific',
    )
  })
})
