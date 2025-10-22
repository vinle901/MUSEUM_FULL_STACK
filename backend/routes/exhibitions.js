import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'

const router = express.Router()

// Public routes - Anyone can browse exhibitions

// GET all exhibitions - Public
router.get('/', async (req, res) => {
  try {
    const [exhibitions] = await db.query('SELECT * FROM Exhibition WHERE is_active = TRUE')
    res.json(exhibitions)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET exhibition by ID
router.get('/:id', async (req, res) => {
  try {
    const [exhibitions] = await db.query('SELECT * FROM Exhibition WHERE exhibition_id = ?', [req.params.id])
    if (exhibitions.length === 0) {
      return res.status(404).json({ error: 'Exhibition not found' })
    }
    res.json(exhibitions[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


// Protected routes - Only admin/employee can modify exhibitions

// POST create new exhibition - Admin/Employee only
router.post('/upload-image', middleware.requireRole('admin', 'employee'), (req, res) => {
  uploadExhibitionImage(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No image file provided' })

    const imageUrl = `/uploads/exhibitions/${req.file.filename}`
    res.status(200).json({ message: 'Image uploaded successfully', imageUrl })
  })
})

router.post('/', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const {
      exhibition_name, exhibition_type, location, description, start_date, end_date, is_active,
    } = req.body
    const [result] = await db.query(
      'INSERT INTO Exhibition (exhibition_name, exhibition_type, location, description, start_date, end_date, is_active, picture_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [exhibition_name, exhibition_type, location, description, start_date, end_date, is_active || true, picture_url || null],
    )
    res.status(201).json({ exhibition_id: result.insertId, message: 'Exhibition created successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT update exhibition - Admin/Employee only
router.put('/:id', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const {
      exhibition_name, description, location, end_date, is_active, picture_url
    } = req.body

    await db.query(
      'UPDATE Exhibition SET exhibition_name = ?, description = ?, location = ?, end_date = ?, is_active = ?, picture_url = ? WHERE exhibition_id = ?',
      [exhibition_name, description, location, end_date, is_active, picture_url, req.params.id],
    )
    res.json({ message: 'Exhibition updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE exhibition - Admin only
router.delete('/:id', middleware.requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM Exhibition WHERE exhibition_id = ?', [req.params.id])
    res.json({ message: 'Exhibition deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
