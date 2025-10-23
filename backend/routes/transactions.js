/* eslint-disable padded-blocks */
/* eslint-disable object-curly-newline */
/* eslint-disable arrow-parens */
/* eslint-disable no-trailing-spaces */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable comma-dangle */
/* eslint-disable object-shorthand */
// File: backend/routes/transactions.js

import express from 'express'
import db from '../config/database.js'

const router = express.Router()

// GET all transactions for a user
// IMPORTANT: Specific routes like /user/:userId must come BEFORE generic /:id routes
router.get('/user/:userId', async (req, res) => {
  try {
    // Check if requesting user matches userId OR user is admin
    if (req.user && req.user.id !== parseInt(req.params.userId, 10) && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: You can only view your own transactions' })
    }

    const [transactions] = await db.query(
      'SELECT * FROM Transactions WHERE user_id = ? ORDER BY transaction_date DESC',
      [req.params.userId]
    )
    res.json(transactions)
  } catch (error) {
    console.error('Get user transactions error:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET transaction by ID with all details
router.get('/:id', async (req, res) => {
  try {
    // Require authentication
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const [transactions] = await db.query(
      'SELECT * FROM Transactions WHERE transaction_id = ?',
      [req.params.id]
    )

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    // Check if requesting user owns this transaction OR is admin
    if (req.user.id !== transactions[0].user_id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: You can only view your own transactions' })
    }

    // Get all purchase details based on schema

    // Ticket purchases with full details
    const [tickets] = await db.query(
      `SELECT
        tp.*,
        tt.ticket_name,
        tt.description as ticket_description,
        ex.exhibition_name,
        ev.event_name,
        ev.event_date,
        ev.event_time
       FROM Ticket_Purchase tp
       LEFT JOIN Ticket_Types tt ON tp.ticket_type_id = tt.ticket_type_id
       LEFT JOIN Exhibition ex ON tp.exhibition_id = ex.exhibition_id
       LEFT JOIN Events ev ON tp.event_id = ev.event_id
       WHERE tp.transaction_id = ?`,
      [req.params.id],
    )

    // Gift shop purchases with item details
    const [giftItems] = await db.query(
      `SELECT
        gsp.*,
        gsi.category,
        gsi.description,
        gsi.image_url
       FROM Gift_Shop_Purchase gsp
       LEFT JOIN Gift_Shop_Items gsi ON gsp.gift_item_id = gsi.item_id
       WHERE gsp.transaction_id = ?`,
      [req.params.id],
    )

    // Cafeteria purchases with item details
    const [cafeteriaItems] = await db.query(
      `SELECT
        cp.*,
        ci.category,
        ci.description,
        ci.is_vegetarian,
        ci.is_vegan,
        ci.allergen_info
       FROM Cafeteria_Purchase cp
       LEFT JOIN Cafeteria_Items ci ON cp.cafeteria_item_id = ci.item_id
       WHERE cp.transaction_id = ?`,
      [req.params.id],
    )

    // Membership purchases with full membership details
    const [memberships] = await db.query(
      `SELECT
        mp.*,
        m.membership_type,
        m.start_date,
        m.expiration_date,
        m.is_active,
        b.annual_fee,
        b.unlimited_visits,
        b.priority_entry,
        b.guest_passes,
        b.access_to_member_events,
        b.discount_percentage
       FROM Membership_Purchase mp
       LEFT JOIN Membership m ON mp.membership_id = m.membership_id
       LEFT JOIN Benefits b ON m.membership_type = b.membership_type
       WHERE mp.transaction_id = ?`,
      [req.params.id],
    )

    // Donations
    const [donations] = await db.query(
      `SELECT
        donation_id,
        transaction_id,
        amount as donation_amount,
        donation_type,
        is_anonymous,
        dedication_message as donation_message,
        tax_receipt_sent,
        donated_at
       FROM Donation
       WHERE transaction_id = ?`,
      [req.params.id],
    )

    res.json({
      transaction: transactions[0],
      tickets,
      giftItems,
      cafeteriaItems,
      memberships,
      donations,
    })
  } catch (error) {
    console.error('Get transaction details error:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST create new transaction (basic - for internal use)
router.post('/', async (req, res) => {
  try {
    const {
      user_id, total_price, total_items, payment_method, transaction_status,
    } = req.body

    // Check if requesting user matches user_id OR is admin
    if (req.user && req.user.id !== user_id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: You can only create transactions for yourself' })
    }

    const [result] = await db.query(
      'INSERT INTO Transactions (user_id, total_price, total_items, payment_method, transaction_status) VALUES (?, ?, ?, ?, ?)',
      [user_id, total_price, total_items, payment_method, transaction_status || 'Completed']
    )
    
    res.status(201).json({ 
      transaction_id: result.insertId, 
      message: 'Transaction created successfully' 
    })
  } catch (error) {
    console.error('Create transaction error:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST process gift shop checkout - MAIN ENDPOINT FOR GIFT SHOP
router.post('/gift-shop-checkout', async (req, res) => {
  let connection
  
  try {
    // Get connection from pool
    connection = await db.getConnection()
    
    const {
      user_id,
      payment_method,
      total_price,
      cart_items, // Array of { item_id, quantity }
      customer_info, // Optional: { email, firstName, lastName, ... }
    } = req.body

    console.log('Gift shop checkout request:', { user_id, payment_method, total_price, cart_items })

    // Validation
    if (!user_id || !payment_method || !total_price || !cart_items || cart_items.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, payment_method, total_price, cart_items' 
      })
    }

    // Validate payment method matches schema ENUM
    const validPaymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Mobile Payment']
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ 
        error: `Invalid payment_method. Must be one of: ${validPaymentMethods.join(', ')}` 
      })
    }

    // Start database transaction
    await connection.beginTransaction()
    console.log('Database transaction started')

    // Step 1: Validate all items exist and get their details
    const itemIds = cart_items.map(item => item.item_id)
    const placeholders = itemIds.map(() => '?').join(',')
    const [dbItems] = await connection.query(
      `SELECT item_id, item_name, price, stock_quantity, is_available 
       FROM Gift_Shop_Items 
       WHERE item_id IN (${placeholders})`,
      itemIds
    )

    console.log(`Found ${dbItems.length} items in database`)

    // Check if all items were found
    if (dbItems.length !== cart_items.length) {
      await connection.rollback()
      return res.status(404).json({ 
        error: 'One or more items not found in database',
        requested: itemIds,
        found: dbItems.map(item => item.item_id)
      })
    }

    // Create a map for easy lookup and convert price strings to numbers
    const itemMap = {}
    dbItems.forEach(item => {
      itemMap[item.item_id] = {
        ...item,
        price: parseFloat(item.price), // Convert DECIMAL string to number
        stock_quantity: parseInt(item.stock_quantity, 10)
      }
    })

    // Step 2: Validate stock availability and item availability
    for (const cartItem of cart_items) {
      const dbItem = itemMap[cartItem.item_id]
      
      if (!dbItem.is_available) {
        await connection.rollback()
        return res.status(400).json({ 
          error: `Item "${dbItem.item_name}" is not available for purchase` 
        })
      }

      // Stock validation
      if (dbItem.stock_quantity < cartItem.quantity) {
        await connection.rollback()
        return res.status(400).json({ 
          error: `Insufficient stock for item "${dbItem.item_name}". Available: ${dbItem.stock_quantity}, Requested: ${cartItem.quantity}` 
        })
      }
    }

    // Step 3: Calculate total items
    const total_items = cart_items.reduce((sum, item) => sum + item.quantity, 0)
    console.log(`Total items: ${total_items}`)

    // Step 4: Insert Transaction record
    const [transactionResult] = await connection.query(
      `INSERT INTO Transactions 
       (user_id, total_price, total_items, payment_method, transaction_status, employee_id) 
       VALUES (?, ?, ?, ?, 'Completed', NULL)`,
      [user_id, total_price, total_items, payment_method]
    )

    const transaction_id = transactionResult.insertId
    console.log(`Transaction created with ID: ${transaction_id}`)

    // Step 5: Insert Gift_Shop_Purchase records and update stock
    const purchaseRecords = []
    
    for (const cartItem of cart_items) {
      const dbItem = itemMap[cartItem.item_id]
      const line_total = parseFloat((dbItem.price * cartItem.quantity).toFixed(2))

      // Insert purchase record
      const [purchaseResult] = await connection.query(
        `INSERT INTO Gift_Shop_Purchase 
         (transaction_id, gift_item_id, item_name, quantity, unit_price, line_total) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          transaction_id,
          cartItem.item_id,
          dbItem.item_name,
          cartItem.quantity,
          dbItem.price,
          line_total
        ]
      )

      purchaseRecords.push({
        purchase_id: purchaseResult.insertId,
        transaction_id: transaction_id,
        gift_item_id: cartItem.item_id,
        item_name: dbItem.item_name,
        quantity: cartItem.quantity,
        unit_price: dbItem.price,
        line_total: line_total
      })

      console.log(`Purchase record created for ${dbItem.item_name}`)

      // Update stock quantity
      // eslint-disable-next-line no-await-in-loop
      await connection.query(
        `UPDATE Gift_Shop_Items 
         SET stock_quantity = stock_quantity - ? 
         WHERE item_id = ?`,
        [cartItem.quantity, cartItem.item_id]
      )

      console.log(`Stock updated for item ${cartItem.item_id}`)
    }

    // Step 6: Commit transaction
    await connection.commit()
    console.log('Database transaction committed successfully')

    // Step 7: Return success response
    res.status(201).json({
      success: true,
      message: 'Gift shop purchase completed successfully',
      transaction: {
        transaction_id: transaction_id,
        user_id: user_id,
        total_price: parseFloat(total_price),
        total_items: total_items,
        payment_method: payment_method,
        transaction_status: 'Completed'
      },
      purchases: purchaseRecords,
      customer_info: customer_info || null
    })

  } catch (error) {
    // Rollback on any error
    if (connection) {
      await connection.rollback()
      console.log('Database transaction rolled back due to error')
    }
    console.error('Gift shop checkout error:', error)
    res.status(500).json({ 
      error: 'Transaction failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  } finally {
    // Release connection back to pool
    if (connection) {
      connection.release()
      console.log('Database connection released')
    }
  }
})

// PUT update transaction status
router.put('/:id', async (req, res) => {
  try {
    // First, get the transaction to check ownership
    const [transactions] = await db.query(
      'SELECT user_id FROM Transactions WHERE transaction_id = ?', 
      [req.params.id]
    )
    
    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    // Check if requesting user owns this transaction OR is admin
    if (req.user && req.user.id !== transactions[0].user_id && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: You can only update your own transactions' })
    }

    const { transaction_status } = req.body
    
    // Validate transaction_status matches schema ENUM
    const validStatuses = ['Pending', 'Completed', 'Cancelled', 'Refunded']
    if (!validStatuses.includes(transaction_status)) {
      return res.status(400).json({ 
        error: `Invalid transaction_status. Must be one of: ${validStatuses.join(', ')}` 
      })
    }

    await db.query(
      'UPDATE Transactions SET transaction_status = ? WHERE transaction_id = ?',
      [transaction_status, req.params.id]
    )
    
    res.json({ message: 'Transaction updated successfully' })
  } catch (error) {
    console.error('Update transaction error:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST process membership checkout - MAIN ENDPOINT FOR MEMBERSHIP PURCHASE
router.post('/membership-checkout', async (req, res) => {
  let connection

  try {
    // Get connection from pool
    connection = await db.getConnection()

    const {
      user_id,
      payment_method,
      membership_type,
      total_paid, // Total including tax from frontend
    } = req.body

    console.log('Membership checkout request:', { user_id, payment_method, membership_type, total_paid })

    // Validation
    if (!user_id || !payment_method || !membership_type) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, payment_method, membership_type',
      })
    }

    // Validate payment method matches schema ENUM
    const validPaymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Mobile Payment']
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({
        error: `Invalid payment_method. Must be one of: ${validPaymentMethods.join(', ')}`,
      })
    }

    // Start database transaction
    await connection.beginTransaction()
    console.log('Database transaction started')

    // Step 1: Get membership type details from Benefits table
    const [benefits] = await connection.query(
      'SELECT * FROM Benefits WHERE membership_type = ?',
      [membership_type],
    )

    if (benefits.length === 0) {
      await connection.rollback()
      return res.status(400).json({ error: 'Invalid membership type' })
    }

    const membershipBenefit = benefits[0]
    // Use total_paid from frontend (includes tax) if provided, otherwise use annual_fee
    const totalPrice = total_paid ? parseFloat(total_paid) : parseFloat(membershipBenefit.annual_fee)

    // Step 2: Check if user already has an active membership
    const [existingMemberships] = await connection.query(
      'SELECT * FROM Membership WHERE user_id = ? AND is_active = TRUE',
      [user_id],
    )

    const isRenewal = existingMemberships.length > 0

    // Step 3: Create transaction record
    const [transactionResult] = await connection.query(
      `INSERT INTO Transactions
       (user_id, total_price, total_items, payment_method, transaction_status)
       VALUES (?, ?, 1, ?, 'Completed')`,
      [user_id, totalPrice, payment_method],
    )

    const transactionId = transactionResult.insertId
    console.log('Transaction created:', transactionId)

    // Step 4: Create or update membership record
    if (isRenewal) {
      // Deactivate old membership
      await connection.query(
        'UPDATE Membership SET is_active = FALSE WHERE user_id = ? AND is_active = TRUE',
        [user_id],
      )
      console.log('Deactivated old membership')
    }

    // Create new membership
    const startDate = new Date()
    const expirationDate = new Date()
    expirationDate.setFullYear(expirationDate.getFullYear() + 1) // Add 1 year

    const [membershipResult] = await connection.query(
      `INSERT INTO Membership
       (user_id, membership_type, start_date, expiration_date, is_active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [
        user_id,
        membership_type,
        startDate.toISOString().split('T')[0],
        expirationDate.toISOString().split('T')[0],
      ],
    )

    const membershipId = membershipResult.insertId
    console.log('Membership created:', membershipId)

    // Step 5: Create membership purchase record
    await connection.query(
      `INSERT INTO Membership_Purchase
       (transaction_id, membership_id, amount_paid, is_renewal)
       VALUES (?, ?, ?, ?)`,
      [transactionId, membershipId, totalPrice, isRenewal],
    )

    console.log('Membership purchase record created')

    // Commit the transaction
    await connection.commit()
    console.log('Database transaction committed successfully')

    res.status(201).json({
      success: true,
      message: 'Membership purchased successfully',
      transaction_id: transactionId,
      membership_id: membershipId,
      membership_type,
      start_date: startDate.toISOString().split('T')[0],
      expiration_date: expirationDate.toISOString().split('T')[0],
      total_paid: totalPrice,
      is_renewal: isRenewal,
    })
  } catch (error) {
    // Rollback on error
    if (connection) {
      try {
        await connection.rollback()
        console.log('Transaction rolled back due to error')
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError)
      }
    }

    console.error('Membership checkout error:', error)
    res.status(500).json({
      error: 'Failed to process membership purchase',
      details: error.message,
    })
  } finally {
    // Release connection back to pool
    if (connection) {
      connection.release()
    }
  }
})

export default router
