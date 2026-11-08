import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import {
  CATEGORY_KEYS,
  CONDITION_KEYS,
  LISTING_STATUSES,
  OFFER_STATUSES,
  PAGE_SIZE,
  PICKUP_SPOTS,
  DEMO_ACCOUNT,
} from '@/lib/constants'
import { normalizeCode } from '@/lib/courses'
import { isValidIsbn, validateListingInput } from '@/lib/listingRules'
import { buildSeed } from '@/services/mock'
import { isbn13, mulberry32 } from '@/services/mock/seedBuilder'

const NOW = Date.parse('2026-11-08T12:00:00Z')
const seed = buildSeed({ now: NOW })
const { courses, users, listings, offers } = seed
const DAY = 86400000
const daysAgo = (l) => (NOW - Date.parse(l.createdAt)) / DAY
const byId = (list) => new Map(list.map((x) => [x.id, x]))
const userById = byId(users)
const listingById = byId(listings)
const courseCodes = new Set(courses.map((c) => c.code))
const root = process.cwd()
const publicDir = resolve(root, 'public')

describe('seed builder', () => {
  it('is deterministic', () => {
    expect(buildSeed({ now: NOW })).toEqual(seed)
  })

  it('has a seeded PRNG in [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const xs = Array.from({ length: 50 }, () => a())
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()))
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
  })

  it('computes ISBN-13 check digits', () => {
    expect(isbn13('978030640615')).toBe('9780306406157')
    expect(isValidIsbn(isbn13('978111965959'))).toBe(true)
  })
})

describe('courses', () => {
  it('has about 15 courses across 8+ departments', () => {
    expect(courses.length).toBeGreaterThanOrEqual(15)
    expect(new Set(courses.map((c) => c.department)).size).toBeGreaterThanOrEqual(8)
  })

  it('keeps the original eight courses', () => {
    for (const code of [
      'BIOL 201',
      'CHEM 201',
      'CHEM 202',
      'CSC 201',
      'EECE 230',
      'MATH 201',
      'PHYS 210',
      'STAT 230',
    ])
      expect(courseCodes.has(code)).toBe(true)
  })

  it('has well-formed courses with valid related codes and materials', () => {
    const materialIds = new Set()
    for (const c of courses) {
      expect(normalizeCode(c.code)).toBe(c.code)
      expect(c.code).toBe(`${c.department} ${c.number}`)
      expect(c.title.length).toBeGreaterThan(3)
      expect(Array.isArray(c.tips)).toBe(true)
      for (const r of c.relatedCodes) {
        expect(courseCodes.has(r), `${c.code} -> ${r}`).toBe(true)
        expect(r).not.toBe(c.code)
      }
      for (const m of c.requiredMaterials) {
        expect(CATEGORY_KEYS).toContain(m.category)
        expect(m.keywords.length).toBeGreaterThan(0)
        expect(materialIds.has(m.id)).toBe(false)
        materialIds.add(m.id)
      }
    }
  })

  it('has a course with no materials, one with no listings and one with 40+', () => {
    expect(courses.some((c) => c.requiredMaterials.length === 0)).toBe(true)
    const counts = courses.map(
      (c) => listings.filter((l) => l.courseCodes.includes(c.code)).length,
    )
    expect(counts).toContain(0)
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(40)
    expect(listings.filter((l) => l.courseCodes.includes('CHEM 201')).length).toBe(
      Math.max(...counts),
    )
  })
})

describe('users', () => {
  it('has about 8 users, all with the demo password and unique emails', () => {
    expect(users.length).toBeGreaterThanOrEqual(8)
    expect(new Set(users.map((u) => u.email)).size).toBe(users.length)
    for (const u of users) {
      expect(u.password).toBe('password123')
      expect(u.email).toBe(u.email.trim().toLowerCase())
      expect(u.id).toMatch(/^usr_/)
    }
  })

  it('keeps the demo account', () => {
    const demo = userById.get('usr_demo')
    expect(demo.email).toBe(DEMO_ACCOUNT.email)
    expect(demo.password).toBe(DEMO_ACCOUNT.password)
  })

  it('has a very long name and a user with no listings', () => {
    expect(users.some((u) => u.name.length >= 45)).toBe(true)
    expect(users.some((u) => !listings.some((l) => l.sellerId === u.id))).toBe(true)
  })
})

