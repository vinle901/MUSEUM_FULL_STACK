import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'

const router = express.Router()

// Note: Most routes here require admin/employee role (set in app.js)
// Profile routes are accessible to all authenticated users

// GET current user's profile - Authenticated users only
router.get('/profile', middleware.requireAuth, async (req, res) => {
  try {
    const userId = req.user.id

    // Get user basic info
    const [users] = await db.query(
      `SELECT user_id, first_name, last_name, email, phone_number, address,
              birthdate, sex, subscribe_to_newsletter, created_at, updated_at
       FROM users WHERE user_id = ?`,
      [userId],
    )

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = users[0]

    // Get membership info if exists
    const [memberships] = await db.query(
      `SELECT membership_id, membership_type, start_date, expiration_date, is_active
       FROM Membership WHERE user_id = ? and is_active = 1 ORDER BY start_date DESC LIMIT 1`,
      [userId],
    )

    // Add membership to response if exists
    if (memberships.length > 0) {
      const [membership] = memberships
      user.membership = membership
    }

    // Get employee info if user is an employee
    const [employees] = await db.query(
      `SELECT
        e.employee_id,
        e.role,
        e.hire_date,
        e.salary,
        e.responsibility,
        e.is_active,
        CONCAT(m.first_name, ' ', m.last_name) as manager_name
       FROM Employee e
       LEFT JOIN Employee me ON e.manager_id = me.employee_id
       LEFT JOIN users m ON me.user_id = m.user_id
       WHERE e.user_id = ?`,
      [userId],
    )

    // Add employee info to response if exists
    if (employees.length > 0) {
      const [employee] = employees
      user.employee = employee
    }

    res.json(user)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT update current user's profile - Authenticated users only
router.put('/profile', middleware.requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const {
      first_name,
      last_name,
      email,
      phone_number,
      address,
      subscribe_to_newsletter,
    } = req.body

    // Validate required fields
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' })
    }

    // Check if email is already taken by another user
    const [existingUsers] = await db.query(
      'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
      [email, userId],
    )

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email is already in use by another account' })
    }

    // Update user profile
    await db.query(
      `UPDATE users
       SET first_name = ?, last_name = ?, email = ?, phone_number = ?,
           address = ?, subscribe_to_newsletter = ?
       WHERE user_id = ?`,
      [first_name, last_name, email, phone_number, address, subscribe_to_newsletter, userId],
    )

    // Fetch and return updated user data
    const [updatedUsers] = await db.query(
      `SELECT user_id, first_name, last_name, email, phone_number, address,
              birthdate, sex, subscribe_to_newsletter, created_at, updated_at
       FROM users WHERE user_id = ?`,
      [userId],
    )

    res.json({
      message: 'Profile updated successfully',
      user: updatedUsers[0],
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET all users - Admin/Employee only
router.get('/', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const [users] = await db.query('SELECT user_id, first_name, last_name, email, phone_number, address, birthdate, sex, subscribe_to_newsletter, created_at FROM users')
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET user by ID - Admin/Employee only
router.get('/:id', middleware.requireRole('admin', 'employee'), async (req, res) => {
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
