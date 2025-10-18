import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'

const router = express.Router()

// Public routes - Anyone can browse gift shop items

// GET all gift shop items - Public
router.get('/', async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM Gift_Shop_Items WHERE is_available = TRUE AND stock_quantity > 0')
    res.json(items)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET gift shop item by ID
router.get('/:id', async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM Gift_Shop_Items WHERE item_id = ?', [req.params.id])
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
    const [items] = await db.query('SELECT * FROM Gift_Shop_Items WHERE category = ? AND is_available = TRUE', [req.params.category])
    res.json(items)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Protected routes - Only admin/employee can manage inventory

// POST create new item - Admin/Employee only
router.post('/', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const {
      item_name, category, price, stock_quantity, description, artist_id, image_url,
    } = req.body
    const [result] = await db.query(
      'INSERT INTO Gift_Shop_Items (item_name, category, price, stock_quantity, description, artist_id, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [item_name, category, price, stock_quantity, description, artist_id, image_url],
    )
    res.status(201).json({ item_id: result.insertId, message: 'Gift shop item created successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PUT update item - Admin/Employee only
router.put('/:id', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const { price, stock_quantity, is_available } = req.body
    await db.query(
      'UPDATE Gift_Shop_Items SET price = ?, stock_quantity = ?, is_available = ? WHERE item_id = ?',
      [price, stock_quantity, is_available, req.params.id],
    )
    res.json({ message: 'Gift shop item updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
