// File: backend/app.js

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import config from './config/env.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import artworkRoutes from './routes/artworks.js'
import artistRoutes from './routes/artists.js'
import exhibitionRoutes from './routes/exhibitions.js'
import eventRoutes from './routes/events.js'
import ticketRoutes from './routes/tickets.js'
import giftShopRoutes from './routes/giftshop.js'
import cafeteriaRoutes from './routes/cafeteria.js'
import membershipRoutes from './routes/memberships.js'
import transactionRoutes from './routes/transactions.js'
import employeeRoutes from './routes/employees.js'
import eventHostingRoutes from './routes/event-hosting.js'
import benefitsRoutes from './routes/benefits.js'
import middleware from './utils/middleware.js'
import reportsRoutes from './routes/reports.js'  // Add with other imports
import donationsRoutes from './routes/donations.js'
import notificationRoutes from './routes/notifications.js'
import db from './config/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Middleware
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(morgan('dev'))

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Global auth middleware - extract tokens from all requests
// This doesn't require auth, just parses tokens if they exist
app.use(middleware.tokenExtractor)
app.use(middleware.userExtractor)

// Public routes - No authentication required
app.use('/api/auth', authRoutes)

// Semi-public routes - Browse without auth, but operations require auth
// GET requests are public, POST/PUT/DELETE require auth inside route files
app.use('/api/artworks', artworkRoutes)
app.use('/api/artists', artistRoutes)
app.use('/api/exhibitions', exhibitionRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/event-hosting', eventHostingRoutes)
app.use('/api/giftshop', giftShopRoutes)
app.use('/api/cafeteria', cafeteriaRoutes)
app.use('/api/benefits', benefitsRoutes)
app.use('/api/donations', donationsRoutes)

// Transaction routes - gift-shop-checkout is public, others may require auth
// IMPORTANT: Place BEFORE protected routes to allow guest checkout
app.use('/api/transactions', transactionRoutes)

// Public endpoint for ticket types so the Visit page can load real DB data without auth
app.get('/api/ticket_types', async (req, res) => {
  try {
    // Prefer the table name you indicated (ticket_type); fall back to Ticket_Types if needed
    try {
      const [rows] = await db.query('SELECT * FROM ticket_type WHERE is_available = TRUE')
      return res.json(rows)
    } catch (e1) {
      const [rows] = await db.query('SELECT * FROM Ticket_Types WHERE is_available = TRUE')
      return res.json(rows)
    }
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// Protected routes - Authentication required for all operations
app.use('/api/tickets', middleware.requireAuth, ticketRoutes)
app.use('/api/memberships', middleware.requireAuth, membershipRoutes)

// User routes - Mix of protected and admin routes
// Profile routes (/api/users/profile/*) are accessible to authenticated users
// Other routes require admin/employee role
app.use('/api/users', userRoutes)

// Admin only routes - All operations require admin role
app.use('/api/employees', employeeRoutes)

// Notification routes - Admin/Employee only
app.use('/api/notifications', notificationRoutes)

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Museum API is running :V' })
})


app.use('/api/reports', reportsRoutes)
// Error handling middleware - MUST be last
app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

export default app