import { describe, it, expect } from 'vitest'
import {
  MAX_COURSES,
  MAX_DESCRIPTION,
  MAX_NOTES,
  MAX_NOTE_LENGTH,
  MAX_OFFER_MESSAGE,
  MAX_PHOTOS,
  MAX_PRICE_CENTS,
  MIN_PHOTOS,
  MIN_PRICE_CENTS,
  TITLE_MAX,
  TITLE_MIN,
  isValidIsbn,
  validateListingInput,
} from '@/lib/listingRules'
import * as form from '@/pages/listing-form/listingForm'
import { isValidIsbn as formIsValidIsbn } from '@/pages/listing-form/validateListing'

const valid = () => ({
  title: 'Organic Chemistry, 4th edition',
  category: 'textbook',
  courseCodes: ['CHEM 201'],
  author: 'David Klein',
  edition: '4th edition',
  isbn: '9780306406157',
  brand: null,
  model: null,
  condition: 'good',
  conditionNotes: ['Highlighting in ch. 1 to 6'],
  description: 'Spine is solid.',
  priceCents: 4500,
  retailCents: 18900,
  openToOffers: true,
  photos: [{ url: '/mock/cover-textbook-red.svg', alt: 'Cover' }],
  pickupSpot: 'Science building lobby',
  status: 'active',
})

describe('limits', () => {
  it('match the design doc', () => {
    expect(TITLE_MIN).toBe(5)
    expect(TITLE_MAX).toBe(120)
    expect(MAX_COURSES).toBe(5)
    expect(MAX_NOTES).toBe(5)
    expect(MAX_NOTE_LENGTH).toBe(80)
    expect(MIN_PHOTOS).toBe(0)
    expect(MAX_PHOTOS).toBe(6)
    expect(MAX_DESCRIPTION).toBe(1000)
    expect(MIN_PRICE_CENTS).toBe(1)
    expect(MAX_PRICE_CENTS).toBeGreaterThanOrEqual(95000)
    expect(MAX_OFFER_MESSAGE).toBe(280)
  })

  it('are the same values the sell form uses', () => {
    expect(form.TITLE_MIN).toBe(TITLE_MIN)
    expect(form.TITLE_MAX).toBe(TITLE_MAX)
    expect(form.MAX_COURSES).toBe(MAX_COURSES)
    expect(form.MAX_NOTES).toBe(MAX_NOTES)
    expect(form.MAX_NOTE_LENGTH).toBe(MAX_NOTE_LENGTH)
    expect(form.MAX_PHOTOS).toBe(MAX_PHOTOS)
    expect(form.MAX_DESCRIPTION).toBe(MAX_DESCRIPTION)
    expect(formIsValidIsbn).toBe(isValidIsbn)
  })
})

describe('isValidIsbn', () => {
  it('accepts ISBN-13 and ISBN-10 with good check digits', () => {
    expect(isValidIsbn('9780306406157')).toBe(true)
    expect(isValidIsbn('978-0-306-40615-7')).toBe(true)
    expect(isValidIsbn('0306406152')).toBe(true)
    expect(isValidIsbn('080442957X')).toBe(true)
  })

  it('rejects bad check digits and shapes', () => {
    expect(isValidIsbn('9780306406158')).toBe(false)
    expect(isValidIsbn('978-0-00-000101')).toBe(false)
    expect(isValidIsbn('')).toBe(false)
    expect(isValidIsbn(null)).toBe(false)
    expect(isValidIsbn('abc')).toBe(false)
  })
})

