import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'
import { uploadEventImage } from '../utils/uploadMiddleware.js'

const router = express.Router()

// Public routes - Anyone can browse events

// GET all events - Public
router.get('/', async (req, res) => {
  try {
    const includeCancelled = req.query.include_cancelled === 'true'
    const query = includeCancelled
      ? 'SELECT * FROM Events ORDER BY event_date, event_time'
      : 'SELECT * FROM Events WHERE is_cancelled = FALSE ORDER BY event_date, event_time'
    const [events] = await db.query(query)
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
router.post('/upload-image', middleware.requireRole('admin', 'employee'), (req, res) => {
  uploadEventImage(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No image file provided' })

    const imageUrl = `/uploads/events/${req.file.filename}`
    res.status(200).json({ message: 'Image uploaded successfully', imageUrl })
  })
})

router.post('/', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const {
      event_name, event_type, event_date, event_time, duration_minutes, location,
      description, exhibition_id, max_capacity, is_members_only, picture_url,
    } = req.body
    const [result] = await db.query(
      `INSERT INTO Events (event_name, event_type, event_date, event_time, duration_minutes, location,
       description, exhibition_id, max_capacity, is_members_only, picture_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event_name, event_type, event_date, event_time, duration_minutes, location,
        description, exhibition_id, max_capacity, is_members_only || false, picture_url || null,
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
      event_name, event_type, event_date, event_time, duration_minutes, location,
      description, max_capacity, is_members_only, is_cancelled, picture_url
    } = req.body
    await db.query(
      `UPDATE Events SET event_name = ?, event_type = ?, event_date = ?, event_time = ?,
       duration_minutes = ?, location = ?, description = ?, max_capacity = ?,
       is_members_only = ?, is_cancelled = ?, picture_url = ? WHERE event_id = ?`,
      [event_name, event_type, event_date, event_time, duration_minutes, location,
       description, max_capacity, is_members_only, is_cancelled, picture_url, req.params.id],
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

// PUBLIC: RSVP to an event (no login required)
// Body: { name: string, attendees: number }
router.post('/:id/rsvp', async (req, res) => {
  try {
    const eventId = Number(req.params.id)
    const { name, attendees } = req.body || {}

    if (!eventId || Number.isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event id' })
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Please provide your name (min 2 characters).' })
    }
    const count = Number(attendees)
    if (!Number.isFinite(count) || count <= 0 || count > 20) {
      return res.status(400).json({ error: 'Please provide a valid number of attendees (1-20).' })
    }

    // Fetch current event status
    const [rows] = await db.query(
      'SELECT event_id, event_name, is_cancelled, is_members_only, max_capacity, current_attendees FROM Events WHERE event_id = ? LIMIT 1',
      [eventId],
    )
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }
    const ev = rows[0]
    if (ev.is_cancelled) {
      return res.status(400).json({ error: 'This event has been cancelled.' })
    }

  // If members-only, require login and active membership
  if (Boolean(ev.is_members_only)) {
      if (!req.user) {
        return res.status(401).json({ error: 'This event is for members only. Please log in to RSVP.' })
      }
      try {
        const [mem] = await db.query(
          `SELECT 1 FROM Membership
           WHERE user_id = ?
             AND is_active = 1
             AND (expiration_date IS NULL OR expiration_date >= CURDATE())
           LIMIT 1`,
          [req.user.id],
        )
        if (!mem || mem.length === 0) {
          return res.status(403).json({ error: 'Active membership required to RSVP for this event.' })
        }
      } catch (merr) {
        return res.status(500).json({ error: 'Failed to verify membership status.' })
      }
    }

    // Optimistic capacity check for friendly error
    const maxCap = ev.max_capacity == null ? null : Number(ev.max_capacity)
    const current = Number(ev.current_attendees || 0)
    if (maxCap != null && current + count > maxCap) {
      const remaining = Math.max(0, maxCap - current)
      return res.status(400).json({ error: `Not enough spots available. Remaining: ${remaining}.` })
    }

    // Atomic update to avoid race conditions
    const [update] = await db.query(
      `UPDATE Events
       SET current_attendees = current_attendees + ?
       WHERE event_id = ?
         AND is_cancelled = FALSE
         AND (max_capacity IS NULL OR current_attendees + ? <= max_capacity)`,
      [count, eventId, count],
    )

    if (update.affectedRows === 0) {
      // Another user may have taken the last spots; re-check availability
      const [check] = await db.query(
        'SELECT max_capacity, current_attendees FROM Events WHERE event_id = ? LIMIT 1',
        [eventId],
      )
      const latest = check && check[0] ? check[0] : { max_capacity: null, current_attendees: 0 }
      const maxC = latest.max_capacity == null ? null : Number(latest.max_capacity)
      const cur = Number(latest.current_attendees || 0)
      const remaining = maxC == null ? null : Math.max(0, maxC - cur)
      return res.status(409).json({ error: remaining == null ? 'Capacity just changed. Please try again.' : `Spots just filled. Remaining: ${remaining}.` })
    }

    // Return updated counts
    const [after] = await db.query(
      'SELECT event_id, event_name, max_capacity, current_attendees FROM Events WHERE event_id = ? LIMIT 1',
      [eventId],
    )
    const updated = after[0]
    return res.status(200).json({
      message: 'RSVP confirmed',
      event: updated,
      added: count,
      name: name.trim(),
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})
