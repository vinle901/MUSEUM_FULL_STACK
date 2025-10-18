import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'

const router = express.Router()

// Note: All routes here already require admin/employee role (set in app.js)

// GET all users - Admin/Employee only
router.get('/', async (req, res) => {
  try {
    const [users] = await db.query('SELECT user_id, first_name, last_name, email, phone_number, address, birthdate, sex, subscribe_to_newsletter, created_at FROM users')
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET user by ID
router.get('/:id', async (req, res) => {
  try {
    const [users] = await db.query('SELECT user_id, first_name, last_name, email, phone_number, address, birthdate, sex, subscribe_to_newsletter, created_at FROM users WHERE user_id = ?', [req.params.id])
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(users[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST create new user
router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, email, password, phone_number, address, birthdate, sex, subscribe_to_newsletter,
    } = req.body
    const [result] = await db.query(
      'INSERT INTO users (first_name, last_name, email, password, phone_number, address, birthdate, sex, subscribe_to_newsletter) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [first_name, last_name, email, password, phone_number, address, birthdate, sex, subscribe_to_newsletter || false],
    )
    res.status(201).json({ user_id: result.insertId, message: 'User created successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT update user
router.put('/:id', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone_number, address, subscribe_to_newsletter,
    } = req.body
    await db.query(
      'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone_number = ?, address = ?, subscribe_to_newsletter = ? WHERE user_id = ?',
      [first_name, last_name, email, phone_number, address, subscribe_to_newsletter, req.params.id],
    )
    res.json({ message: 'User updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE user - Admin only (stricter than other routes)
// Note: This uses the requireRole middleware to restrict to admin only
router.delete('/:id', middleware.requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE user_id = ?', [req.params.id])
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
