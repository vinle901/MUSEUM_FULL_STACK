import express from 'express'
import db from '../config/database.js'

const router = express.Router()

// GET membership by email (for POS discount lookup)
router.get('/by-email/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email)

    const [memberships] = await db.query(`
      SELECT m.*, b.discount_percentage
      FROM Membership m
      JOIN users u ON m.user_id = u.user_id
      JOIN Benefits b ON m.membership_type = b.membership_type
      WHERE u.email = ? AND m.is_active = TRUE AND m.expiration_date >= CURDATE()
      LIMIT 1
    `, [email])

    if (memberships.length === 0) {
      return res.status(404).json({ error: 'No active membership found for this email' })
    }

    res.json(memberships[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET user's memberships
router.get('/user/:userId', async (req, res) => {
  try {
    // Check if requesting user matches userId OR user is admin
    if (req.user.id !== parseInt(req.params.userId, 10) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You can only view your own memberships' })
    }

    // Set show_warning = TRUE if expiring within 14 days
    await db.query(`
      UPDATE Membership
      SET show_warning = TRUE
      WHERE user_id = ?
        AND is_active = TRUE
        AND expiration_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)
    `, [req.params.userId])

    const [memberships] = await db.query(`
      SELECT
        m.membership_id,
        m.user_id,
        m.membership_type,
        m.start_date,
        m.expiration_date,
        m.is_active,
        m.show_warning,
        m.created_at,
        m.updated_at,
        b.annual_fee,
        b.unlimited_visits,
        b.priority_entry,
        b.guest_passes,
        b.access_to_member_events,
        b.discount_percentage
      FROM Membership m
      JOIN Benefits b ON m.membership_type = b.membership_type
      WHERE m.user_id = ?
      ORDER BY m.created_at DESC
    `, [req.params.userId])
    res.json(memberships)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET membership by ID
router.get('/:id', async (req, res) => {
  try {
    const [memberships] = await db.query('SELECT * FROM Membership WHERE membership_id = ?', [req.params.id])
    if (memberships.length === 0) {
      return res.status(404).json({ error: 'Membership not found' })
    }

    // Check if requesting user owns this membership OR is admin
    if (req.user.id !== memberships[0].user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You can only view your own memberships' })
    }

    res.json(memberships[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST create new membership
router.post('/', async (req, res) => {
  try {
    const {
      user_id, membership_type, start_date, expiration_date,
    } = req.body

    // Check if requesting user matches user_id OR is admin
    if (req.user.id !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You can only create memberships for yourself' })
    }

    const [result] = await db.query(
      'INSERT INTO Membership (user_id, membership_type, start_date, expiration_date, is_active) VALUES (?, ?, ?, ?, TRUE)',
      [user_id, membership_type, start_date, expiration_date],
    )
    res.status(201).json({ membership_id: result.insertId, message: 'Membership created successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT update membership (renew/cancel/dismiss warning)
router.put('/:id', async (req, res) => {
  try {
    // First, get the membership to check ownership
    const [memberships] = await db.query('SELECT user_id FROM Membership WHERE membership_id = ?', [req.params.id])
    if (memberships.length === 0) {
      return res.status(404).json({ error: 'Membership not found' })
    }

    // Check if requesting user owns this membership OR is admin
    if (req.user.id !== memberships[0].user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You can only update your own memberships' })
    }

    const { expiration_date, is_active, show_warning } = req.body

    // Build dynamic query based on what fields are provided
    const updates = []
    const values = []

    if (expiration_date !== undefined) {
      updates.push('expiration_date = ?')
      values.push(expiration_date)
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(is_active)
    }
    if (show_warning !== undefined) {
      updates.push('show_warning = ?')
      values.push(show_warning)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    values.push(req.params.id)

    await db.query(
      `UPDATE Membership SET ${updates.join(', ')} WHERE membership_id = ?`,
      values,
    )
    res.json({ message: 'Membership updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
