import express from 'express'
import db from '../config/database.js'

const router = express.Router()

// GET all membership benefits
router.get('/', async (req, res) => {
  try {
    const [benefits] = await db.query(
      'SELECT * FROM Benefits ORDER BY annual_fee ASC',
    )
    res.json(benefits)
  } catch (error) {
    console.error('Error fetching benefits:', error)
    res.status(500).json({ error: 'Failed to fetch membership benefits' })
  }
})

// GET single membership benefit by type
router.get('/:type', async (req, res) => {
  try {
    const [benefits] = await db.query(
      'SELECT * FROM Benefits WHERE membership_type = ?',
      [req.params.type],
    )

    if (benefits.length === 0) {
      return res.status(404).json({ error: 'Membership type not found' })
    }

    res.json(benefits[0])
  } catch (error) {
    console.error('Error fetching benefit:', error)
    res.status(500).json({ error: 'Failed to fetch membership benefit' })
  }
})

export default router
