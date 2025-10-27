import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'

const router = express.Router()

// GET unresolved notifications - Admin/Employee only
router.get('/unresolved', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const [messages] = await db.query(`
      SELECT mq.*, gsi.stock_quantity, gsi.is_available
      FROM message_queue mq
      LEFT JOIN Gift_Shop_Items gsi ON mq.item_id = gsi.item_id
      WHERE mq.resolved = FALSE
      ORDER BY mq.created_at DESC
    `)
    res.json(messages)
  } catch (error) {
    console.error('Get unresolved notifications error:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET all notifications - Admin/Employee only
router.get('/', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const { resolved } = req.query
    let query = `
      SELECT mq.*, gsi.stock_quantity, gsi.is_available
      FROM message_queue mq
      LEFT JOIN Gift_Shop_Items gsi ON mq.item_id = gsi.item_id
    `

    if (resolved === 'true') {
      query += ' WHERE mq.resolved = TRUE'
    } else if (resolved === 'false') {
      query += ' WHERE mq.resolved = FALSE'
    }

    query += ' ORDER BY mq.created_at DESC LIMIT 100'

    const [messages] = await db.query(query)
    res.json(messages)
  } catch (error) {
    console.error('Get all notifications error:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET notification count - Admin/Employee only
router.get('/count', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const [result] = await db.query(`
      SELECT COUNT(*) as unresolved_count
      FROM message_queue
      WHERE resolved = FALSE
    `)
    res.json({ count: result[0].unresolved_count })
  } catch (error) {
    console.error('Get notification count error:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT resolve notification - Admin/Employee only
router.put('/:id/resolve', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE message_queue SET resolved = TRUE, resolved_at = CURRENT_TIMESTAMP WHERE message_id = ?',
      [req.params.id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ message: 'Notification resolved successfully' })
  } catch (error) {
    console.error('Resolve notification error:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT resolve all notifications for an item - Admin/Employee only
router.put('/item/:itemId/resolve-all', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const resolvedAt = new Date().toISOString()
    const [result] = await db.query(
      'UPDATE message_queue SET resolved = TRUE, resolved_at = ? WHERE item_id = ? AND resolved = FALSE',
      [resolvedAt, req.params.itemId]
    )

    res.json({
      message: 'All notifications resolved successfully',
      count: result.affectedRows
    })
  } catch (error) {
    console.error('Resolve all notifications error:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE notification - Admin only
router.delete('/:id', middleware.requireRole('admin'), async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM message_queue WHERE message_id = ?',
      [req.params.id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ message: 'Notification deleted successfully' })
  } catch (error) {
    console.error('Delete notification error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
