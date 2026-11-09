// Deterministic helpers for the mock seed. A seeded PRNG (no runtime randomness) means the same
// seed always builds the same listings, so screenshots, tests and bug reports line up.

export const DAY = 86400000
export const isoAgo = (now, days) => new Date(now - days * DAY).toISOString()

/** Small, fast 32-bit PRNG. Returns a function giving floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 12-digit stem -> full ISBN-13 with its check digit. */
export function isbn13(stem) {
  const d = String(stem).replace(/\D/g, '')
  if (d.length !== 12) throw new Error(`ISBN stem needs 12 digits: ${stem}`)
  let sum = 0
  for (let i = 0; i < 12; i += 1) sum += Number(d[i]) * (i % 2 === 0 ? 1 : 3)
  return `${d}${(10 - (sum % 10)) % 10}`
}

export const COVERS = {
  red: '/mock/cover-textbook-red.svg',
  blue: '/mock/cover-textbook-blue.svg',
  green: '/mock/cover-textbook-green.svg',
  ochre: '/mock/cover-textbook-ochre.svg',
  notebook: '/mock/cover-notebook.svg',
  calculator: '/mock/calculator.svg',
  labgear: '/mock/labgear.svg',
  labcoat: '/mock/labcoat.svg',
}

/** Photo objects in the Listing shape: { url, alt }. The first is the cover. */
export function photosFor(title, keys) {
  return keys.map((k, i) => ({
    url: COVERS[k],
    alt: `${title}, photo ${i + 1} of ${keys.length}`,
  }))
}

/** Defaults for every Listing field, so seed entries only state what matters. */
export function listing(o) {
  return {
    author: null,
    edition: null,
    isbn: null,
    brand: null,
    model: null,
    conditionNotes: [],
    description: '',
    retailCents: null,
    openToOffers: true,
    photos: [],
    pickupSpot: 'Science building lobby',
    status: 'active',
    featured: false,
    ...o,
    updatedAt: o.updatedAt ?? o.createdAt,
  }
}

// ---------- generated listings ----------

const book = (courseCodes, title, author, edition, retailCents, stem, cover) => ({
  category: 'textbook',
  courseCodes,
  titles: [title],
  author,
  edition,
  isbn: stem ? isbn13(stem) : null,
  retailCents,
  covers: cover ? [cover] : [],
})
const thing = (category, courseCodes, titles, brand, model, retailCents, cover) => ({
  category,
  courseCodes,
  titles: [].concat(titles),
  brand,
  model,
  retailCents,
  covers: cover ? [cover] : [],
})

const KLEIN_4 = book(
  ['CHEM 201', 'CHEM 202'],
  'Organic Chemistry, 4th edition',
  'David Klein',
  '4th edition',
  18900,
  '978111965959',
  'red',
)
const LAB_COAT = thing(
  'lab_gear',
  ['CHEM 201', 'BIOL 201'],
  ['Lab coat, size S', 'Lab coat, size M', 'Lab coat, size L', 'Lab coat, knee length'],
  null,
  null,
  3500,
  'labcoat',
)
const CASIO_991 = thing(
  'calculator',
  ['EECE 230', 'MATH 201', 'STAT 230'],
  'Casio fx-991EX ClassWiz',
  'Casio',
  'fx-991EX',
  3000,
  'calculator',
)

