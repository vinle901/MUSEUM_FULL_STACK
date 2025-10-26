import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'
import { uploadArtworkImage } from '../utils/uploadMiddleware.js'

const router = express.Router()

// Public routes - Anyone can browse artworks

// GET all artworks - Public
router.get('/', async (req, res) => {
  try {
    const [artworks] = await db.query(`
      SELECT a.*, ar.name as artist_name, ar.nationality, e.exhibition_name
      FROM Artwork a
      LEFT JOIN Artist ar ON a.artist_id = ar.artist_id
      LEFT JOIN Exhibition e ON a.exhibition_id = e.exhibition_id
    `)
    res.json(artworks)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET artwork by ID
router.get('/:id', async (req, res) => {
  try {
    const [artworks] = await db.query(`
      SELECT a.*, ar.name as artist_name, ar.nationality, e.exhibition_name
      FROM Artwork a
      LEFT JOIN Artist ar ON a.artist_id = ar.artist_id
      LEFT JOIN Exhibition e ON a.exhibition_id = e.exhibition_id
      WHERE a.artwork_id = ?
    `, [req.params.id])
    if (artworks.length === 0) {
      return res.status(404).json({ error: 'Artwork not found' })
    }
    res.json(artworks[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET artworks by artist
router.get('/artist/:artistId', async (req, res) => {
  try {
    const [artworks] = await db.query('SELECT * FROM Artwork WHERE artist_id = ?', [req.params.artistId])
    res.json(artworks)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET artworks by exhibition
router.get('/exhibition/:exhibitionId', async (req, res) => {
  try {
    const [artworks] = await db.query('SELECT * FROM Artwork WHERE exhibition_id = ?', [req.params.exhibitionId])
    res.json(artworks)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Protected routes - Only admin/employee can modify artworks

// POST upload artwork image - Admin/Employee only
router.post('/upload-image', middleware.requireRole('admin', 'employee'), (req, res) => {
  uploadArtworkImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' })
    }

    // Return the URL path to the uploaded image
    const imageUrl = `/uploads/artworks/${req.file.filename}`
    res.status(200).json({
      message: 'Image uploaded successfully',
      imageUrl,
      filename: req.file.filename,
    })
  })
})

// POST create new artwork - Admin/Employee only
router.post('/', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const {
      title, artist_id, creation_date, artwork_type, material, description, picture_url,
      exhibition_id, curated_by_employee_id, acquisition_date, is_on_display,
    } = req.body
    const [result] = await db.query(
      `INSERT INTO Artwork (title, artist_id, creation_date, artwork_type, material, description,
       picture_url, exhibition_id, curated_by_employee_id, acquisition_date, is_on_display)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, artist_id, creation_date || null, artwork_type, material, description,
        picture_url, exhibition_id || null, curated_by_employee_id || null, acquisition_date || null, is_on_display ?? true,
      ],
    )
    res.status(201).json({ artwork_id: result.insertId, message: 'Artwork created successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT update artwork - Admin/Employee only
router.put('/:id', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    // Define allowed fields that exist in the Artwork table
    const allowedFields = [
      'title', 'artist_id', 'creation_date', 'artwork_type', 'material',
      'description', 'picture_url', 'exhibition_id', 'curated_by_employee_id',
      'acquisition_date', 'is_on_display'
    ]

    const updates = req.body

    // Filter to only include allowed fields
    const fields = Object.keys(updates).filter(field => allowedFields.includes(field))
    const values = fields.map(field => updates[field])

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const query = `UPDATE Artwork SET ${setClause} WHERE artwork_id = ?`

    values.push(req.params.id)

    await db.query(query, values)
    res.json({ message: 'Artwork updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE artwork - Admin only
router.delete('/:id', middleware.requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM Artwork WHERE artwork_id = ?', [req.params.id])
    res.json({ message: 'Artwork deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
