import express from 'express'
import helmet from 'helmet'
import { docs } from './docs/router.js'
import { errorHandler, notFoundRoute } from './lib/errors.js'
import { optionalAuth } from './middleware/auth.js'
import { corsMiddleware } from './middleware/cors.js'
import { requestLog } from './middleware/requestLog.js'
import { health } from './routes/health.js'
import auth from './routes/auth.js'
import courses from './routes/courses.js'
import listingsBrowse from './routes/listings.browse.js'
import listingsDetail from './routes/listings.detail.js'
import listingsWrite from './routes/listings.write.js'
import offersCreate from './routes/offers.create.js'
import offersRespond from './routes/offers.respond.js'
import uploads from './routes/uploads.js'
import users from './routes/users.js'

export const app = express()

// Behind the host's proxy: lets rate limiting see the real client address.
app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(requestLog)
// No upgrade-insecure-requests: the docs page's "Try it out" must work over plain http locally.
app.use(
  helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }),
)
app.use(corsMiddleware)
app.use(express.json({ limit: '100kb' }))

// Who is calling (A2/A3): a valid token sets req.user; a missing or bad one leaves it unset.
// Required endpoints turn "no req.user" into 401 with their signedIn guard.
app.use('/api', optionalAuth)

// Order matters: the fixed words /listings/featured, /new and /mine must be matched before
// /listings/:id, so the browse and write routers come before the detail router.
app.use('/api', health)
app.use('/api', docs)
app.use('/api', auth)
app.use('/api', users)
app.use('/api', uploads)
app.use('/api', courses)
app.use('/api', listingsBrowse)
app.use('/api', listingsWrite)
app.use('/api', listingsDetail)
app.use('/api', offersCreate)
app.use('/api', offersRespond)

app.use(notFoundRoute)
app.use(errorHandler)
