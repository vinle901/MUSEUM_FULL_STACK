/* eslint-disable no-unused-vars */
/* eslint-disable no-trailing-spaces */
// File: backend/routes/auth.js

import express from 'express'
import db from '../config/database.js'
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/authService.js'
import middleware from '../utils/middleware.js'

const router = express.Router()

/**
 * Helper function to determine user role AND specific employee type
 * Returns an object with role and employeeType
 */
async function getUserRoleDetails(userId) {
  const [employees] = await db.query(
    'SELECT employee_id, role, is_active FROM Employee WHERE user_id = ? AND is_active = TRUE',
    [userId],
  )

  if (employees.length > 0) {
    const employeeRole = employees[0].role.toLowerCase()
    const employeeId = employees[0].employee_id

    // Determine specific employee type based on role
    let employeeType = null

    // Admin roles
    if (employeeRole.includes('admin') || employeeRole.includes('director') || employeeRole.includes('manager')) {
      employeeType = 'admin'
      return { role: 'admin', employeeType: 'admin', employeeId }
    }

    // Cafeteria roles
    if (employeeRole.includes('cafeteria') || employeeRole.includes('barista') || employeeRole.includes('cashier') || employeeRole.includes('food') || employeeRole.includes('ticket'))  {
      employeeType = 'cafeteria'
      return { role: 'employee', employeeType: 'cafeteria', employeeId }
    }

    // Analyst roles
    if (employeeRole.includes('analyst') || employeeRole.includes('data') || employeeRole.includes('report')) {
      employeeType = 'analyst'
      return { role: 'employee', employeeType: 'analyst', employeeId }
    }

    // Default employee type for other roles
    return { role: 'employee', employeeType: 'general', employeeId }
  }

  return { role: 'customer', employeeType: null, employeeId: null }
}

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      phone_number,
      address,
      birthdate,
      sex,
      subscribe_to_newsletter,
    } = req.body

    // Validate required fields (matching actual schema)
    if (!email || !password || !first_name || !last_name || !birthdate || !sex) {
      return res.status(400).json({
        error: 'Email, password, first name, last name, birthdate, and sex are required',
      })
    }

    // Validate sex enum
    const validSex = ['M', 'F', 'Non-Binary', 'Prefer not to say']
    if (!validSex.includes(sex)) {
      return res.status(400).json({
        error: 'Sex must be one of: M, F, Non-Binary, Prefer not to say',
      })
    }

    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email],
    )

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'Email already registered',
      })
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Insert new user (using 'password' column as per schema)
    const [result] = await db.query(
      `INSERT INTO users (email, password, first_name, last_name, phone_number, address,
       birthdate, sex, subscribe_to_newsletter)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        passwordHash,
        first_name,
        last_name,
        phone_number || null,
        address || null,
        birthdate,
        sex,
        subscribe_to_newsletter || false,
      ],
    )

    const userId = result.insertId

    // Determine role by checking Employee table
    const roleDetails = await getUserRoleDetails(userId)

    // Generate tokens
    const user = {
      id: userId,
      email,
      role: roleDetails.role,
      employeeType: roleDetails.employeeType,
    }

    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    res.status(201).json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        first_name,
        last_name,
        role: user.role,
        employeeType: user.employeeType,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Registration failed', details: error.message })
  }
})

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      })
    }

    // Find user (using actual schema columns: user_id and password)
    const [users] = await db.query(
      'SELECT user_id, email, password, first_name, last_name FROM users WHERE email = ?',
      [email],
    )

    if (users.length === 0) {
      return res.status(401).json({
        error: 'Invalid email or password',
      })
    }

    const user = users[0]

    // Verify password (column is named 'password' in your schema)
    const validPassword = await comparePassword(password, user.password)

    if (!validPassword) {
      return res.status(401).json({
        error: 'Invalid email or password',
      })
    }

    // Check and update user's membership status on login
    await db.query(
      `UPDATE Membership
       SET is_active = FALSE
       WHERE user_id = ?
         AND expiration_date < CURDATE()
         AND is_active = TRUE`,
      [user.user_id],
    )

    // Determine role by checking Employee table
    const roleDetails = await getUserRoleDetails(user.user_id)

    // Generate tokens
    const tokenUser = {
      id: user.user_id,
      email: user.email,
      role: roleDetails.role,
      employeeType: roleDetails.employeeType,
      employeeId: roleDetails.employeeId,
    }

    const accessToken = generateAccessToken(tokenUser)
    const refreshToken = generateRefreshToken(tokenUser)

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    res.json({
      accessToken,
      user: {
        id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: roleDetails.role,
        employeeType: roleDetails.employeeType,
        employeeId: roleDetails.employeeId,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed', details: error.message })
  }
})

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.cookies

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token not found',
      })
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken)

    // Get user from database (use user_id not id)
    const [users] = await db.query(
      'SELECT user_id, email FROM users WHERE user_id = ?',
      [decoded.id],
    )

    if (users.length === 0) {
      return res.status(401).json({
        error: 'User not found',
      })
    }

    const user = users[0]

    // Determine role
    const roleDetails = await getUserRoleDetails(user.user_id)

    // Generate new access token
    const accessToken = generateAccessToken({
      id: user.user_id,
      email: user.email,
      role: roleDetails.role,
      employeeType: roleDetails.employeeType,
    })

    res.json({ accessToken })
  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', (req, res) => {
  // Clear cookie with same options used when setting it
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  })
  res.json({ message: 'Logged out successfully' })
})

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', middleware.requireAuth, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT user_id, email, first_name, last_name, password_must_change FROM users WHERE user_id = ?',
      [req.user.id],
    )

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = users[0]
    const roleDetails = await getUserRoleDetails(user.user_id)

    res.json({
      id: user.user_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: roleDetails.role,
      employeeType: roleDetails.employeeType,
      password_must_change: user.password_must_change,
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Failed to get user info' })
  }
})

/**
 * POST /api/auth/change-password
 * Change user password (requires authentication)
 */
router.post('/change-password', middleware.requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' })
    }

    // Get user (req.user is set by middleware)
    const [users] = await db.query(
      'SELECT user_id, password FROM users WHERE user_id = ?',
      [req.user.id],
    )

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = users[0]

    // Verify current password
    const validPassword = await comparePassword(currentPassword, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password and clear password_must_change flag
    await db.query(
      'UPDATE users SET password = ?, password_must_change = FALSE WHERE user_id = ?',
      [newPasswordHash, user.user_id],
    )

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Password change error:', error)
    res.status(500).json({ error: 'Failed to change password' })
  }
})

export default router
