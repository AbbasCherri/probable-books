// Labels, grades and descriptions for every enum (design doc section 6).
export const CONDITIONS = {
  new: {
    grade: 'A+',
    label: 'New',
    description: 'Unused, as it came from the shop.',
    rank: 0,
  },
  like_new: {
    grade: 'A',
    label: 'Like new',
    description: 'Opened, barely used. No marks.',
    rank: 1,
  },
  good: {
    grade: 'B',
    label: 'Good',
    description: 'Some highlighting or notes. Every page intact.',
    rank: 2,
  },
  fair: {
    grade: 'C',
    label: 'Fair',
    description: 'Heavy marks or wear. Still fully usable.',
    rank: 3,
  },
  worn: {
    grade: 'D',
    label: 'Well-worn',
    description: 'Cosmetic damage, loose pages or missing extras.',
    rank: 4,
  },
}
export const CONDITION_KEYS = Object.keys(CONDITIONS)

export const CATEGORIES = {
  textbook: { label: 'Textbooks' },
  calculator: { label: 'Calculators' },
  lab_gear: { label: 'Lab gear' },
  other: { label: 'Other' },
}
export const CATEGORY_KEYS = Object.keys(CATEGORIES)

export const LISTING_STATUSES = {
  draft: { label: 'Draft' },
  active: { label: 'Active' },
  reserved: { label: 'Reserved' },
  sold: { label: 'Sold' },
}

export const OFFER_STATUSES = {
  pending: { label: 'Pending' },
  accepted: { label: 'Accepted' },
  declined: { label: 'Declined' },
  countered: { label: 'Countered' },
  withdrawn: { label: 'Withdrawn' },
}

export const SORTS = {
  newest: 'Newest',
  price_asc: 'Price low to high',
  price_desc: 'Price high to low',
  condition: 'Best condition',
}

export const PICKUP_SPOTS = [
  'Science building lobby',
  'Main library entrance',
  'Student union café',
  'Engineering quad',
  'Bookstore steps',
]

export const PAGE_SIZE = 24
export const DEMO_ACCOUNT = { email: 'demo@probable.books', password: 'password123' }
export const THEME_KEY = 'pb.theme'
