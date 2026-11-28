// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from './ProfilePage'

const updateProfile = vi.fn(async (c) => c)
const toast = vi.fn()

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'u1',
      name: 'Clark Kent',
      email: 'clarkkent@hotmail.com',
      yearOfStudy: 3,
      usualPickupSpot: 'Engineering quad',
    },
    updateProfile,
  }),
}))
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }))
vi.mock('@/components/layout/PageShell', () => ({
  PageShell: ({ children }) => <main>{children}</main>,
}))

beforeEach(() => vi.clearAllMocks())

describe('ProfilePage', () => {
  it('shows your details and keeps Save off until something changes', () => {
    render(<ProfilePage />)
    expect(screen.getByLabelText('Full name')).toHaveValue('Clark Kent')
    expect(screen.getByLabelText(/University email/)).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeDisabled()
  })

  it('saves the trimmed name and tells you', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    const name = screen.getByLabelText('Full name')
    await user.clear(name)
    await user.type(name, '  Kal-El  ')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(updateProfile).toHaveBeenCalledWith({
      name: 'Kal-El',
      yearOfStudy: 3,
      usualPickupSpot: 'Engineering quad',
    })
    expect(toast).toHaveBeenCalledWith('Profile saved.')
  })

  it('asks for a name instead of saving an empty one', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    await user.clear(screen.getByLabelText('Full name'))
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByText('Enter your full name.')).toBeInTheDocument()
    expect(updateProfile).not.toHaveBeenCalled()
  })
})