// Templates by the course they are generated for.
const POOLS = {
  'CHEM 201': [
    KLEIN_4,
    book(
      ['CHEM 201', 'CHEM 202'],
      'Organic Chemistry, 3rd edition',
      'David Klein',
      '3rd edition',
      16500,
      '978111831615',
      'red',
    ),
    book(
      ['CHEM 201'],
      'Organic Chemistry as a Second Language',
      'David Klein',
      '5th edition',
      5800,
      '978111911066',
      'ochre',
    ),
    book(
      ['CHEM 201', 'CHEM 202'],
      'Study Guide and Solutions Manual for Organic Chemistry',
      'David Klein',
      '4th edition',
      9200,
      '978111965961',
      'blue',
    ),
    thing(
      'lab_gear',
      ['CHEM 201', 'CHEM 202'],
      ['Molecular model kit', 'Molymod organic model set'],
      'Molymod',
      'MMS-008',
      3200,
      'labgear',
    ),
    LAB_COAT,
    thing(
      'lab_gear',
      ['CHEM 201', 'BIOL 201'],
      ['Splash goggles', 'Splash goggles, anti-fog', 'Chemical splash goggles'],
      'Uvex',
      'Stealth',
      2200,
      'labgear',
    ),
    thing(
      'other',
      ['CHEM 201'],
      'Organic chemistry flashcards, 300 cards',
      null,
      null,
      2400,
      'notebook',
    ),
    thing(
      'other',
      ['CHEM 201', 'CHEM 202'],
      'Lab notebook with carbonless copies',
      'Hayden-McNeil',
      null,
      2600,
      'notebook',
    ),
    thing(
      'calculator',
      ['CHEM 201', 'STAT 230'],
      'Casio fx-82MS scientific calculator',
      'Casio',
      'fx-82MS',
      1500,
      'calculator',
    ),
  ],
  'CHEM 202': [
    { ...KLEIN_4, courseCodes: ['CHEM 202'] },
    book(
      ['CHEM 202'],
      'Introduction to Spectroscopy, 5th edition',
      'Pavia, Lampman, Kriz',
      '5th edition',
      15000,
      '978128546012',
      'blue',
    ),
    thing('other', ['CHEM 202'], 'Organic reactions wall chart', null, null, 1200, null),
  ],
  'BIOL 201': [
    book(
      ['BIOL 201'],
      'Molecular Biology of the Cell, 6th edition',
      'Alberts',
      '6th edition',
      21000,
      '978081534524',
      'green',
    ),
    book(
      ['BIOL 201', 'BIOL 210'],
      'Essential Cell Biology, 5th edition',
      'Alberts',
      '5th edition',
      12500,
      '978039368039',
      'green',
    ),
    LAB_COAT,
    thing(
      'lab_gear',
      ['BIOL 201'],
      'Dissection kit, 12 pieces',
      'Fisherbrand',
      null,
      2800,
      'labgear',
    ),
    thing(
      'lab_gear',
      ['BIOL 201', 'CHEM 201'],
      'Nitrile gloves, box of 100',
      null,
      null,
      1400,
      null,
    ),
  ],
  'BIOL 210': [
    book(
      ['BIOL 210'],
      'Genetics: From Genes to Genomes, 7th edition',
      'Hartwell',
      '7th edition',
      19500,
      '978126024140',
      'green',
    ),
    book(
      ['BIOL 210'],
      'Essential Genetics and Genomics',
      'Daniel Hartl',
      '7th edition',
      14000,
      '978128413602',
      'ochre',
    ),
    thing(
      'other',
      ['BIOL 210'],
      'Genetics problem workbook',
      null,
      null,
      1800,
      'notebook',
    ),
  ],
  'CSC 201': [
    book(
      ['CSC 201'],
      'Introduction to Algorithms, 4th edition',
      'Cormen, Leiserson, Rivest, Stein',
      '4th edition',
      12000,
      '978026204630',
      'blue',
    ),
    book(
      ['CSC 201'],
      'Introduction to Algorithms, 3rd edition',
      'Cormen, Leiserson, Rivest, Stein',
      '3rd edition',
      9500,
      '978026203384',
      'blue',
    ),
    book(
      ['CSC 201'],
      'Data Structures and Algorithms in Java',
      'Goodrich, Tamassia',
      '6th edition',
      14000,
      '978111877133',
      'red',
    ),
    book(
      ['CSC 201', 'MATH 218'],
      'Grokking Algorithms',
      'Aditya Bhargava',
      null,
      4000,
      '978161729223',
      'ochre',
    ),
  ],
  'EECE 230': [
    book(
      ['EECE 230'],
      'Fundamentals of Electric Circuits, 7th edition',
      'Alexander, Sadiku',
      '7th edition',
      21000,
      '978126022640',
      'blue',
    ),
    thing(
      'other',
      ['EECE 230'],
      'Breadboard and component kit',
      'Elegoo',
      null,
      3500,
      'labgear',
    ),
    thing(
      'lab_gear',
      ['EECE 230'],
      'Digital multimeter',
      'Fluke',
      '101',
      6500,
      'labgear',
    ),
    CASIO_991,
  ],
  'MATH 201': [
    book(
      ['MATH 201'],
      'Calculus: Early Transcendentals, 8th edition',
      'James Stewart',
      '8th edition',
      17500,
      '978128574155',
      'ochre',
    ),
    book(
      ['MATH 201'],
      'Calculus: Early Transcendentals, 9th edition',
      'James Stewart',
      '9th edition',
      19000,
      '978133761292',
      'ochre',
    ),
    book(
      ['MATH 201'],
      'Student Solutions Manual, Multivariable Calculus',
      'James Stewart',
      '8th edition',
      7000,
      '978130527242',
      'blue',
    ),
    thing(
      'calculator',
      ['MATH 201', 'STAT 230'],
      'TI-30X IIS scientific calculator',
      'Texas Instruments',
      'TI-30X IIS',
      1800,
      'calculator',
    ),
    thing(
      'other',
      ['MATH 201'],
      'Graph paper notebook, 5 mm grid',
      null,
      null,
      600,
      'notebook',
    ),
  ],
  'MATH 218': [
    book(
      ['MATH 218'],
      'Introduction to Linear Algebra, 5th edition',
      'Gilbert Strang',
      '5th edition',
      9000,
      '978098023277',
      'green',
    ),
    book(
      ['MATH 218'],
      'Linear Algebra and Its Applications, 6th edition',
      'Lay, Lay, McDonald',
      '6th edition',
      16000,
      '978013585125',
      'red',
    ),
    book(
      ['MATH 218'],
      'Linear Algebra Done Right',
      'Sheldon Axler',
      '3rd edition',
      5500,
      '978331911079',
      'ochre',
    ),
  ],
  'PHYS 210': [
    book(
      ['PHYS 210'],
      'University Physics, 15th edition',
      'Young, Freedman',
      '15th edition',
      22000,
      '978013515955',
      'blue',
    ),
    book(
      ['PHYS 210'],
      'University Physics, 14th edition',
      'Young, Freedman',
      '14th edition',
      18000,
      '978013397798',
      'blue',
    ),
    book(
      ['PHYS 210', 'MATH 201'],
      'Fundamentals of Physics, 11th edition',
      'Halliday, Resnick, Walker',
      '11th edition',
      19000,
      '978111923072',
      'red',
    ),
    thing('other', ['PHYS 210'], 'Physics lab manual', null, null, 2500, 'notebook'),
  ],
  'STAT 230': [
    book(
      ['STAT 230'],
      'Probability and Statistics for Engineers and Scientists',
      'Walpole, Myers',
      '9th edition',
      11000,
      '978032162911',
      'green',
    ),
    book(
      ['STAT 230'],
      'Applied Statistics and Probability for Engineers',
      'Montgomery, Runger',
      '7th edition',
      17000,
      '978111953980',
      'red',
    ),
    thing(
      'calculator',
      ['STAT 230', 'MATH 201'],
      'TI-84 Plus CE graphing calculator',
      'Texas Instruments',
      'TI-84 Plus CE',
      15000,
      'calculator',
    ),
    thing('other', ['STAT 230'], 'Statistical tables booklet', null, null, 800, null),
  ],
  'ECON 211': [
    book(
      ['ECON 211'],
      'Intermediate Microeconomics, 9th edition',
      'Hal Varian',
      '9th edition',
      16500,
      '978039312396',
      'ochre',
    ),
    book(
      ['ECON 211'],
      'Workouts in Intermediate Microeconomics',
      'Bergstrom, Varian',
      '9th edition',
      6500,
      '978039392363',
      'notebook',
    ),
    book(
      ['ECON 211'],
      'Microeconomics, 9th edition',
      'Pindyck, Rubinfeld',
      '9th edition',
      18000,
      '978013418424',
      'red',
    ),
    thing(
      'calculator',
      ['ECON 211'],
      'Casio HS-8VA basic calculator',
      'Casio',
      'HS-8VA',
      900,
      'calculator',
    ),
  ],
  'PSYC 201': [
    book(
      ['PSYC 201'],
      'Psychology, 13th edition',
      'Myers, DeWall',
      '13th edition',
      15500,
      '978131925047',
      'red',
    ),
    book(
      ['PSYC 201'],
      'Psychology, 12th edition',
      'Myers, DeWall',
      '12th edition',
      12000,
      '978131905062',
      'red',
    ),
    thing('other', ['PSYC 201'], 'Psychology flashcards', null, null, 1500, 'notebook'),
  ],
  'ENGL 203': [
    book(
      ['ENGL 203'],
      'They Say / I Say, 5th edition',
      'Graff, Birkenstein',
      '5th edition',
      3000,
      '978039353870',
      'blue',
    ),
    book(
      ['ENGL 203'],
      'The Elements of Style',
      'Strunk, White',
      '4th edition',
      1000,
      '978020530902',
      'ochre',
    ),
  ],
  'ARCH 221': [
    book(
      ['ARCH 221'],
      'Architectural Graphics, 6th edition',
      'Francis Ching',
      '6th edition',
      4500,
      '978111903566',
      'ochre',
    ),
    thing(
      'other',
      ['ARCH 221'],
      'Triangular scale ruler, 30 cm',
      'Staedtler',
      null,
      1600,
      null,
    ),
    thing(
      'other',
      ['ARCH 221'],
      'Drafting kit with compass',
      'Rotring',
      null,
      6000,
      null,
    ),
    thing(
      'other',
      ['ARCH 221'],
      'Lead holder and sharpener set',
      'Staedtler',
      'Mars 780',
      2500,
      null,
    ),
  ],
}

