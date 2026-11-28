import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithRouter } from '@/test/render'
import * as api from '@/services/api'
import { ApiError } from '@/services/errors'
import ListingFormPage from './ListingFormPage'

vi.mock('@/services/api', () => ({
  getCourses: vi.fn(),
  getListing: vi.fn(),
  getListings: vi.fn(),
  createListing: vi.fn(),
  updateListing: vi.fn(),
  deleteListing: vi.fn(),
  uploadPhoto: vi.fn(),
}))
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'usr_demo', name: 'Demo' } }),
}))

const draft = {
  id: 'lst_d',
  title: 'University Physics, 15th edition',
  category: 'textbook',
  courseCodes: ['PHYS 210'],
  author: null,
  edition: null,
  isbn: null,
  brand: null,
  model: null,
  condition: 'good',
  conditionNotes: [],
  description: '',
  priceCents: 6000,
  retailCents: null,
  openToOffers: true,
  photos: [],
  pickupSpot: 'Science building lobby',
  status: 'draft',
  featured: false,
  sellerId: 'usr_demo',
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  api.getCourses.mockResolvedValue([
    { code: 'PHYS 210', title: 'Physics', listingCount: 0 },
  ])
  api.getListings.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 24 })
  api.getListing.mockResolvedValue(draft)
  api.createListing.mockResolvedValue({ ...draft, id: 'lst_new' })
  api.updateListing.mockResolvedValue(draft)
})

const stubs = [
  { path: '/listings/:listingId', element: <h1>Listing page</h1> },
  { path: '/dashboard', element: <h1>Ledger</h1> },
]

function renderSell() {
  return renderWithRouter(<ListingFormPage />, {
    route: '/sell',
    path: '/sell',
    routes: [
      { path: '/listings/:listingId/edit', element: <h1>Draft editor</h1> },
      ...stubs,
    ],
  })
}

function renderEdit(id = 'lst_d') {
  return renderWithRouter(<ListingFormPage />, {
    route: `/listings/${id}/edit`,
    path: '/listings/:listingId/edit',
    routes: stubs,
  })
}

const visibleButton = (name) =>
  screen.getAllByRole('button', { name }).find((b) => b.offsetParent !== null) ??
  screen.getAllByRole('button', { name })[0]

describe('Sell form, Save draft', () => {
  it('creates a server draft with only what is filled in, then opens it', async () => {
    const { user, router } = renderSell()
    await user.type(screen.getByLabelText('Title'), 'Lab coat, size M')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => expect(api.createListing).toHaveBeenCalledTimes(1))
    const sent = api.createListing.mock.calls[0][0]
    expect(sent).toMatchObject({ title: 'Lab coat, size M', status: 'draft' })
    expect(sent.priceCents).toBeNull()
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/listings/lst_new/edit'),
    )
    expect(localStorage.getItem('pb.sellDraft')).toBeNull()
  })

  it('shows server field errors next to the input', async () => {
    api.createListing.mockRejectedValue(
      new ApiError(422, 'Make the title at least 5 characters.', {
        title: 'Make the title at least 5 characters.',
      }),
    )
    const { user } = renderSell()
    await user.type(screen.getByLabelText('Title'), 'Lab')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(
      await screen.findAllByText('Make the title at least 5 characters.'),
    ).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled()
  })
})

describe('Editing a draft', () => {
  it('reads "Finish your draft" and Publish sends status active', async () => {
    const { user, router } = renderEdit()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Finish your draft' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
    await user.click(visibleButton('Publish listing'))
    await waitFor(() => expect(api.updateListing).toHaveBeenCalledTimes(1))
    expect(api.updateListing.mock.calls[0][0]).toBe('lst_d')
    expect(api.updateListing.mock.calls[0][1]).toMatchObject({ status: 'active' })
    await waitFor(() => expect(router.state.location.pathname).toBe('/listings/lst_d'))
  })

  it('Save draft keeps it a draft and stays on the form', async () => {
    const { user, router } = renderEdit()
    await screen.findByRole('heading', { level: 1, name: 'Finish your draft' })
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() =>
      expect(api.updateListing).toHaveBeenCalledWith(
        'lst_d',
        expect.objectContaining({ status: 'draft' }),
      ),
    )
    expect(await screen.findByText(/Draft saved\. Publish it/)).toBeVisible()
    expect(router.state.location.pathname).toBe('/listings/lst_d/edit')
  })

  it('a published listing still edits with Save changes and no status', async () => {
    api.getListing.mockResolvedValue({ ...draft, status: 'active' })
    const { user } = renderEdit()
    // The loading screen shares the "Edit listing" heading, so wait for the loaded form.
    await screen.findByDisplayValue('University Physics, 15th edition')
    expect(screen.getByRole('heading', { level: 1, name: 'Edit listing' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull()
    await user.click(visibleButton('Save changes'))
    await waitFor(() => expect(api.updateListing).toHaveBeenCalledTimes(1))
    expect(api.updateListing.mock.calls[0][1]).not.toHaveProperty('status')
  })
})
