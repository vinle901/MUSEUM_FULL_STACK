import express from 'express'
import db from '../config/database.js'

const router = express.Router()

// GET all ticket types (returns all including unavailable for POS display)
router.get('/types', async (req, res) => {
  try {
    const [types] = await db.query('SELECT * FROM Ticket_Types ORDER BY ticket_name')
    res.json(types)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET ticket purchases by user
router.get('/user/:userId', async (req, res) => {
  try {
    // Check if requesting user matches userId OR user is admin
    if (req.user.id !== parseInt(req.params.userId, 10) && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: You can only view your own tickets' })
    }

    const [tickets] = await db.query(`
      SELECT tp.*, tt.ticket_name, e.exhibition_name
      FROM Ticket_Purchase tp
      JOIN Ticket_Types tt ON tp.ticket_type_id = tt.ticket_type_id
      LEFT JOIN Exhibition e ON tp.exhibition_id = e.exhibition_id
      JOIN Transactions t ON tp.transaction_id = t.transaction_id
      WHERE t.user_id = ?
    `, [req.params.userId])
    res.json(tickets)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST create ticket type (Admin only)
router.post('/types', async (req, res) => {
  try {
    const {
      ticket_name, base_price, description, is_available,
    } = req.body
    const [result] = await db.query(
      'INSERT INTO Ticket_Types (ticket_name, base_price, description, is_available) VALUES (?, ?, ?, ?)',
      [ticket_name, base_price, description, is_available ?? true],
    )
    res.status(201).json({ ticket_type_id: result.insertId, message: 'Ticket type created successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT update ticket type (Admin only)
router.put('/types/:id', async (req, res) => {
  try {
    const {
      ticket_name, base_price, description, is_available,
    } = req.body
    await db.query(
      'UPDATE Ticket_Types SET ticket_name = ?, base_price = ?, description = ?, is_available = ? WHERE ticket_type_id = ?',
      [ticket_name, base_price, description, is_available, req.params.id],
    )
    res.json({ message: 'Ticket type updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE ticket type (Admin only)
router.delete('/types/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM Ticket_Types WHERE ticket_type_id = ?', [req.params.id])
    res.json({ message: 'Ticket type deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
