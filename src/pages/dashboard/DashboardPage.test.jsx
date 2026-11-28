import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithRouter } from '@/test/render'
import * as api from '@/services/api'
import { ApiError } from '@/services/errors'
import DashboardPage from './DashboardPage'

vi.mock('@/services/api', () => ({
  getMyListings: vi.fn(),
  getOffers: vi.fn(),
  updateListing: vi.fn(),
  deleteListing: vi.fn(),
  respondToOffer: vi.fn(),
}))

const listing = (o) => ({
  id: 'lst_a',
  title: 'Organic Chemistry, 4th edition',
  category: 'textbook',
  courseCodes: ['CHEM 201'],
  priceCents: 4500,
  photos: [],
  status: 'active',
  sellerId: 'usr_demo',
  createdAt: '2026-11-20T10:00:00.000Z',
  offerCount: 0,
  ...o,
})

const offer = {
  id: 'off_a',
  listingId: 'lst_a',
  buyerId: 'usr_b',
  amountCents: 3500,
  message: '',
  status: 'pending',
  counterCents: null,
  createdAt: '2026-11-21T10:00:00.000Z',
  buyer: { id: 'usr_b', name: 'Karim S.' },
  seller: { id: 'usr_demo', name: 'Demo' },
  listing: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  api.getMyListings.mockResolvedValue([
    listing(),
    listing({ id: 'lst_d', title: 'Lab coat, size M (draft)', status: 'draft' }),
  ])
  api.getOffers.mockImplementation(({ direction }) =>
    Promise.resolve(direction === 'received' ? [offer] : []),
  )
  api.respondToOffer.mockResolvedValue({ ...offer, status: 'accepted' })
  api.updateListing.mockResolvedValue({})
})

const renderPage = (route = '/dashboard') =>
  renderWithRouter(<DashboardPage />, { route, path: '/dashboard' })

describe('DashboardPage', () => {
  it('accepting an offer is one request: the server reserves the listing', async () => {
    const { user } = renderPage('/dashboard?tab=received')
    await user.click(await screen.findByRole('button', { name: 'Accept' }))
    expect(await screen.findByText(/Offer accepted\./)).toBeInTheDocument()
    expect(api.respondToOffer).toHaveBeenCalledTimes(1)
    expect(api.respondToOffer).toHaveBeenCalledWith('off_a', 'accept')
    expect(api.updateListing).not.toHaveBeenCalled()
  })

  it('filters to drafts', async () => {
    const { user } = renderPage()
    await user.click(await screen.findByRole('button', { name: /Drafts/ }))
    const table = screen.getByRole('table', { name: 'Your listings' })
    expect(within(table).getByText('Lab coat, size M (draft)')).toBeInTheDocument()
    expect(within(table).queryByText('Organic Chemistry, 4th edition')).toBeNull()
  })

  it('publishes a draft from its row menu', async () => {
    const { user } = renderPage('/dashboard?status=draft')
    const [menu] = await screen.findAllByRole('button', {
      name: 'Actions for Lab coat, size M (draft)',
    })
    await user.click(menu)
    expect(screen.queryByRole('menuitem', { name: 'Mark sold' })).toBeNull()
    await user.click(screen.getByRole('menuitem', { name: 'Publish' }))
    await waitFor(() =>
      expect(api.updateListing).toHaveBeenCalledWith('lst_d', { status: 'active' }),
    )
    expect(await screen.findByText('Published. Buyers can see it now.')).toBeVisible()
  })

  it('an unfinished draft gets a short message instead of every field error', async () => {
    api.updateListing.mockRejectedValue(
      new ApiError(422, 'Choose a category. Choose the condition.', {
        category: 'Choose a category.',
        condition: 'Choose the condition.',
      }),
    )
    const { user } = renderPage('/dashboard?status=draft')
    const [menu] = await screen.findAllByRole('button', {
      name: 'Actions for Lab coat, size M (draft)',
    })
    await user.click(menu)
    await user.click(screen.getByRole('menuitem', { name: 'Publish' }))
    expect(
      await screen.findByText(
        'This draft isn’t finished yet. Choose Edit to fill in the rest.',
      ),
    ).toBeVisible()
  })
})
