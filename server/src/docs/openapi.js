// Interactive documentation (requirements P2). Shared parts live here: data shapes (A6),
// the error format (A4), common failures and token entry. Each endpoint is documented by its
// owner with an @openapi JSDoc block next to the route in src/routes/*.js.
import { fileURLToPath } from 'node:url'
import swaggerJsdoc from 'swagger-jsdoc'

const routesGlob = fileURLToPath(new URL('../routes/*.js', import.meta.url))

const nullable = (schema) => ({ ...schema, nullable: true })
const dateTime = {
  type: 'string',
  format: 'date-time',
  example: '2026-11-18T12:30:00.000Z',
}
const cents = { type: 'integer', minimum: 0, description: 'Whole cents (1250 = $12.50).' }
const errorResponse = (description, example) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: { message: example },
    },
  },
})

export const PICKUP_SPOTS = [
  'Science building lobby',
  'Main library entrance',
  'Student union café',
  'Engineering quad',
  'Bookstore steps',
]

const userPublic = {
  type: 'object',
  required: ['id', 'name', 'memberSince', 'yearOfStudy', 'usualPickupSpot'],
  properties: {
    id: { type: 'string', example: 'usr_lina' },
    name: { type: 'string', example: 'Lina K.' },
    memberSince: { ...dateTime, description: 'When the account was created.' },
    yearOfStudy: nullable({ type: 'integer', example: 3 }),
    usualPickupSpot: nullable({ $ref: '#/components/schemas/PickupSpot' }),
  },
}

const listing = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'lst_001' },
    title: { type: 'string', example: 'Organic Chemistry, 4th edition' },
    category: { $ref: '#/components/schemas/Category' },
    courseCodes: {
      type: 'array',
      items: { type: 'string', example: 'CHEM 201' },
      description: 'Spaced form.',
    },
    author: nullable({ type: 'string' }),
    edition: nullable({ type: 'string' }),
    isbn: nullable({ type: 'string', description: 'Digits only.' }),
    brand: nullable({ type: 'string' }),
    model: nullable({ type: 'string' }),
    condition: { $ref: '#/components/schemas/Condition' },
    conditionNotes: { type: 'array', items: { type: 'string' } },
    description: { type: 'string', description: 'Empty text if none.' },
    priceCents: { ...cents, example: 4500 },
    retailCents: nullable({ ...cents, example: 14900 }),
    openToOffers: { type: 'boolean' },
    photos: { type: 'array', items: { $ref: '#/components/schemas/Photo' } },
    pickupSpot: { $ref: '#/components/schemas/PickupSpot' },
    status: { $ref: '#/components/schemas/ListingStatus' },
    featured: { type: 'boolean', description: 'Set by the team, not by sellers.' },
    sellerId: { type: 'string', example: 'usr_lina' },
    createdAt: dateTime,
    updatedAt: dateTime,
  },
}

const course = {
  type: 'object',
  properties: {
    code: { type: 'string', example: 'CHEM 201' },
    department: { type: 'string', example: 'CHEM' },
    number: { type: 'string', example: '201' },
    title: { type: 'string', example: 'Organic Chemistry I' },
    requiredMaterials: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          category: { $ref: '#/components/schemas/Category' },
          keywords: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    tips: { type: 'array', items: { type: 'string' } },
    relatedCodes: { type: 'array', items: { type: 'string' } },
  },
}

const nameTag = {
  type: 'object',
  properties: { id: { type: 'string' }, name: { type: 'string' } },
}

const offer = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'off_001' },
    listingId: { type: 'string' },
    buyerId: { type: 'string' },
    amountCents: cents,
    message: { type: 'string', description: 'Empty text if none.' },
    status: { $ref: '#/components/schemas/OfferStatus' },
    counterCents: nullable({
      ...cents,
      description: 'Set only when the seller countered.',
    }),
    createdAt: dateTime,
  },
}

