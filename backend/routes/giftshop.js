// File: backend/routes/giftshop.js

import express from 'express'
import db from '../config/database.js'
import { uploadGiftShopImage } from '../utils/uploadMiddleware.js'

const router = express.Router()

/**
 * Helper function to convert MySQL DECIMAL strings to numbers
 * MySQL2 returns DECIMAL as strings to preserve precision
 * We convert them back to numbers for JSON responses
 */
const convertItemTypes = (item) => ({
  ...item,
  price: parseFloat(item.price),
  stock_quantity: parseInt(item.stock_quantity, 10),
  is_available: Boolean(item.is_available)
})

// GET all gift shop items (returns all items including unavailable for POS display)
router.get('/', async (req, res) => {
  try {
    console.log('Fetching gift shop items from database...')

    const [items] = await db.query(
      'SELECT * FROM Gift_Shop_Items ORDER BY category, item_name'
    )

    // Convert numeric string fields to proper numbers
    const convertedItems = items.map(convertItemTypes)

    console.log(`Found ${convertedItems.length} gift shop items`)
    res.json(convertedItems)
  } catch (error) {
    console.error('Error fetching gift shop items:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET single gift shop item by ID
router.get('/:id', async (req, res) => {
  try {
    const [items] = await db.query(
      'SELECT * FROM Gift_Shop_Items WHERE item_id = ?',
      [req.params.id]
    )

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' })
    }

    // Convert numeric fields
    const convertedItem = convertItemTypes(items[0])

    res.json(convertedItem)
  } catch (error) {
    console.error('Error fetching gift shop item:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST upload gift shop item image - Admin only
router.post('/upload-image', (req, res) => {
  uploadGiftShopImage(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No image file provided' })

    const imageUrl = `/uploads/giftshop/${req.file.filename}`
    res.status(200).json({ message: 'Image uploaded successfully', imageUrl })
  })
})

// POST create new gift shop item - Admin only
router.post('/', async (req, res) => {
  try {
    const {
      item_name, category, price, stock_quantity, description, image_url,
    } = req.body

    const [result] = await db.query(
      `INSERT INTO Gift_Shop_Items (item_name, category, price, stock_quantity, description, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [item_name, category, price, stock_quantity || 0, description, image_url],
    )

    res.status(201).json({ item_id: result.insertId, message: 'Gift shop item created successfully' })
  } catch (error) {
    console.error('Error creating gift shop item:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT update gift shop item - Admin only
router.put('/:id', async (req, res) => {
  try {
    const {
      item_name, category, price, stock_quantity, description, image_url,
    } = req.body

    await db.query(
      `UPDATE Gift_Shop_Items
       SET item_name = ?, category = ?, price = ?, stock_quantity = ?,
           description = ?, image_url = ?
       WHERE item_id = ?`,
      [item_name, category, price, stock_quantity, description, image_url, req.params.id],
    )

    res.json({ message: 'Gift shop item updated successfully' })
  } catch (error) {
    console.error('Error updating gift shop item:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE gift shop item - Admin only
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM Gift_Shop_Items WHERE item_id = ?', [req.params.id])
    res.json({ message: 'Gift shop item deleted successfully' })
  } catch (error) {
    console.error('Error deleting gift shop item:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router