describe('listings', () => {
  it('has at least 130 listings with unique lst_ ids, keeping lst_001 to lst_015', () => {
    expect(listings.length).toBeGreaterThanOrEqual(130)
    expect(new Set(listings.map((l) => l.id)).size).toBe(listings.length)
    for (const l of listings) expect(l.id).toMatch(/^lst_/)
    for (let i = 1; i <= 15; i += 1)
      expect(listingById.has(`lst_${String(i).padStart(3, '0')}`)).toBe(true)
  })

  it('fills six Browse pages', () => {
    const visible = listings.filter((l) => l.status !== 'draft').length
    expect(Math.ceil(visible / PAGE_SIZE)).toBe(6)
  })

  it('references real courses and sellers', () => {
    for (const l of listings) {
      expect(userById.has(l.sellerId), l.id).toBe(true)
      expect(l.courseCodes.length).toBeGreaterThan(0)
      for (const c of l.courseCodes) expect(courseCodes.has(c), `${l.id} ${c}`).toBe(true)
    }
  })

  it('passes the listing rules (drafts with the draft rules)', () => {
    for (const l of listings) {
      expect(validateListingInput(l, { draft: l.status === 'draft' }), l.id).toEqual({})
      expect(PICKUP_SPOTS).toContain(l.pickupSpot)
      expect(Date.parse(l.createdAt)).toBeLessThanOrEqual(NOW)
      expect(Date.parse(l.updatedAt)).toBeGreaterThanOrEqual(Date.parse(l.createdAt))
    }
  })

  it('has valid ISBN-13s only', () => {
    const withIsbn = listings.filter((l) => l.isbn)
    expect(withIsbn.length).toBeGreaterThan(20)
    for (const l of withIsbn) {
      expect(l.isbn, l.id).toMatch(/^\d{13}$/)
      expect(isValidIsbn(l.isbn), l.id).toBe(true)
    }
  })

  it('covers every status, with two drafts owned by the demo user', () => {
    for (const s of Object.keys(LISTING_STATUSES))
      expect(listings.some((l) => l.status === s)).toBe(true)
    const drafts = listings.filter((l) => l.status === 'draft')
    expect(drafts).toHaveLength(2)
    expect(drafts.every((l) => l.sellerId === 'usr_demo')).toBe(true)
    const demoStatuses = new Set(
      listings.filter((l) => l.sellerId === 'usr_demo').map((l) => l.status),
    )
    expect([...demoStatuses].sort()).toEqual(['active', 'draft', 'reserved', 'sold'])
  })

  it('covers every category x condition', () => {
    for (const cat of CATEGORY_KEYS)
      for (const cond of CONDITION_KEYS)
        expect(
          listings.some((l) => l.category === cat && l.condition === cond),
          `${cat} ${cond}`,
        ).toBe(true)
  })

  it('has at least five featured active listings', () => {
    expect(
      listings.filter((l) => l.featured && l.status === 'active').length,
    ).toBeGreaterThanOrEqual(5)
  })

  it('has the edge cases', () => {
    const has = (fn) => expect(listings.some(fn)).toBe(true)
    has((l) => l.openToOffers === true)
    has((l) => l.openToOffers === false)
    has((l) => l.retailCents && l.status === 'active')
    has((l) => !l.retailCents && l.status === 'active')
    has((l) => l.title.length === 120)
    has((l) => l.title.length === 40 && !/\s/.test(l.title))
    has((l) => l.courseCodes.length === 5)
    has((l) => l.category === 'textbook' && !l.author && !l.edition)
    has((l) => l.priceCents === 100)
    has((l) => l.priceCents === 95000)
    has((l) => daysAgo(l) < 1)
    has((l) => daysAgo(l) > 5.5 && daysAgo(l) < 6.5)
    has((l) => daysAgo(l) > 7.5 && daysAgo(l) < 8.5)
    has((l) => Math.round(daysAgo(l)) === 30)
    has((l) => Math.round(daysAgo(l)) === 200)
    has((l) => l.photos.length === 0)
    has((l) => l.photos.length === 1)
    has((l) => l.photos.length === 6)
    has((l) => l.description.length >= 900)
    has((l) => l.description.includes('\n'))
  })

  it('uses photos that exist in public/mock and are small', () => {
    const urls = new Set(listings.flatMap((l) => l.photos.map((p) => p.url)))
    expect(urls.size).toBeGreaterThanOrEqual(8)
    for (const url of urls) {
      expect(url).toMatch(/^\/mock\/[a-z0-9-]+\.svg$/)
      const file = `${publicDir}${url}`
      expect(existsSync(file), url).toBe(true)
      expect(statSync(file).size).toBeLessThan(3072)
      const svg = readFileSync(file, 'utf8')
      expect(svg).not.toMatch(/Gradient|filter|blur/i)
    }
    for (const l of listings)
      for (const p of l.photos) expect(typeof p.alt).toBe('string')
  })

  it('is mostly generated, not Math.random', () => {
    const src = readFileSync(resolve(root, 'src/services/mock/seedBuilder.js'), 'utf8')
    expect(src).not.toMatch(/Math\.random/)
  })
})