describe('validateListingInput', () => {
  it('passes a complete listing', () => {
    expect(validateListingInput(valid())).toEqual({})
  })

  it('accepts zero photos and up to six', () => {
    expect(validateListingInput({ ...valid(), photos: [] })).toEqual({})
    const six = Array.from({ length: 6 }, (_, i) => ({ url: `/p${i}.svg`, alt: '' }))
    expect(validateListingInput({ ...valid(), photos: six })).toEqual({})
    expect(validateListingInput({ ...valid(), photos: [...six, six[0]] })).toHaveProperty(
      'photos',
    )
  })

  it('checks title length after trimming', () => {
    expect(validateListingInput({ ...valid(), title: '  abc  ' })).toHaveProperty('title')
    expect(validateListingInput({ ...valid(), title: 'x'.repeat(120) })).toEqual({})
    expect(validateListingInput({ ...valid(), title: 'x'.repeat(121) })).toHaveProperty(
      'title',
    )
    expect(validateListingInput({ ...valid(), title: undefined })).toHaveProperty('title')
  })

  it('needs 1 to 5 well-formed course codes', () => {
    expect(validateListingInput({ ...valid(), courseCodes: [] })).toHaveProperty(
      'courseCodes',
    )
    const five = ['CHEM 201', 'CHEM 202', 'BIOL 201', 'MATH 201', 'PHYS 210']
    expect(validateListingInput({ ...valid(), courseCodes: five })).toEqual({})
    expect(
      validateListingInput({ ...valid(), courseCodes: [...five, 'STAT 230'] }),
    ).toHaveProperty('courseCodes')
    expect(validateListingInput({ ...valid(), courseCodes: ['nope'] })).toHaveProperty(
      'courseCodes',
    )
  })

  it('checks enums', () => {
    expect(validateListingInput({ ...valid(), category: 'shoes' })).toHaveProperty(
      'category',
    )
    expect(validateListingInput({ ...valid(), condition: 'mint' })).toHaveProperty(
      'condition',
    )
    expect(validateListingInput({ ...valid(), status: 'archived' })).toHaveProperty(
      'status',
    )
    expect(validateListingInput({ ...valid(), pickupSpot: 'My house' })).toHaveProperty(
      'pickupSpot',
    )
  })

  it('checks prices are integer cents in bounds', () => {
    expect(validateListingInput({ ...valid(), priceCents: 0 })).toHaveProperty(
      'priceCents',
    )
    expect(validateListingInput({ ...valid(), priceCents: 12.5 })).toHaveProperty(
      'priceCents',
    )
    expect(validateListingInput({ ...valid(), priceCents: '4500' })).toHaveProperty(
      'priceCents',
    )
    expect(
      validateListingInput({ ...valid(), priceCents: MAX_PRICE_CENTS + 1 }),
    ).toHaveProperty('priceCents')
    expect(
      validateListingInput({ ...valid(), priceCents: 100, retailCents: null }),
    ).toEqual({})
    expect(validateListingInput({ ...valid(), retailCents: 4500 })).toHaveProperty(
      'retailCents',
    )
  })

  it('checks notes, description and ISBN', () => {
    expect(
      validateListingInput({ ...valid(), conditionNotes: Array(6).fill('ok') }),
    ).toHaveProperty('conditionNotes')
    expect(
      validateListingInput({ ...valid(), conditionNotes: ['x'.repeat(81)] }),
    ).toHaveProperty('conditionNotes')
    expect(
      validateListingInput({ ...valid(), description: 'x'.repeat(1001) }),
    ).toHaveProperty('description')
    expect(validateListingInput({ ...valid(), isbn: '1234567890123' })).toHaveProperty(
      'isbn',
    )
    expect(validateListingInput({ ...valid(), isbn: null })).toEqual({})
  })

  it('checks openToOffers is a boolean', () => {
    expect(validateListingInput({ ...valid(), openToOffers: 'yes' })).toHaveProperty(
      'openToOffers',
    )
  })

  it('lets a draft skip required fields but not limits', () => {
    const draft = { title: 'Half done', status: 'draft', courseCodes: [] }
    expect(validateListingInput(draft, { draft: true })).toEqual({})
    expect(
      validateListingInput({ ...draft, title: 'x'.repeat(121) }, { draft: true }),
    ).toHaveProperty('title')
    expect(validateListingInput(draft)).toHaveProperty('courseCodes')
  })
})