export const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Probable Books API',
    version: '1.0.0',
    description:
      'Textbook and gear marketplace (CSC443 Phase 2). JSON in and out; money in whole ' +
      'cents; dates in ISO 8601 UTC. To try a Required endpoint, sign in with ' +
      '`POST /api/auth/login` (demo@probable.books / password123), then press **Authorize** ' +
      'and paste the token.',
  },
  servers: [{ url: '/', description: 'This server' }],
  tags: [
    { name: 'Listings', description: 'Browse, read and write listings.' },
    { name: 'Courses', description: 'Course index.' },
    { name: 'Offers', description: 'Offers on listings.' },
    { name: 'Auth', description: 'Accounts and sign-in.' },
    { name: 'Users', description: 'Profiles.' },
    { name: 'Uploads', description: 'Listing photos.' },
    { name: 'Platform', description: 'Health and documentation.' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token from register or login. Valid for 7 days.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['message'],
        description: 'Every failure uses this body (A4).',
        properties: {
          message: { type: 'string', description: 'Shown to the user as written.' },
          fields: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Only for 422 on a form: field name to message.',
          },
          closest: {
            type: 'array',
            items: { type: 'string' },
            description: 'Only for an unknown course code.',
          },
        },
      },
      Category: { type: 'string', enum: ['textbook', 'calculator', 'lab_gear', 'other'] },
      Condition: {
        type: 'string',
        enum: ['new', 'like_new', 'good', 'fair', 'worn'],
        description: 'Best to worst: A+, A, B, C, D.',
      },
      ListingStatus: { type: 'string', enum: ['draft', 'active', 'reserved', 'sold'] },
      OfferStatus: {
        type: 'string',
        enum: ['pending', 'accepted', 'declined', 'countered', 'withdrawn'],
      },
      PickupSpot: { type: 'string', enum: PICKUP_SPOTS },
      Photo: {
        type: 'object',
        required: ['url', 'alt'],
        properties: {
          url: { type: 'string', example: 'https://res.cloudinary.com/.../cover.jpg' },
          alt: { type: 'string', description: 'May be empty text.' },
        },
      },
      User: userPublic,
      UserSelf: {
        allOf: [
          { $ref: '#/components/schemas/User' },
          {
            type: 'object',
            required: ['email'],
            properties: { email: { type: 'string', format: 'email' } },
          },
        ],
        description: 'Only ever returned to the account owner.',
      },
      UserProfile: {
        allOf: [
          { $ref: '#/components/schemas/User' },
          { type: 'object', properties: { activeListingCount: { type: 'integer' } } },
        ],
      },
      Listing: listing,
      ListingDetail: {
        allOf: [
          { $ref: '#/components/schemas/Listing' },
          {
            type: 'object',
            properties: {
              seller: {
                allOf: [
                  { $ref: '#/components/schemas/User' },
                  {
                    type: 'object',
                    properties: {
                      activeListingCount: { type: 'integer' },
                      email: {
                        type: 'string',
                        description: 'Only when the request carries a valid token.',
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
      MyListing: {
        allOf: [
          { $ref: '#/components/schemas/Listing' },
          {
            type: 'object',
            properties: {
              offerCount: { type: 'integer', description: 'Pending offers on it.' },
            },
          },
        ],
      },
      ListingPage: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/Listing' } },
          total: { type: 'integer', description: 'Matches across all pages.' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
        },
      },
      Offer: offer,
      OfferWithContext: {
        allOf: [
          { $ref: '#/components/schemas/Offer' },
          {
            type: 'object',
            properties: {
              listing: nullable({
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  priceCents: cents,
                  courseCodes: { type: 'array', items: { type: 'string' } },
                  status: { $ref: '#/components/schemas/ListingStatus' },
                  sellerName: { type: 'string' },
                },
              }),
              buyer: nameTag,
              seller: nameTag,
            },
          },
        ],
      },
      Course: {
        allOf: [
          course,
          {
            type: 'object',
            properties: {
              listingCount: { type: 'integer', description: 'Active listings tagged.' },
            },
          },
        ],
      },
      CourseDetail: {
        allOf: [
          course,
          {
            type: 'object',
            properties: {
              stats: {
                type: 'object',
                properties: {
                  listingCount: { type: 'integer' },
                  minCents: nullable(cents),
                  medianCents: nullable(cents),
                },
              },
            },
          },
        ],
      },
    },
    responses: {
      BadRequest: errorResponse(
        'Body is not valid JSON.',
        'That request could not be read.',
      ),
      Unauthorized: errorResponse(
        'Missing, invalid or expired token.',
        'Sign in to continue.',
      ),
      Forbidden: errorResponse(
        'Signed in, but not allowed.',
        'That listing is not yours.',
      ),
      NotFound: errorResponse('Does not exist.', 'This page was torn out.'),
      Unprocessable: {
        description: 'Invalid input or a broken business rule.',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              message: 'Enter an asking price above $0.',
              fields: { priceCents: 'Enter an asking price above $0.' },
            },
          },
        },
      },
      TooManyRequests: errorResponse(
        'Too many attempts.',
        'Too many attempts. Wait a few minutes and try again.',
      ),
      ServerError: errorResponse(
        'Anything unexpected.',
        'Something went wrong. Try again.',
      ),
    },
  },
}

/** The full OpenAPI document: shared definition plus every route's @openapi block. */
export function buildSpec() {
  return swaggerJsdoc({ definition, apis: [routesGlob] })
}
