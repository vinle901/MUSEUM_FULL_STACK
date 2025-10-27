// File: backend/routes/donations.js

import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'

const router = express.Router()

// GET /api/donations/top?year=2025&limit=5
// Public endpoint returning top donors by total amount for a given year
router.get('/top', async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear()
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 50)

    // Compute date boundaries for the given year
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    // Aggregate donations by donor using a derived table to satisfy ONLY_FULL_GROUP_BY
    // - Group non-anonymous by their user_id
    // - Group all anonymous donations into a single bucket
    const [rows] = await db.query(
      `SELECT 
         CASE WHEN s.is_anonymous = 1 THEN 'Anonymous' ELSE CONCAT(u.first_name, ' ', u.last_name) END AS donor_name,
         s.real_user_id AS donor_id,
         s.total_amount
       FROM (
         SELECT 
           CASE WHEN d.is_anonymous THEN 1 ELSE 0 END AS is_anonymous,
           CASE WHEN d.is_anonymous THEN NULL ELSE t.user_id END AS real_user_id,
           CASE WHEN d.is_anonymous THEN 0 ELSE t.user_id END AS donor_key,
           SUM(d.amount) AS total_amount
         FROM Donation d
         JOIN Transactions t ON d.transaction_id = t.transaction_id
         WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
         GROUP BY donor_key, is_anonymous, real_user_id
       ) s
       LEFT JOIN users u ON s.real_user_id = u.user_id
       ORDER BY s.total_amount DESC
       LIMIT ?`,
      [startDate, endDate, limit]
    )

    const top = rows.map((r, idx) => ({
      rank: idx + 1,
      name: r.donor_name || 'Anonymous',
      amount: parseFloat(r.total_amount) || 0,
      year,
      user_id: r.donor_id || null,
    }))

    res.json({ year, donors: top })
  } catch (error) {
    console.error('Top donors error:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/donations/checkout - Create a donation transaction and donation record
// Requires authentication
router.post('/checkout', middleware.requireAuth, async (req, res) => {
  let connection
  try {
    connection = await db.getConnection()

    const {
      user_id,
      amount,
      donation_type, // Enum defined in schema
      is_anonymous = false,
      dedication_message = null,
      payment_method = 'Credit Card',
    } = req.body

    // Validate requester identity: must match user or be admin
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    if (req.user.id !== Number(user_id) && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: You can only donate for your own account' })
    }

    // Basic validation
    const validPaymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Mobile Payment']
    const validDonationTypes = [
      'General Fund',
      'Exhibition Support',
      'Education Programs',
      'Artwork Acquisition',
      'Building Maintenance',
      'Other',
    ]

    if (!user_id || !amount || !donation_type || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields: user_id, amount, donation_type, payment_method' })
    }

    const amt = parseFloat(amount)
    if (!(amt > 0)) {
      return res.status(400).json({ error: 'Invalid donation amount' })
    }
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ error: `Invalid payment_method. Must be one of: ${validPaymentMethods.join(', ')}` })
    }
    if (!validDonationTypes.includes(donation_type)) {
      return res.status(400).json({ error: `Invalid donation_type. Must be one of: ${validDonationTypes.join(', ')}` })
    }

    // Begin transaction
    await connection.beginTransaction()

    // Create Transactions row
    const [tx] = await connection.query(
      `INSERT INTO Transactions (user_id, total_price, total_items, payment_method, transaction_status, employee_id)
       VALUES (?, ?, 1, ?, 'Completed', NULL)`,
      [user_id, amt, payment_method]
    )
    const transaction_id = tx.insertId

    // Create Donation row
    const [donRes] = await connection.query(
      `INSERT INTO Donation (transaction_id, amount, donation_type, is_anonymous, dedication_message, tax_receipt_sent)
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [transaction_id, amt, donation_type, !!is_anonymous, dedication_message]
    )

    await connection.commit()

    return res.status(201).json({
      success: true,
      message: 'Donation processed successfully',
      transaction: {
        transaction_id,
        user_id,
        total_price: amt,
        total_items: 1,
        payment_method,
        transaction_status: 'Completed',
      },
      donation: {
        donation_id: donRes.insertId,
        amount: amt,
        donation_type,
        is_anonymous: !!is_anonymous,
        dedication_message: dedication_message || null,
      }
    })
  } catch (error) {
    if (connection) {
      try { await connection.rollback() } catch {}
    }
    console.error('Donation checkout error:', error)
    return res.status(500).json({ error: 'Donation failed', details: error.message })
  } finally {
    if (connection) connection.release()
  }
})

export default router
