import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'
import { uploadCafeteriaImage } from '../utils/uploadMiddleware.js'

const router = express.Router()

// Public routes - Anyone can browse cafeteria menu

// GET all cafeteria items - Public (returns all items including unavailable for POS display)
router.get('/', async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM Cafeteria_Items ORDER BY category, item_name')
    res.json(items)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET cafeteria item by ID
router.get('/:id', async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM Cafeteria_Items WHERE item_id = ?', [req.params.id])
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' })
    }
    res.json(items[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET items by category
router.get('/category/:category', async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM Cafeteria_Items WHERE category = ? AND is_available = TRUE', [req.params.category])
    res.json(items)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET vegetarian/vegan items
router.get('/dietary/:type', async (req, res) => {
  try {
    const { type } = req.params
    let query = 'SELECT * FROM Cafeteria_Items WHERE is_available = TRUE'
    if (type === 'vegetarian') {
      query += ' AND is_vegetarian = TRUE'
    } else if (type === 'vegan') {
      query += ' AND is_vegan = TRUE'
    }
    const [items] = await db.query(query)
    res.json(items)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Protected routes - Only admin/employee can manage menu

// POST upload cafeteria item image - Admin/Employee only
router.post('/upload-image', middleware.requireRole('admin', 'employee'), (req, res) => {
  uploadCafeteriaImage(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No image file provided' })

    const imageUrl = `/uploads/cafeteria/${req.file.filename}`
    res.status(200).json({ message: 'Image uploaded successfully', imageUrl })
  })
})

// POST create new item - Admin/Employee only
router.post('/', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const {
      item_name, category, price, description, picture_url, calories,
      is_vegetarian, is_vegan, preparation_time_minutes,
    } = req.body
    const [result] = await db.query(
      `INSERT INTO Cafeteria_Items (item_name, category, price, description, picture_url, calories,
       is_vegetarian, is_vegan, preparation_time_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item_name, category, price, description, picture_url || null, calories,
        is_vegetarian || false, is_vegan || false, preparation_time_minutes,
      ],
    )
    res.status(201).json({ item_id: result.insertId, message: 'Cafeteria item created successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT update item - Admin/Employee only
router.put('/:id', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const {
      item_name, category, price, description, picture_url, calories,
      is_vegetarian, is_vegan, is_available
    } = req.body

    await db.query(
      `UPDATE Cafeteria_Items
       SET item_name = ?, category = ?, price = ?, description = ?, picture_url = ?,
           calories = ?, is_vegetarian = ?, is_vegan = ?, is_available = ?
       WHERE item_id = ?`,
      [item_name, category, price, description, picture_url, calories,
       is_vegetarian, is_vegan, is_available, req.params.id],
    )
    res.json({ message: 'Cafeteria item updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE cafeteria item - Admin only
router.delete('/:id', middleware.requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM Cafeteria_Items WHERE item_id = ?', [req.params.id])
    res.json({ message: 'Cafeteria item deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
