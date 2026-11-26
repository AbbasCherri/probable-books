// Owner: Abbas (@AbbasCherri)
// Endpoints: GET /docs (interactive page), GET /docs.json (machine-readable) (P2)

import { Router } from 'express'
import swaggerUi from 'swagger-ui-express'
import { buildSpec } from './openapi.js'

const spec = buildSpec() // built once at start-up from the route comments

export const docs = Router()

docs.get('/docs.json', (_req, res) => res.json(spec))
docs.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(spec, {
    customSiteTitle: 'Probable Books API',
    swaggerOptions: {
      persistAuthorization: true, // the pasted token survives a reload
      validatorUrl: null, // no calls to an outside validator
      tryItOutEnabled: true,
    },
  }),
)
