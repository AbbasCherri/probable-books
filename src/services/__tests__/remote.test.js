// @vitest-environment jsdom
// The real backend client: request shapes, token handling and error mapping (fetch stubbed).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let remote
let http
const reply = (status, body) => ({
  ok: status < 400,
  status,
  json: async () => {
    if (body === undefined) throw new SyntaxError('no body')
    return body
  },
})
const lastCall = (fetchMock, i = -1) => {
  const [url, init] = fetchMock.mock.calls.at(i)
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body
  return { url: new URL(url), init, body }
}

beforeEach(async () => {
  localStorage.clear()
  vi.stubEnv('VITE_API_URL', 'http://api.test/')
  vi.resetModules()
  http = await import('@/services/http')
  remote = await import('@/services/remote')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('remote client', () => {
  it('maps Browse filters to the GET /api/listings query', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { items: [], total: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    await remote.getListings({
      q: ' klein ',
      courses: ['CHEM 201', 'BIOL 201'],
      categories: ['textbook'],
      conditions: [],
      minPrice: 500,
      openToOffers: true,
      sort: 'price_asc',
      page: 2,
      pageSize: 24,
    })
    const { url } = lastCall(fetchMock)
    expect(url.origin + url.pathname).toBe('http://api.test/api/listings')
    expect(url.searchParams.get('q')).toBe('klein')
    expect(url.searchParams.getAll('course')).toEqual(['CHEM 201', 'BIOL 201'])
    expect(url.searchParams.has('condition')).toBe(false)
    expect(url.searchParams.get('openToOffers')).toBe('true')
    expect(url.searchParams.get('page')).toBe('2')
  })

  it('login stores the token and later requests send it', async () => {
    const user = { id: 'usr_demo', name: 'Demo' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(200, { user, token: 'tok123' }))
      .mockResolvedValueOnce(reply(200, []))
    vi.stubGlobal('fetch', fetchMock)
    expect(await remote.login('demo@probable.books', 'password123')).toEqual(user)
    expect(lastCall(fetchMock, 0).body).toEqual({
      email: 'demo@probable.books',
      password: 'password123',
    })
    expect(http.getToken()).toBe('tok123')
    await remote.getOffers({ direction: 'sent' })
    const { url, init } = lastCall(fetchMock)
    expect(url.pathname + url.search).toBe('/api/offers?direction=sent')
    expect(init.headers.Authorization).toBe('Bearer tok123')
  })

  it('register sends yearOfStudy as null when missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(201, { user: {}, token: 't' }))
    vi.stubGlobal('fetch', fetchMock)
    await remote.register({ name: 'A', email: 'a@b.co', password: 'password123' })
    expect(lastCall(fetchMock).body).toEqual({
      name: 'A',
      email: 'a@b.co',
      password: 'password123',
      yearOfStudy: null,
    })
  })

  it('writes use the right method, path and body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, {}))
    vi.stubGlobal('fetch', fetchMock)
    await remote.createListing({ title: 'x' })
    expect([lastCall(fetchMock).init.method, lastCall(fetchMock).url.pathname]).toEqual([
      'POST',
      '/api/listings',
    ])
    await remote.updateListing('lst_1', { status: 'sold' })
    expect(lastCall(fetchMock).init.method).toBe('PATCH')
    expect(lastCall(fetchMock).body).toEqual({ status: 'sold' })
    await remote.makeOffer('lst_1', { amountCents: 900 })
    expect(lastCall(fetchMock).url.pathname).toBe('/api/listings/lst_1/offers')
    expect(lastCall(fetchMock).body).toEqual({ amountCents: 900, message: '' })
    await remote.respondToOffer('off_1', 'counter', 1200)
    expect(lastCall(fetchMock).body).toEqual({ action: 'counter', counterCents: 1200 })
    await remote.respondToOffer('off_1', 'accept')
    expect(lastCall(fetchMock).body).toEqual({ action: 'accept' })
  })

  it('deleteListing resolves to undefined on 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(204)))
    await expect(remote.deleteListing('lst_1')).resolves.toBeUndefined()
  })

  it('uploads a photo as multipart without a JSON content type', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(reply(201, { url: 'http://api.test/api/uploads/upl_1' }))
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['x'], 'cover.png', { type: 'image/png' })
    expect(await remote.uploadPhoto(file)).toEqual({
      url: 'http://api.test/api/uploads/upl_1',
    })
    const { init } = lastCall(fetchMock)
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.body.get('photo')).toBe(file)
    expect(init.headers['Content-Type']).toBeUndefined()
  })

  it('turns A4 errors into ApiError with status, fields and closest', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          reply(404, { message: 'No CHEM 999 in the index.', closest: ['CHEM 201'] }),
        ),
    )
    const err = await remote.getCourse('CHEM-999').catch((e) => e)
    expect(err).toBeInstanceOf(remote.ApiError)
    expect([err.status, err.message, err.closest]).toEqual([
      404,
      'No CHEM 999 in the index.',
      ['CHEM 201'],
    ])
  })

  it('reports a network failure as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const err = await remote.getNewListings().catch((e) => e)
    expect(err.status).toBe(0)
  })

  it('a 401 with a stored token signs out and tells the app', async () => {
    http.setToken('expired')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reply(401, { message: 'Sign in to continue.' })),
    )
    const heard = vi.fn()
    window.addEventListener(http.SIGNED_OUT_EVENT, heard)
    expect(await remote.getCurrentUser()).toBeNull()
    window.removeEventListener(http.SIGNED_OUT_EVENT, heard)
    expect(http.getToken()).toBeNull()
    expect(heard).toHaveBeenCalledOnce()
  })

  it('getCurrentUser skips the request when there is no token', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await remote.getCurrentUser()).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('logout always clears the token, even offline', async () => {
    http.setToken('t')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await remote.logout()
    expect(http.getToken()).toBeNull()
  })

  it('reuses the course index for 60 seconds, but never a failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(500, { message: 'Something went wrong. Try again.' }))
      .mockResolvedValue(reply(200, [{ code: 'CHEM 201' }]))
    vi.stubGlobal('fetch', fetchMock)
    await expect(remote.getCourses()).rejects.toThrow()
    const first = await remote.getCourses()
    first[0].code = 'mutated'
    expect(await remote.getCourses()).toEqual([{ code: 'CHEM 201' }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
