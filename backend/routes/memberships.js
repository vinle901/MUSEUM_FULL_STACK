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

    const [memberships] = await db.query(`
      SELECT m.*, b.*
      FROM Membership m
      JOIN Benefits b ON m.membership_type = b.membership_type
      WHERE m.user_id = ? AND m.is_active = TRUE
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

// PUT update membership (renew/cancel)
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

    const { expiration_date, is_active } = req.body
    await db.query(
      'UPDATE Membership SET expiration_date = ?, is_active = ? WHERE membership_id = ?',
      [expiration_date, is_active, req.params.id],
    )
    res.json({ message: 'Membership updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
