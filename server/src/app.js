import express from 'express'
import { health } from './routes/health.js'

export const app = express()
app.use(express.json())
app.use('/api', health)
