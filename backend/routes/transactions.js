import express from 'express'
import db from '../config/database.js'

const router = express.Router()

// GET all transactions for a user
router.get('/user/:userId', async (req, res) => {
  try {
    // Check if requesting user matches userId OR user is admin
    if (req.user.id !== parseInt(req.params.userId, 10) && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: You can only view your own transactions' })
    }

    const [transactions] = await db.query('SELECT * FROM Transactions WHERE user_id = ? ORDER BY transaction_date DESC', [req.params.userId])
    res.json(transactions)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET transaction by ID with all details
router.get('/:id', async (req, res) => {
  try {
    const [transactions] = await db.query('SELECT * FROM Transactions WHERE transaction_id = ?', [req.params.id])
    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    // Check if requesting user owns this transaction OR is admin
    if (req.user.id !== transactions[0].user_id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: You can only view your own transactions' })
    }

    // Get all purchase details
    const [tickets] = await db.query('SELECT * FROM Ticket_Purchase WHERE transaction_id = ?', [req.params.id])
    const [giftItems] = await db.query('SELECT * FROM Gift_Shop_Purchase WHERE transaction_id = ?', [req.params.id])
    const [cafeteriaItems] = await db.query('SELECT * FROM Cafeteria_Purchase WHERE transaction_id = ?', [req.params.id])
    const [memberships] = await db.query('SELECT * FROM Membership_Purchase WHERE transaction_id = ?', [req.params.id])
    const [donations] = await db.query('SELECT * FROM Donation WHERE transaction_id = ?', [req.params.id])

    res.json({
      transaction: transactions[0],
      tickets,
      giftItems,
      cafeteriaItems,
      memberships,
      donations,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST create new transaction
router.post('/', async (req, res) => {
  try {
    const {
      user_id, total_price, total_items, payment_method, transaction_status,
    } = req.body

    // Check if requesting user matches user_id OR is admin
    if (req.user.id !== user_id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: You can only create transactions for yourself' })
    }

    const [result] = await db.query(
      'INSERT INTO Transactions (user_id, total_price, total_items, payment_method, transaction_status) VALUES (?, ?, ?, ?, ?)',
      [user_id, total_price, total_items, payment_method, transaction_status || 'Completed'],
    )
    res.status(201).json({ transaction_id: result.insertId, message: 'Transaction created successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT update transaction status
router.put('/:id', async (req, res) => {
  try {
    // First, get the transaction to check ownership
    const [transactions] = await db.query('SELECT user_id FROM Transactions WHERE transaction_id = ?', [req.params.id])
    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    // Check if requesting user owns this transaction OR is admin
    if (req.user.id !== transactions[0].user_id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: You can only update your own transactions' })
    }

    const { transaction_status } = req.body
    await db.query(
      'UPDATE Transactions SET transaction_status = ? WHERE transaction_id = ?',
      [transaction_status, req.params.id],
    )
    res.json({ message: 'Transaction updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
