import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import config from '../config/env.js'

const SALT_ROUNDS = 10

/**
 * Hash a password using bcrypt
 */
export const hashPassword = async (password) => bcrypt.hash(password, SALT_ROUNDS)

/**
 * Compare password with hash
 */
export const comparePassword = async (password, hash) => bcrypt.compare(password, hash)

/**
 * Generate access token (short-lived, 15 minutes)
 */
export const generateAccessToken = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  config.JWT_SECRET,
  { expiresIn: '15m' },
)

/**
 * Generate refresh token (long-lived, 7 days)
 */
export const generateRefreshToken = (user) => jwt.sign(
  { id: user.id },
  config.JWT_REFRESH_SECRET,
  { expiresIn: '7d' },
)

/**
 * Verify access token
 */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET)
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET)
  } catch (error) {
    throw new Error('Invalid or expired refresh token')
  }
}