// How many listings to generate per course. CHEM 201 gets enough for several Browse pages.
// HIST 201 is left out on purpose: it is the course with no listings.
const PLAN = [
  ['CHEM 201', 34],
  ['CHEM 202', 4],
  ['BIOL 201', 7],
  ['BIOL 210', 5],
  ['CSC 201', 7],
  ['EECE 230', 6],
  ['MATH 201', 8],
  ['MATH 218', 5],
  ['PHYS 210', 6],
  ['STAT 230', 6],
  ['ECON 211', 6],
  ['PSYC 201', 6],
  ['ENGL 203', 3],
  ['ARCH 221', 5],
]

const SELLERS = [
  ['usr_lina', 'Main library entrance'],
  ['usr_jad', 'Student union café'],
  ['usr_nour', 'Engineering quad'],
  ['usr_max', 'Bookstore steps'],
  ['usr_omar', 'Engineering quad'],
  ['usr_sara', 'Main library entrance'],
]
const SPOTS = [
  'Science building lobby',
  'Main library entrance',
  'Student union café',
  'Engineering quad',
  'Bookstore steps',
]
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'worn']
// Share of retail a seller asks for, by condition.
const PRICE_FACTOR = { new: 0.7, like_new: 0.55, good: 0.42, fair: 0.3, worn: 0.2 }
const NOTES = {
  textbook: [
    'Highlighting in the first few chapters',
    'Pencil notes in the margins',
    'Spine creased',
    'Cover corner bent',
    'Access code already used',
    'Name written inside the cover',
    'Coffee ring on the back cover',
  ],
  calculator: [
    'Battery replaced this term',
    'Slide cover included',
    'Small scratch on the screen',
    'Manual included',
    'Name engraved on the back',
  ],
  lab_gear: [
    'Washed and ironed',
    'Small ink mark on the pocket',
    'Strap slightly loose',
    'All pieces present',
  ],
  other: ['Some pages used', 'Box is worn', 'All pieces present'],
}
const DESCRIPTIONS = [
  'Used for one term. Happy to meet on campus.',
  'Selling because I switched majors.',
  'Clean copy. Can meet between classes.',
  'Works perfectly.',
  '',
  'Bought new this year.',
  'Price is firm unless you take two things.',
  'Message me with any questions.',
  '',
  'Kept on a shelf, never carried around.',
]

