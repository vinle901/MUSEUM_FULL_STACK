import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'

const router = express.Router()

// All routes require admin role

// GET all employees - Admin only
router.get('/', middleware.requireRole('admin'), async (req, res) => {
  try {
    const [employees] = await db.query(`
      SELECT
        e.employee_id,
        e.user_id,
        e.manager_id,
        e.role,
        e.hire_date,
        e.salary,
        e.responsibility,
        e.is_active,
        e.created_at,
        e.updated_at,
        u.first_name,
        u.last_name,
        u.email,
        u.phone_number,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name
      FROM Employee e
      JOIN users u ON e.user_id = u.user_id
      LEFT JOIN Employee me ON e.manager_id = me.employee_id
      LEFT JOIN users m ON me.user_id = m.user_id
      WHERE e.is_active = TRUE
      ORDER BY e.employee_id
    `)

    res.json(employees)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET employee by ID - Admin or the employee themselves
router.get('/:id', middleware.requireRole('employee'), async (req, res) => {
  try {
    const [employees] = await db.query(`
      SELECT
        e.employee_id,
        e.user_id,
        e.manager_id,
        e.role,
        e.ssn,
        e.hire_date,
        e.salary,
        e.responsibility,
        e.is_active,
        e.created_at,
        e.updated_at,
        u.first_name,
        u.last_name,
        u.email,
        u.phone_number,
        u.address,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name
      FROM Employee e
      JOIN users u ON e.user_id = u.user_id
      LEFT JOIN Employee me ON e.manager_id = me.employee_id
      LEFT JOIN users m ON me.user_id = m.user_id
      WHERE e.employee_id = ?
    `, [req.params.id])

    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Check authorization: admin can view any employee, employee can only view themselves
    if (req.user.role !== 'admin' && employees[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Forbidden: You can only view your own employee record' })
    }

    res.json(employees[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET employee by user_id - Admin only
router.get('/user/:userId', middleware.requireRole('admin'), async (req, res) => {
  try {
    const [employees] = await db.query(`
      SELECT
        e.employee_id,
        e.user_id,
        e.manager_id,
        e.role,
        e.ssn,
        e.hire_date,
        e.salary,
        e.responsibility,
        e.is_active,
        e.created_at,
        e.updated_at,
        u.first_name,
        u.last_name,
        u.email
      FROM Employee e
      JOIN users u ON e.user_id = u.user_id
      WHERE e.user_id = ?
    `, [req.params.userId])

    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found for this user' })
    }

    res.json(employees[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GET employees by manager (org chart) - Admin only
router.get('/:id/subordinates', middleware.requireRole('admin'), async (req, res) => {
  try {
    const [employees] = await db.query(`
      SELECT
        e.employee_id,
        e.user_id,
        e.role,
        e.hire_date,
        e.is_active,
        u.first_name,
        u.last_name,
        u.email
      FROM Employee e
      JOIN users u ON e.user_id = u.user_id
      WHERE e.manager_id = ? AND e.is_active = TRUE
      ORDER BY e.role, u.last_name
    `, [req.params.id])

    res.json(employees)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Protected routes - Only admin can modify employees

// POST create new employee (promote user) - Admin only
router.post('/', middleware.requireRole('admin'), async (req, res) => {
  try {
    const {
      user_id, manager_id, role, ssn, hire_date, salary, responsibility,
    } = req.body

    // Validate required fields
    if (!user_id || !role || !ssn || !hire_date || !salary || !responsibility) {
      return res.status(400).json({
        error: 'user_id, role, ssn, hire_date, salary, and responsibility are required',
      })
    }

    // Check if user exists
    const [users] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [user_id])
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if user is already an employee
    const [existingEmployee] = await db.query('SELECT employee_id FROM Employee WHERE user_id = ?', [user_id])
    if (existingEmployee.length > 0) {
      return res.status(409).json({ error: 'User is already an employee' })
    }

    // Check if manager exists (if provided)
    if (manager_id) {
      const [managers] = await db.query('SELECT employee_id FROM Employee WHERE employee_id = ?', [manager_id])
      if (managers.length === 0) {
        return res.status(404).json({ error: 'Manager not found' })
      }
    }

    // Validate salary is positive
    if (salary <= 0) {
      return res.status(400).json({ error: 'Salary must be greater than 0' })
    }

    // Insert new employee
    const [result] = await db.query(
      `INSERT INTO Employee (user_id, manager_id, role, ssn, hire_date, salary, responsibility)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, manager_id || null, role, ssn, hire_date, salary, responsibility],
    )

    res.status(201).json({
      employee_id: result.insertId,
      message: 'Employee created successfully',
    })
  } catch (error) {
    // Handle duplicate SSN error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'SSN already exists' })
    }
    res.status(500).json({ error: error.message })
  }
})

// PUT update employee - Admin only
router.put('/:id', middleware.requireRole('admin'), async (req, res) => {
  try {
    const {
      manager_id, role, salary, responsibility,
    } = req.body

    // Check if employee exists
    const [employees] = await db.query('SELECT employee_id FROM Employee WHERE employee_id = ?', [req.params.id])
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Check if manager exists (if provided)
    if (manager_id !== undefined && manager_id !== null) {
      // Prevent self-referencing
      if (parseInt(manager_id, 10) === parseInt(req.params.id, 10)) {
        return res.status(400).json({ error: 'Employee cannot be their own manager' })
      }

      const [managers] = await db.query('SELECT employee_id FROM Employee WHERE employee_id = ?', [manager_id])
      if (managers.length === 0) {
        return res.status(404).json({ error: 'Manager not found' })
      }
    }

    // Validate salary if provided
    if (salary !== undefined && salary <= 0) {
      return res.status(400).json({ error: 'Salary must be greater than 0' })
    }

    // Build dynamic update query
    const updates = []
    const values = []

    if (manager_id !== undefined) {
      updates.push('manager_id = ?')
      values.push(manager_id)
    }
    if (role !== undefined) {
      updates.push('role = ?')
      values.push(role)
    }
    if (salary !== undefined) {
      updates.push('salary = ?')
      values.push(salary)
    }
    if (responsibility !== undefined) {
      updates.push('responsibility = ?')
      values.push(responsibility)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    values.push(req.params.id)

    await db.query(
      `UPDATE Employee SET ${updates.join(', ')} WHERE employee_id = ?`,
      values,
    )

    res.json({ message: 'Employee updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PATCH deactivate employee - Admin only
router.patch('/:id/deactivate', middleware.requireRole('admin'), async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE Employee SET is_active = FALSE WHERE employee_id = ?',
      [req.params.id],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    res.json({ message: 'Employee deactivated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// PATCH activate employee - Admin only
router.patch('/:id/activate', middleware.requireRole('admin'), async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE Employee SET is_active = TRUE WHERE employee_id = ?',
      [req.params.id],
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    res.json({ message: 'Employee activated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// DELETE employee - Admin only
router.delete('/:id', middleware.requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM Employee WHERE employee_id = ?', [req.params.id])
    res.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
