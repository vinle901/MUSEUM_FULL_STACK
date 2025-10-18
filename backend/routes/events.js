import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'

const router = express.Router()

// Public routes - Anyone can browse events

// GET all events - Public
router.get('/', async (req, res) => {
  try {
    const [events] = await db.query('SELECT * FROM Events WHERE is_cancelled = FALSE ORDER BY event_date, event_time')
    res.json(events)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET event by ID
router.get('/:id', async (req, res) => {
  try {
    const [events] = await db.query('SELECT * FROM Events WHERE event_id = ?', [req.params.id])
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }
    res.json(events[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET calendar view
router.get('/calendar/view', async (req, res) => {
  try {
    const [calendar] = await db.query('SELECT * FROM Calendar WHERE is_cancelled = FALSE ORDER BY event_date, event_time')
    res.json(calendar)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Protected routes - Only admin/employee can modify events

// POST create new event - Admin/Employee only
router.post('/', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const {
      event_name, event_type, event_date, event_time, duration_minutes, location,
      description, exhibition_id, max_capacity, is_members_only,
    } = req.body
    const [result] = await db.query(
      `INSERT INTO Events (event_name, event_type, event_date, event_time, duration_minutes, location,
       description, exhibition_id, max_capacity, is_members_only) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event_name, event_type, event_date, event_time, duration_minutes, location,
        description, exhibition_id, max_capacity, is_members_only || false,
      ],
    )
    res.status(201).json({ event_id: result.insertId, message: 'Event created successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT update event - Admin/Employee only
router.put('/:id', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const {
      event_name, description, location, is_cancelled,
    } = req.body
    await db.query(
      'UPDATE Events SET event_name = ?, description = ?, location = ?, is_cancelled = ? WHERE event_id = ?',
      [event_name, description, location, is_cancelled, req.params.id],
    )
    res.json({ message: 'Event updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE event - Admin only
router.delete('/:id', middleware.requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM Events WHERE event_id = ?', [req.params.id])
    res.json({ message: 'Event deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
