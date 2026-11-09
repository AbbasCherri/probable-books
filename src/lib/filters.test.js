import { describe, expect, it } from 'vitest'
import { PAGE_SIZE } from './constants'
import { filtersToParams, parseFilters } from './filters'

const parse = (query) => parseFilters(new URLSearchParams(query))

describe('parseFilters', () => {
  it('returns defaults for an empty query', () => {
    expect(parse('')).toEqual({
      q: undefined,
      courses: [],
      categories: [],
      conditions: [],
      minPrice: undefined,
      maxPrice: undefined,
      openToOffers: undefined,
      sort: 'newest',
      page: 1,
      pageSize: PAGE_SIZE,
    })
  })

  it('trims q and drops a blank one', () => {
    expect(parse('q=%20%20calculus%20').q).toBe('calculus')
    expect(parse('q=%20%20%20').q).toBeUndefined()
  })

  it('normalises and dedupes course codes, dropping junk', () => {
    expect(
      parse('course=chem-201&course=CHEM%20201,math101&course=nope').courses,
    ).toEqual(['CHEM 201', 'MATH 101'])
  })

  it('whitelists and dedupes categories and conditions', () => {
    const f = parse(
      'category=textbook,textbook&category=toaster&condition=good&condition=good,mint,worn',
    )
    expect(f.categories).toEqual(['textbook'])
    expect(f.conditions).toEqual(['good', 'worn'])
  })

  it('rejects inherited object keys as enum values', () => {
    const f = parse('category=toString&condition=__proto__&sort=constructor')
    expect(f.categories).toEqual([])
    expect(f.conditions).toEqual([])
    expect(f.sort).toBe('newest')
  })

  it('whitelists sort', () => {
    expect(parse('sort=price_asc').sort).toBe('price_asc')
    expect(parse('sort=cheapest').sort).toBe('newest')
  })

  it('converts plain decimal dollar prices to cents', () => {
    const f = parse('minPrice=5&maxPrice=12.5')
    expect(f.minPrice).toBe(500)
    expect(f.maxPrice).toBe(1250)
  })

  it.each(['-5', '1e3', 'abc', '5.', '.5', '0x10', 'Infinity', ''])(
    'treats price %j as unset',
    (value) => {
      expect(parse(`minPrice=${encodeURIComponent(value)}`).minPrice).toBeUndefined()
    },
  )

  it('swaps a min price above the max price', () => {
    const f = parse('minPrice=40&maxPrice=10')
    expect(f.minPrice).toBe(1000)
    expect(f.maxPrice).toBe(4000)
  })

  it('reads openToOffers only when it is exactly "true"', () => {
    expect(parse('openToOffers=true').openToOffers).toBe(true)
    expect(parse('openToOffers=1').openToOffers).toBeUndefined()
  })

  it.each([
    ['page=3', 3],
    ['page=0', 1],
    ['page=-2', 1],
    ['page=2.5', 1],
    ['page=abc', 1],
    ['page=99999999999', 100000],
  ])('sanitises %s to page %i', (query, page) => {
    expect(parse(query).page).toBe(page)
  })
})

describe('filtersToParams', () => {
  it('round-trips through parseFilters', () => {
    const query =
      'q=lab&course=CHEM-201&category=lab_gear&condition=good&minPrice=5&maxPrice=20&openToOffers=true&sort=price_desc&page=2'
    expect(parse(filtersToParams(parse(query)).toString())).toEqual(parse(query))
  })

  it('leaves defaults out of the URL', () => {
    expect(filtersToParams(parse('')).toString()).toBe('')
  })
})
