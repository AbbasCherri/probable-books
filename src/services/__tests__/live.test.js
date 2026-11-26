// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let api
const json = (status, body) => ({ ok: status < 400, status, json: async () => body })

describe('live backend (VITE_API_URL set)', () => {
  beforeEach(async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test/')
    vi.resetModules()
    api = await import('@/services/api')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('maps Browse filters to the GET /api/listings query', async () => {
    const page = { items: [], total: 0, page: 2, pageSize: 24 }
    const fetchMock = vi.fn().mockResolvedValue(json(200, page))
    vi.stubGlobal('fetch', fetchMock)
    const out = await api.getListings({
      q: ' klein ',
      courses: ['CHEM 201', 'BIOL 201'],
      categories: ['textbook'],
      conditions: [],
      minPrice: 500,
      maxPrice: undefined,
      openToOffers: true,
      sort: 'price_asc',
      page: 2,
      pageSize: 24,
    })
    expect(out).toEqual(page)
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('http://api.test/api/listings')
    expect(url.searchParams.get('q')).toBe('klein')
    expect(url.searchParams.getAll('course')).toEqual(['CHEM 201', 'BIOL 201'])
    expect(url.searchParams.getAll('category')).toEqual(['textbook'])
    expect(url.searchParams.has('condition')).toBe(false)
    expect(url.searchParams.get('minPrice')).toBe('500')
    expect(url.searchParams.has('maxPrice')).toBe(false)
    expect(url.searchParams.get('openToOffers')).toBe('true')
    expect(url.searchParams.get('sort')).toBe('price_asc')
    expect(url.searchParams.get('page')).toBe('2')
  })

  it('reads the Home shelves from the server', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, []))
    vi.stubGlobal('fetch', fetchMock)
    await api.getFeaturedListings()
    await api.getNewListings(10)
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://api.test/api/listings/featured',
    )
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      'http://api.test/api/listings/new?limit=10',
    )
  })

  it('turns A4 errors into ApiError with status, fields and closest', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          json(404, { message: 'No CHEM 999 in the index.', closest: ['CHEM 201'] }),
        ),
    )
    const err = await api.getFeaturedListings().catch((e) => e)
    expect(err).toBeInstanceOf(api.ApiError)
    expect(err.status).toBe(404)
    expect(err.message).toBe('No CHEM 999 in the index.')
    expect(err.closest).toEqual(['CHEM 201'])
  })

  it('reports a network failure as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const err = await api.getNewListings().catch((e) => e)
    expect(err).toBeInstanceOf(api.ApiError)
    expect(err.status).toBe(0)
  })
})