describe('offers', () => {
  it('has about 30 offers with unique ids and real references', () => {
    expect(offers.length).toBeGreaterThanOrEqual(30)
    expect(new Set(offers.map((o) => o.id)).size).toBe(offers.length)
    for (const o of offers) {
      const l = listingById.get(o.listingId)
      expect(l, o.id).toBeTruthy()
      expect(userById.has(o.buyerId), o.id).toBe(true)
      expect(o.buyerId, o.id).not.toBe(l.sellerId)
      expect(l.status, o.id).not.toBe('draft')
      expect(Number.isInteger(o.amountCents) && o.amountCents > 0).toBe(true)
      expect(o.amountCents, o.id).toBeLessThanOrEqual(l.priceCents)
      expect(o.message.length).toBeLessThanOrEqual(280)
    }
  })

  it('covers every status and keeps them consistent', () => {
    for (const s of Object.keys(OFFER_STATUSES))
      expect(
        offers.some((o) => o.status === s),
        s,
      ).toBe(true)
    for (const o of offers) {
      const l = listingById.get(o.listingId)
      if (o.status === 'pending') {
        expect(l.status, o.id).toBe('active')
        expect(l.openToOffers, o.id).toBe(true)
      }
      if (o.status === 'accepted') expect(['reserved', 'sold'], o.id).toContain(l.status)
      if (o.status === 'countered') {
        expect(o.counterCents, o.id).toBeGreaterThan(o.amountCents)
        expect(o.counterCents, o.id).toBeLessThan(l.priceCents)
      } else expect(o.counterCents, o.id).toBeNull()
    }
  })

  it('has at most one pending offer per buyer per listing, and one accepted per listing', () => {
    const pending = offers.filter((o) => o.status === 'pending')
    const keys = pending.map((o) => `${o.buyerId}:${o.listingId}`)
    expect(new Set(keys).size).toBe(keys.length)
    const accepted = offers.filter((o) => o.status === 'accepted').map((o) => o.listingId)
    expect(new Set(accepted).size).toBe(accepted.length)
  })

  it('has the edge cases', () => {
    const perListing = {}
    for (const o of offers) perListing[o.listingId] = (perListing[o.listingId] ?? 0) + 1
    expect(Math.max(...Object.values(perListing))).toBeGreaterThanOrEqual(4)
    expect(offers.some((o) => o.message.length === 280)).toBe(true)
    expect(offers.some((o) => o.message === '')).toBe(true)
    const demoListings = new Set(
      listings.filter((l) => l.sellerId === 'usr_demo').map((l) => l.id),
    )
    const sent = offers.filter((o) => o.buyerId === 'usr_demo')
    const received = offers.filter((o) => demoListings.has(o.listingId))
    expect(new Set(sent.map((o) => o.status)).size).toBe(5)
    expect(received.length).toBeGreaterThanOrEqual(5)
    expect(received.some((o) => o.status === 'pending')).toBe(true)
    expect(received.some((o) => o.status === 'accepted')).toBe(true)
  })
})
