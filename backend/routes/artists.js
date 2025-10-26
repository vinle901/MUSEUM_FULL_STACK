import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'

const router = express.Router()

// Public routes - Anyone can browse artists

// GET all artists - Public
router.get('/', async (req, res) => {
  try {
    const [artists] = await db.query('SELECT * FROM Artist')
    res.json(artists)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET artist by ID
router.get('/:id', async (req, res) => {
  try {
    const [artists] = await db.query('SELECT * FROM Artist WHERE artist_id = ?', [req.params.id])
    if (artists.length === 0) {
      return res.status(404).json({ error: 'Artist not found' })
    }
    res.json(artists[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Protected routes - Only admin/employee can modify artists

// POST create new artist - Admin/Employee only
router.post('/', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const {
      user_id, name, nationality, birth_year, death_year, artist_biography,
    } = req.body
    const [result] = await db.query(
      'INSERT INTO Artist (user_id, name, nationality, birth_year, death_year, artist_biography) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, name, nationality, birth_year, death_year, artist_biography],
    )
    res.status(201).json({ artist_id: result.insertId, message: 'Artist created successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT update artist - Admin/Employee only
router.put('/:id', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const {
      name, nationality, birth_year, death_year, artist_biography,
    } = req.body
    await db.query(
      'UPDATE Artist SET name = ?, nationality = ?, birth_year = ?, death_year = ?, artist_biography = ? WHERE artist_id = ?',
      [name, nationality, birth_year, death_year, artist_biography, req.params.id],
    )
    res.json({ message: 'Artist updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE artist - Admin only
router.delete('/:id', middleware.requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM Artist WHERE artist_id = ?', [req.params.id])
    res.json({ message: 'Artist deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
