import express from 'express'
import db from '../config/database.js'
import middleware from '../utils/middleware.js'
import { hashPassword } from '../utils/authService.js'

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
        u.birthdate,
        u.sex,
        CASE 
          WHEN m.first_name IS NOT NULL THEN CONCAT(m.first_name, ' ', m.last_name)
          ELSE NULL
        END as manager_name
      FROM Employee e
      JOIN users u ON e.user_id = u.user_id
      LEFT JOIN Employee me ON e.manager_id = me.employee_id
      LEFT JOIN users m ON me.user_id = m.user_id
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

// POST change employee password - Admin only
router.post('/:id/change-password', middleware.requireRole('admin'), async (req, res) => {
  try {
    const { newPassword } = req.body
    const employeeId = req.params.id

    // Validate
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' })
    }

    // Get employee's user_id
    const [employees] = await db.query(
      'SELECT user_id FROM Employee WHERE employee_id = ?',
      [employeeId],
    )

    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    const userId = employees[0].user_id

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword)

    // Update password and set password_must_change flag
    await db.query(
      'UPDATE users SET password = ?, password_must_change = TRUE WHERE user_id = ?',
      [hashedPassword, userId],
    )

    res.json({
      message: 'Password changed successfully. Employee will be required to change it on next login.',
      user_id: userId,
    })
  } catch (error) {
    console.error('Error changing employee password:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST create new employee with user account - Admin only
router.post('/create-with-account', middleware.requireRole('admin'), async (req, res) => {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const {
      first_name,
      last_name,
      email,
      password,
      phone_number,
      address,
      birthdate,
      sex,
      role,
      ssn,
      hire_date,
      salary,
      responsibility,
      manager_id,
    } = req.body

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !birthdate || !sex) {
      await connection.rollback()
      connection.release()
      return res.status(400).json({
        error: 'first_name, last_name, email, password, birthdate, and sex are required for user account',
      })
    }

    if (!role || !ssn || !hire_date || !salary || !responsibility) {
      await connection.rollback()
      connection.release()
      return res.status(400).json({
        error: 'role, ssn, hire_date, salary, and responsibility are required for employee',
      })
    }

    // Check if email already exists
    const [existingUsers] = await connection.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email],
    )
    if (existingUsers.length > 0) {
      await connection.rollback()
      connection.release()
      return res.status(409).json({ error: 'Email already registered' })
    }

    // Check if SSN already exists
    const [existingSSN] = await connection.query(
      'SELECT employee_id FROM Employee WHERE ssn = ?',
      [ssn],
    )
    if (existingSSN.length > 0) {
      await connection.rollback()
      connection.release()
      return res.status(409).json({ error: 'SSN already registered' })
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user account
    const [userResult] = await connection.query(
      `INSERT INTO users (email, password, first_name, last_name, phone_number, address,
       birthdate, sex, password_must_change)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [email, passwordHash, first_name, last_name, phone_number || null, address || null, birthdate, sex],
    )

    const userId = userResult.insertId

    // Create employee record
    const [employeeResult] = await connection.query(
      `INSERT INTO Employee (user_id, manager_id, role, ssn, hire_date, salary, responsibility)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, manager_id || null, role, ssn, hire_date, salary, responsibility],
    )

    await connection.commit()
    connection.release()

    res.status(201).json({
      message: 'Employee account created successfully',
      employee_id: employeeResult.insertId,
      user_id: userId,
    })
  } catch (error) {
    await connection.rollback()
    connection.release()
    console.error('Employee creation error:', error)
    res.status(500).json({ error: error.message })
  }
})

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
  const connection = await db.getConnection()
  
  try {
    await connection.beginTransaction()

    const {
      manager_id, role, salary, responsibility, hire_date, ssn,
      first_name, last_name, email, phone_number, address, birthdate, sex,
    } = req.body

    // Check if employee exists and get user_id
    const [employees] = await connection.query(
      'SELECT employee_id, user_id FROM Employee WHERE employee_id = ?',
      [req.params.id],
    )
    if (employees.length === 0) {
      await connection.rollback()
      connection.release()
      return res.status(404).json({ error: 'Employee not found' })
    }

    const userId = employees[0].user_id

    // Check if manager exists (if provided)
    if (manager_id !== undefined && manager_id !== null && manager_id !== '') {
      // Prevent self-referencing
      if (parseInt(manager_id, 10) === parseInt(req.params.id, 10)) {
        await connection.rollback()
        connection.release()
        return res.status(400).json({ error: 'Employee cannot be their own manager' })
      }

      const [managers] = await connection.query('SELECT employee_id FROM Employee WHERE employee_id = ?', [manager_id])
      if (managers.length === 0) {
        await connection.rollback()
        connection.release()
        return res.status(404).json({ error: 'Manager not found' })
      }
    }

    // Validate salary if provided
    if (salary !== undefined && salary <= 0) {
      await connection.rollback()
      connection.release()
      return res.status(400).json({ error: 'Salary must be greater than 0' })
    }

    // Update Employee table fields
    const employeeUpdates = []
    const employeeValues = []

    if (manager_id !== undefined) {
      employeeUpdates.push('manager_id = ?')
      employeeValues.push(manager_id || null)
    }
    if (role !== undefined) {
      employeeUpdates.push('role = ?')
      employeeValues.push(role)
    }
    if (salary !== undefined) {
      employeeUpdates.push('salary = ?')
      employeeValues.push(salary)
    }
    if (responsibility !== undefined) {
      employeeUpdates.push('responsibility = ?')
      employeeValues.push(responsibility)
    }
    if (hire_date !== undefined) {
      employeeUpdates.push('hire_date = ?')
      employeeValues.push(hire_date)
    }
    if (ssn !== undefined) {
      employeeUpdates.push('ssn = ?')
      employeeValues.push(ssn)
    }
    if (req.body.is_active !== undefined) {
      employeeUpdates.push('is_active = ?')
      employeeValues.push(req.body.is_active)
    }

    if (employeeUpdates.length > 0) {
      employeeValues.push(req.params.id)
      await connection.query(
        `UPDATE Employee SET ${employeeUpdates.join(', ')} WHERE employee_id = ?`,
        employeeValues,
      )
    }

    // Update users table fields
    const userUpdates = []
    const userValues = []

    if (first_name !== undefined) {
      userUpdates.push('first_name = ?')
      userValues.push(first_name)
    }
    if (last_name !== undefined) {
      userUpdates.push('last_name = ?')
      userValues.push(last_name)
    }
    if (email !== undefined) {
      userUpdates.push('email = ?')
      userValues.push(email)
    }
    if (phone_number !== undefined) {
      userUpdates.push('phone_number = ?')
      userValues.push(phone_number)
    }
    if (address !== undefined) {
      userUpdates.push('address = ?')
      userValues.push(address)
    }
    if (birthdate !== undefined) {
      userUpdates.push('birthdate = ?')
      userValues.push(birthdate)
    }
    if (sex !== undefined) {
      userUpdates.push('sex = ?')
      userValues.push(sex)
    }

    if (userUpdates.length > 0) {
      userValues.push(userId)
      await connection.query(
        `UPDATE users SET ${userUpdates.join(', ')} WHERE user_id = ?`,
        userValues,
      )
    }

    if (employeeUpdates.length === 0 && userUpdates.length === 0) {
      await connection.rollback()
      connection.release()
      return res.status(400).json({ error: 'No fields to update' })
    }

    await connection.commit()
    connection.release()

    res.json({ message: 'Employee updated successfully' })
  } catch (error) {
    await connection.rollback()
    connection.release()
    
    // Handle duplicate email error
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('email')) {
        return res.status(409).json({ error: 'Email already exists' })
      }
    }
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
