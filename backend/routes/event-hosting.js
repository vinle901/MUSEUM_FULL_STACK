import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'

const router = express.Router()

// GET all hosts for a specific event
router.get('/event/:eventId', async (req, res) => {
  try {
    const [hosts] = await db.query(`
      SELECT
        eh.hosting_id,
        eh.event_id,
        eh.employee_id,
        eh.role,
        eh.assigned_date,
        e.role as employee_role,
        u.first_name,
        u.last_name,
        u.email
      FROM Event_Hosting eh
      JOIN Employee e ON eh.employee_id = e.employee_id
      JOIN users u ON e.user_id = u.user_id
      WHERE eh.event_id = ?
      ORDER BY eh.role, u.last_name
    `, [req.params.eventId])
    res.json(hosts)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET all events for a specific employee
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const [events] = await db.query(`
      SELECT
        eh.hosting_id,
        eh.event_id,
        eh.employee_id,
        eh.role as hosting_role,
        eh.assigned_date,
        ev.event_name,
        ev.event_date,
        ev.event_time,
        ev.location,
        ev.is_cancelled
      FROM Event_Hosting eh
      JOIN Events ev ON eh.event_id = ev.event_id
      WHERE eh.employee_id = ?
      ORDER BY ev.event_date DESC, ev.event_time DESC
    `, [req.params.employeeId])
    res.json(events)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET specific hosting assignment by ID
router.get('/:id', async (req, res) => {
  try {
    const [hosts] = await db.query(`
      SELECT
        eh.*,
        e.role as employee_role,
        u.first_name,
        u.last_name,
        ev.event_name
      FROM Event_Hosting eh
      JOIN Employee e ON eh.employee_id = e.employee_id
      JOIN users u ON e.user_id = u.user_id
      JOIN Events ev ON eh.event_id = ev.event_id
      WHERE eh.hosting_id = ?
    `, [req.params.id])

    if (hosts.length === 0) {
      return res.status(404).json({ error: 'Hosting assignment not found' })
    }

    res.json(hosts[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Protected routes - Only admin/employee can manage event hosting

// POST assign employee to event - Admin/Employee only
router.post('/', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const { event_id, employee_id, role } = req.body

    // Validate required fields
    if (!event_id || !employee_id || !role) {
      return res.status(400).json({
        error: 'event_id, employee_id, and role are required'
      })
    }

    // Check if event exists
    const [events] = await db.query('SELECT event_id FROM Events WHERE event_id = ?', [event_id])
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    // Check if employee exists and is active
    const [employees] = await db.query(
      'SELECT employee_id FROM Employee WHERE employee_id = ? AND is_active = TRUE',
      [employee_id]
    )
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found or inactive' })
    }

    // Insert hosting assignment
    const [result] = await db.query(
      'INSERT INTO Event_Hosting (event_id, employee_id, role) VALUES (?, ?, ?)',
      [event_id, employee_id, role]
    )

    res.status(201).json({
      hosting_id: result.insertId,
      message: 'Employee assigned to event successfully'
    })
  } catch (error) {
    // Handle duplicate assignment (unique constraint violation)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Employee is already assigned to this event with this role'
      })
    }
    res.status(500).json({ error: error.message })
  }
})

// PUT update hosting role - Admin/Employee only
router.put('/:id', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const { role } = req.body

    if (!role) {
      return res.status(400).json({ error: 'role is required' })
    }

    // Check if hosting assignment exists
    const [hosts] = await db.query(
      'SELECT hosting_id FROM Event_Hosting WHERE hosting_id = ?',
      [req.params.id]
    )
    if (hosts.length === 0) {
      return res.status(404).json({ error: 'Hosting assignment not found' })
    }

    await db.query(
      'UPDATE Event_Hosting SET role = ? WHERE hosting_id = ?',
      [role, req.params.id]
    )

    res.json({ message: 'Hosting assignment updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE remove employee from event - Admin/Employee only
router.delete('/:id', middleware.requireRole('admin', 'employee'), async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM Event_Hosting WHERE hosting_id = ?',
      [req.params.id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Hosting assignment not found' })
    }

    res.json({ message: 'Employee removed from event successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