/**
 * Builds `count`-ish listings from PLAN with ids lst_{startIndex}... Fully determined by
 * `seed`; only the timestamps depend on `now`.
 */
export function generateListings({ now, seed = 20261108, startIndex = 33 }) {
  const rand = mulberry32(seed)
  const pick = (arr) => arr[Math.floor(rand() * arr.length)]
  const chance = (p) => rand() < p
  const out = []
  let n = startIndex
  for (const [code, count] of PLAN) {
    for (let i = 0; i < count; i += 1) {
      const t = pick(POOLS[code])
      const title = pick(t.titles)
      const condition = pick(CONDITIONS)
      const [sellerId, usualSpot] = pick(SELLERS)
      const raw = t.retailCents * PRICE_FACTOR[condition] * (0.85 + rand() * 0.3)
      let priceCents = Math.max(100, Math.round(raw / 100) * 100)
      if (priceCents > 500 && chance(0.2)) priceCents -= 50
      const r = rand()
      const status = r < 0.8 ? 'active' : r < 0.9 ? 'reserved' : 'sold'
      const days = 0.2 + rand() ** 1.6 * 150
      const notePool = NOTES[t.category]
      const noteCount = condition === 'new' ? 0 : Math.floor(rand() * 3)
      const conditionNotes = []
      for (let k = 0; k < noteCount; k += 1) {
        const note = pick(notePool)
        if (!conditionNotes.includes(note)) conditionNotes.push(note)
      }
      const p = rand()
      const coverKeys = !t.covers.length
        ? []
        : p < 0.35
          ? []
          : p < 0.9
            ? [t.covers[0]]
            : [t.covers[0], 'notebook', t.covers[0]]
      out.push(
        listing({
          id: `lst_${String(n).padStart(3, '0')}`,
          title,
          category: t.category,
          courseCodes: [...t.courseCodes],
          author: t.author ?? null,
          edition: t.edition ?? null,
          isbn: t.isbn ?? null,
          brand: t.brand ?? null,
          model: t.model ?? null,
          condition,
          conditionNotes,
          description: pick(DESCRIPTIONS),
          priceCents,
          retailCents: chance(0.7) ? t.retailCents : null,
          openToOffers: chance(0.75),
          photos: photosFor(title, coverKeys),
          pickupSpot: chance(0.6) ? usualSpot : pick(SPOTS),
          sellerId,
          status,
          createdAt: isoAgo(now, days),
          updatedAt: status === 'active' ? undefined : isoAgo(now, days / 2),
        }),
      )
      n += 1
    }
  }
  return out
}
