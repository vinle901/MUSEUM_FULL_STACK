// File: backend/routes/giftshop.js

import express from 'express'
import db from '../config/database.js'

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

// GET all gift shop items
router.get('/', async (req, res) => {
  try {
    console.log('Fetching gift shop items from database...')
    
    const [items] = await db.query(
      'SELECT * FROM Gift_Shop_Items WHERE is_available = TRUE ORDER BY category, item_name'
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

export default router