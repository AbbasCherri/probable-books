import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/services/api'
import { OfferDialog } from './OfferDialog'
import { parseOfferAmount, validateOffer } from './validateOffer'

const listing = { id: 'lst_006', title: 'Lab coat, size M', priceCents: 1200 }

function setup(onSubmit = vi.fn().mockResolvedValue({ id: 'off_x' })) {
  const onClose = vi.fn()
  const onSent = vi.fn()
  const user = userEvent.setup()
  render(
    <OfferDialog
      open
      listing={listing}
      onClose={onClose}
      onSubmit={onSubmit}
      onSent={onSent}
    />,
  )
  const amount = screen.getByLabelText('Your offer, in dollars')
  const message = screen.getByLabelText(/Message/)
  const send = screen.getByRole('button', { name: 'Send offer' })
  return { user, onSubmit, onClose, onSent, amount, message, send }
}

describe('parseOfferAmount', () => {
  it('reads dollars and cents', () => {
    expect(parseOfferAmount('10')).toBe(1000)
    expect(parseOfferAmount('$10.5')).toBe(1050)
    expect(parseOfferAmount(' 9.99 ')).toBe(999)
    expect(parseOfferAmount('.50')).toBe(50)
    expect(parseOfferAmount('1,200')).toBe(120000)
  })
  it('rejects anything else', () => {
    expect(parseOfferAmount('')).toBeNull()
    expect(parseOfferAmount('ten')).toBeNull()
    expect(parseOfferAmount('4.555')).toBeNull()
    expect(parseOfferAmount('-3')).toBeNull()
    expect(parseOfferAmount('1.2.3')).toBeNull()
  })
})

describe('validateOffer', () => {
  it('needs an amount above $0 and at most the asking price', () => {
    expect(validateOffer({ amount: '', message: '' }, 1200).amount).toMatch(/Enter/)
    expect(validateOffer({ amount: '0', message: '' }, 1200).amount).toBe(
      'Enter an amount above $0.',
    )
    expect(validateOffer({ amount: '12.01', message: '' }, 1200).amount).toBe(
      'Offer at most the asking price, $12.',
    )
    expect(validateOffer({ amount: '12', message: '' }, 1200)).toEqual({})
    expect(validateOffer({ amount: '0.01', message: '' }, 1200)).toEqual({})
  })
  it('keeps the message to 280 characters', () => {
    expect(validateOffer({ amount: '5', message: 'x'.repeat(280) }, 1200)).toEqual({})
    expect(validateOffer({ amount: '5', message: 'x'.repeat(283) }, 1200).message).toBe(
      'Keep the message to 280 characters. Cut 3.',
    )
  })
})

describe('OfferDialog', () => {
  it('focuses the amount and uses the decimal keypad', () => {
    const { amount } = setup()
    expect(amount).toHaveFocus()
    expect(amount).toHaveAttribute('inputmode', 'decimal')
  })

  it('shows amount errors on submit and keeps focus on the field', async () => {
    const { user, amount, send, onSubmit } = setup()
    await user.click(send)
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    expect(amount).toHaveFocus()

    await user.clear(amount)
    await user.type(amount, '0')
    await user.click(send)
    expect(screen.getByText('Enter an amount above $0.')).toBeInTheDocument()

    await user.clear(amount)
    await user.type(amount, '13')
    await user.click(send)
    expect(screen.getByText('Offer at most the asking price, $12.')).toBeInTheDocument()
    expect(amount).toHaveAccessibleDescription(/at most the asking price/)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('counts message characters and flags a message over 280', async () => {
    const { user, amount, message, send, onSubmit } = setup()
    await user.type(amount, '10')
    await user.click(message)
    await user.paste('x'.repeat(281))
    expect(screen.getByText('281 of 280 characters')).toBeInTheDocument()
    await user.click(send)
    expect(screen.getByText('Keep the message to 280 characters. Cut 1.')).toBeInTheDocument()
    expect(message).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('sends cents and the trimmed message, then reports it', async () => {
    const { user, amount, message, send, onSubmit, onSent } = setup()
    await user.type(amount, '10.50')
    await user.type(message, '  After 3?  ')
    await user.click(send)
    expect(onSubmit).toHaveBeenCalledWith({ amountCents: 1050, message: 'After 3?' })
    expect(onSent).toHaveBeenCalledWith({ id: 'off_x' }, { amountCents: 1050 })
  })

  it('puts server field errors on their fields', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(422, 'Bad', { amountCents: 'Too low for this seller.', message: 'No.' }),
      )
    const { user, amount, message, send } = setup(onSubmit)
    await user.type(amount, '5')
    await user.click(send)
    expect(await screen.findByText('Too low for this seller.')).toBeInTheDocument()
    expect(amount).toHaveAttribute('aria-invalid', 'true')
    expect(message).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows other server errors above the button', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiError(422, 'You already have an offer waiting.'))
    const { user, amount, send } = setup(onSubmit)
    await user.type(amount, '5')
    await user.click(send)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You already have an offer waiting.',
    )
  })
})
