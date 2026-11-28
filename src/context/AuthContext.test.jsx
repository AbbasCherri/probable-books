// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/services/api'
import { TOKEN_KEY } from '@/services/http'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('@/services/api', () => ({
  getCurrentUser: vi.fn(async () => ({ id: 'u1', name: 'Clark Kent' })),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

function Who() {
  const { user, ready } = useAuth()
  return <p>{ready ? (user?.name ?? 'signed out') : 'loading'}</p>
}

const show = () =>
  render(
    <AuthProvider>
      <Who />
    </AuthProvider>,
  )

describe('AuthProvider across tabs', () => {
  it('asks the server who you are again when another tab changes the token', async () => {
    show()
    await screen.findByText('Clark Kent')
    api.getCurrentUser.mockResolvedValueOnce({ id: 'u2', name: 'Peter Parker' })
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY }))
    })
    await screen.findByText('Peter Parker')
  })

  it('shows signed out when the other tab signed out', async () => {
    show()
    await screen.findByText('Clark Kent')
    api.getCurrentUser.mockResolvedValueOnce(null)
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: TOKEN_KEY, newValue: null }))
    })
    await screen.findByText('signed out')
  })

  it('ignores storage changes that are not the token', async () => {
    show()
    await screen.findByText('Clark Kent')
    const calls = api.getCurrentUser.mock.calls.length
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'pb.theme' }))
    })
    await waitFor(() => expect(api.getCurrentUser.mock.calls.length).toBe(calls))
  })
})
