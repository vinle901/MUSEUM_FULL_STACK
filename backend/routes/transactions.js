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
        gsi.image_url,
        gsi.price as current_price
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
        ci.price as current_price
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

    // Step 2.5: Check if user has an active membership and get discount percentage
    // IMPORTANT: Only apply discounts if the authenticated user matches user_id and is not a guest
    let discountPercentage = 0
    let membershipType = null

    const isAuthenticated = !!req.user
    const isSameUser = isAuthenticated && Number(req.user.id) === Number(user_id)
    const isGuestUser = Number(user_id) === 1

    if (isSameUser && !isGuestUser) {
      const [userMemberships] = await connection.query(
        `SELECT m.membership_type, b.discount_percentage
         FROM Membership m
         JOIN Benefits b ON m.membership_type = b.membership_type
         WHERE m.user_id = ? 
         AND m.is_active = TRUE 
         AND m.expiration_date >= CURDATE()
         LIMIT 1`,
        [user_id]
      )

      if (userMemberships.length > 0) {
        discountPercentage = parseFloat(userMemberships[0].discount_percentage) || 0
        membershipType = userMemberships[0].membership_type
        console.log(`User has active membership: ${membershipType} with ${discountPercentage}% discount`)
      } else {
        console.log('User has no active membership or membership has expired')
      }
    } else {
      console.log('Skipping membership discount: unauthenticated, mismatched user, or guest checkout')
    }

    // Step 3: Calculate total items and subtotal
    const total_items = cart_items.reduce((sum, item) => sum + item.quantity, 0)
    console.log(`Total items: ${total_items}`)

    // Calculate subtotal (line_total does NOT include tax)
    let subtotal = 0

    for (const cartItem of cart_items) {
      const dbItem = itemMap[cartItem.item_id]
      const originalPrice = dbItem.price
      const discountedUnitPrice = parseFloat((originalPrice * (1 - discountPercentage / 100)).toFixed(2))
      const lineTotal = parseFloat((discountedUnitPrice * cartItem.quantity).toFixed(2))
      subtotal += lineTotal
    }

    subtotal = parseFloat(subtotal.toFixed(2))
    console.log(`Calculated subtotal: ${subtotal}`)

    // Calculate tax on total
    const TAX_RATE = 0.0825
    const taxAmount = parseFloat((subtotal * TAX_RATE).toFixed(2))
    const calculatedTotalPrice = parseFloat((subtotal + taxAmount).toFixed(2))
    console.log(`Calculated total price with tax: ${calculatedTotalPrice}`)

    // Step 4: Insert Transaction record (using calculated price with discount and tax)
    const [transactionResult] = await connection.query(
      `INSERT INTO Transactions
       (user_id, total_price, total_items, payment_method, transaction_status, employee_id)
       VALUES (?, ?, ?, ?, 'Completed', NULL)`,
      [user_id, calculatedTotalPrice, total_items, payment_method]
    )

    const transaction_id = transactionResult.insertId
    console.log(`Transaction created with ID: ${transaction_id}`)

    // Step 5: Insert Gift_Shop_Purchase records and update stock
    const purchaseRecords = []

    for (const cartItem of cart_items) {
      const dbItem = itemMap[cartItem.item_id]
      // Apply membership discount to the unit price
      const originalPrice = dbItem.price
      const discountedUnitPrice = parseFloat((originalPrice * (1 - discountPercentage / 100)).toFixed(2))
      const line_total = parseFloat((discountedUnitPrice * cartItem.quantity).toFixed(2))

      // Insert purchase record with discounted prices
      const [purchaseResult] = await connection.query(
        `INSERT INTO Gift_Shop_Purchase
         (transaction_id, gift_item_id, item_name, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          transaction_id,
          cartItem.item_id,
          dbItem.item_name,
          cartItem.quantity,
          discountedUnitPrice,
          line_total
        ]
      )

      purchaseRecords.push({
        purchase_id: purchaseResult.insertId,
        transaction_id: transaction_id,
        gift_item_id: cartItem.item_id,
        item_name: dbItem.item_name,
        quantity: cartItem.quantity,
        unit_price: discountedUnitPrice,
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

    // Step 7: Return success response with discount information
    res.status(201).json({
      success: true,
      message: 'Gift shop purchase completed successfully',
      transaction: {
        transaction_id: transaction_id,
        user_id: user_id,
        total_price: calculatedTotalPrice,
        total_items: total_items,
        payment_method: payment_method,
        transaction_status: 'Completed'
      },
      purchases: purchaseRecords,
      customer_info: customer_info || null,
      discount: {
        applied: discountPercentage > 0,
        percentage: discountPercentage,
        membership_type: membershipType
      }
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

// POST process ticket checkout - MAIN ENDPOINT FOR TICKET PURCHASES
router.post('/ticket-checkout', async (req, res) => {
  let connection

  try {
    connection = await db.getConnection()

    const {
      user_id,
      payment_method,
      visit_date,
      items // Array of { ticket_type_id, quantity }
    } = req.body

    // Basic validation
    if (!user_id || !payment_method || !visit_date || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: user_id, payment_method, visit_date, items' })
    }

    const validPaymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Mobile Payment']
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ error: `Invalid payment_method. Must be one of: ${validPaymentMethods.join(', ')}` })
    }

    // Start DB transaction
    await connection.beginTransaction()

    // Step 1: Load ticket types and prices from DB (do not trust client)
    const ids = items.map(it => it.ticket_type_id)
    const placeholders = ids.map(() => '?').join(',')
    const [dbTypes] = await connection.query(
      `SELECT ticket_type_id, ticket_name, base_price, is_available
       FROM Ticket_Types
       WHERE ticket_type_id IN (${placeholders})`,
      ids
    )

    if (dbTypes.length !== items.length) {
      await connection.rollback()
      return res.status(404).json({ error: 'One or more ticket types not found' })
    }

    const typeMap = {}
    dbTypes.forEach(t => {
      typeMap[t.ticket_type_id] = {
        ...t,
        base_price: parseFloat(t.base_price)
      }
    })

    // Step 2: Check availability and normalize quantities
    for (const it of items) {
      const dbType = typeMap[it.ticket_type_id]
      if (!dbType.is_available) {
        await connection.rollback()
        return res.status(400).json({ error: `Ticket "${dbType.ticket_name}" is not available` })
      }
      if (!it.quantity || it.quantity < 1) {
        await connection.rollback()
        return res.status(400).json({ error: 'All items must have quantity >= 1' })
      }
    }

    // Step 3: Ticket pricing no longer uses membership free admission.

    // Step 4: Compute totals
    const totalItems = items.reduce((sum, it) => sum + it.quantity, 0)
    let subtotal = 0

    const purchaseRows = []

    for (const it of items) {
      const dbType = typeMap[it.ticket_type_id]
      const base = dbType.base_price
      const final = base
      const discount = 0
      const lineTotal = parseFloat((final * it.quantity).toFixed(2))

      subtotal += lineTotal

      purchaseRows.push({
        ticket_type_id: it.ticket_type_id,
        quantity: it.quantity,
        base_price: base,
        discount_amount: discount,
        final_price: final,
        line_total: lineTotal
      })
    }

    subtotal = parseFloat(subtotal.toFixed(2))

    // Calculate tax on total
    const TAX_RATE = 0.0825
    const taxAmount = parseFloat((subtotal * TAX_RATE).toFixed(2))
    const totalPrice = parseFloat((subtotal + taxAmount).toFixed(2))

    // Step 5: Insert Transaction (only total_price stored in DB)
    const [tx] = await connection.query(
      `INSERT INTO Transactions (user_id, total_price, total_items, payment_method, transaction_status, employee_id)
       VALUES (?, ?, ?, ?, 'Completed', NULL)`,
      [user_id, totalPrice, totalItems, payment_method]
    )
    const transaction_id = tx.insertId

    // Step 6: Insert Ticket_Purchase rows
    for (const row of purchaseRows) {
      // eslint-disable-next-line no-await-in-loop
      await connection.query(
        `INSERT INTO Ticket_Purchase
         (transaction_id, ticket_type_id, quantity, base_price, discount_amount, final_price, line_total, exhibition_id, event_id, visit_date, is_used)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, FALSE)`,
        [transaction_id, row.ticket_type_id, row.quantity, row.base_price, row.discount_amount, row.final_price, row.line_total, visit_date]
      )
    }

    await connection.commit()

    return res.status(201).json({
      success: true,
      message: 'Ticket purchase completed successfully',
      transaction: {
        transaction_id,
        user_id,
        total_price: totalPrice,
        total_items: totalItems,
        payment_method,
        transaction_status: 'Completed'
      }
    })

  } catch (error) {
    if (connection) {
      try { await connection.rollback() } catch {}
    }
    console.error('Ticket checkout error:', error)
    return res.status(500).json({ error: 'Transaction failed', details: error.message })
  } finally {
    if (connection) connection.release()
  }
})

// POST process combined checkout for gift shop items + tickets
router.post('/combined-checkout', async (req, res) => {
  let connection

  try {
    connection = await db.getConnection()

    const { user_id, payment_method, gift_items = [], ticket_items = [], customer_info } = req.body

    if (!user_id || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields: user_id, payment_method' })
    }

    if (gift_items.length === 0 && ticket_items.length === 0) {
      return res.status(400).json({ error: 'No items to checkout' })
    }

    const validPaymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Mobile Payment']
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ error: `Invalid payment_method. Must be one of: ${validPaymentMethods.join(', ')}` })
    }

    await connection.beginTransaction()

    // Determine membership benefits once (gift shop only)
    let discountPercentage = 0
    let membershipType = null

    const isAuthenticated = !!req.user
    const isSameUser = isAuthenticated && Number(req.user.id) === Number(user_id)
    const isGuestUser = Number(user_id) === 1

    if (isSameUser && !isGuestUser) {
      const [userMemberships] = await connection.query(
        `SELECT m.membership_type, b.discount_percentage, b.unlimited_visits
         FROM Membership m
         JOIN Benefits b ON m.membership_type = b.membership_type
         WHERE m.user_id = ? AND m.is_active = TRUE AND m.expiration_date >= CURDATE()
         LIMIT 1`,
        [user_id]
      )

      if (userMemberships.length > 0) {
        discountPercentage = parseFloat(userMemberships[0].discount_percentage) || 0
        membershipType = userMemberships[0].membership_type
      }
    }

    // Process Gift Shop items
    let giftTotal = 0
    let giftCount = 0
    const giftPurchaseRecords = []

    if (gift_items.length > 0) {
      const giftIds = gift_items.map(i => i.item_id)
      const placeholders = giftIds.map(() => '?').join(',')
      const [dbItems] = await connection.query(
        `SELECT item_id, item_name, price, stock_quantity, is_available
         FROM Gift_Shop_Items WHERE item_id IN (${placeholders})`,
        giftIds
      )

      if (dbItems.length !== gift_items.length) {
        await connection.rollback()
        return res.status(404).json({ error: 'One or more gift items not found' })
      }

      const itemMap = {}
      dbItems.forEach(i => {
        itemMap[i.item_id] = {
          ...i,
          price: parseFloat(i.price),
          stock_quantity: parseInt(i.stock_quantity, 10)
        }
      })

      for (const gi of gift_items) {
        const dbItem = itemMap[gi.item_id]
        if (!dbItem.is_available) {
          await connection.rollback()
          return res.status(400).json({ error: `Item "${dbItem.item_name}" is not available for purchase` })
        }
        if (dbItem.stock_quantity < gi.quantity) {
          await connection.rollback()
          return res.status(400).json({ error: `Insufficient stock for item "${dbItem.item_name}"` })
        }

        const originalPrice = dbItem.price
        const discountedUnitPrice = parseFloat((originalPrice * (1 - discountPercentage / 100)).toFixed(2))
        const line_total = parseFloat((discountedUnitPrice * gi.quantity).toFixed(2))
        giftTotal += line_total
        giftCount += gi.quantity

        // Insert gift purchase
        // eslint-disable-next-line no-await-in-loop
        const [purchaseResult] = await connection.query(
          `INSERT INTO Gift_Shop_Purchase (transaction_id, gift_item_id, item_name, quantity, unit_price, line_total)
           VALUES (NULL, ?, ?, ?, ?, ?)`,
          [dbItem.item_id, dbItem.item_name, gi.quantity, discountedUnitPrice, line_total]
        )
        giftPurchaseRecords.push({ purchase_id: purchaseResult.insertId })

        // Update stock
        // eslint-disable-next-line no-await-in-loop
        await connection.query(
          `UPDATE Gift_Shop_Items SET stock_quantity = stock_quantity - ? WHERE item_id = ?`,
          [gi.quantity, dbItem.item_id]
        )
      }
    }

    // Process Tickets
    let ticketTotal = 0
    let ticketCount = 0
    const ticketPurchaseRows = []

    if (ticket_items.length > 0) {
      const typeIds = ticket_items.map(t => t.ticket_type_id)
      const placeholders = typeIds.map(() => '?').join(',')
      const [dbTypes] = await connection.query(
        `SELECT ticket_type_id, ticket_name, base_price, is_available
         FROM Ticket_Types WHERE ticket_type_id IN (${placeholders})`,
        typeIds
      )
      if (dbTypes.length !== ticket_items.length) {
        await connection.rollback()
        return res.status(404).json({ error: 'One or more ticket types not found' })
      }
      const typeMap = {}
      dbTypes.forEach(t => { typeMap[t.ticket_type_id] = { ...t, base_price: parseFloat(t.base_price) } })

      for (const ti of ticket_items) {
        const dbType = typeMap[ti.ticket_type_id]
        if (!dbType.is_available) {
          await connection.rollback()
          return res.status(400).json({ error: `Ticket "${dbType.ticket_name}" is not available` })
        }
        if (!ti.visit_date) {
          await connection.rollback()
          return res.status(400).json({ error: 'visit_date is required for ticket items' })
        }
        const base = dbType.base_price
        const final = base
        const discount = 0
        const lineTotal = parseFloat((final * ti.quantity).toFixed(2))

        ticketTotal += lineTotal
        ticketCount += ti.quantity

        ticketPurchaseRows.push({
          ticket_type_id: ti.ticket_type_id,
          quantity: ti.quantity,
          base_price: base,
          discount_amount: discount,
          final_price: final,
          line_total: lineTotal,
          visit_date: ti.visit_date
        })
      }
    }

    // Calculate subtotal and grand total
    const totalItems = giftCount + ticketCount
    const subtotal = parseFloat((giftTotal + ticketTotal).toFixed(2))

    // Calculate tax on total
    const TAX_RATE = 0.0825
    const taxAmount = parseFloat((subtotal * TAX_RATE).toFixed(2))
    const grandTotal = parseFloat((subtotal + taxAmount).toFixed(2))

    console.log(`Combined checkout - Gift total: ${giftTotal}, Ticket total: ${ticketTotal}, Subtotal: ${subtotal}, Tax: ${taxAmount}, Grand Total: ${grandTotal}`)

    // Create Transaction
    const [tx] = await connection.query(
      `INSERT INTO Transactions (user_id, total_price, total_items, payment_method, transaction_status, employee_id)
       VALUES (?, ?, ?, ?, 'Completed', NULL)`,
      [user_id, grandTotal, totalItems, payment_method]
    )
    const transaction_id = tx.insertId

    // Attach transaction_id to prior inserted gift purchases (they used NULL)
    if (giftPurchaseRecords.length > 0) {
      // Update all purchases to set transaction_id
      const ids = giftPurchaseRecords.map(r => r.purchase_id)
      const placeholders = ids.map(() => '?').join(',')
      await connection.query(
        `UPDATE Gift_Shop_Purchase SET transaction_id = ? WHERE purchase_id IN (${placeholders})`,
        [transaction_id, ...ids]
      )
    }

    // Insert ticket purchases
    for (const row of ticketPurchaseRows) {
      // eslint-disable-next-line no-await-in-loop
      await connection.query(
        `INSERT INTO Ticket_Purchase
         (transaction_id, ticket_type_id, quantity, base_price, discount_amount, final_price, line_total, exhibition_id, event_id, visit_date, is_used)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, FALSE)`,
        [transaction_id, row.ticket_type_id, row.quantity, row.base_price, row.discount_amount, row.final_price, row.line_total, row.visit_date]
      )
    }

    await connection.commit()

    return res.status(201).json({
      success: true,
      message: 'Combined purchase completed successfully',
      transaction: {
        transaction_id,
        user_id,
        total_price: grandTotal,
        total_items: totalItems,
        payment_method,
        transaction_status: 'Completed'
      },
      discount: {
        applied: discountPercentage > 0,
        percentage: discountPercentage,
        membership_type: membershipType
      },
      customer_info: customer_info || null
    })

  } catch (error) {
    if (connection) {
      try { await connection.rollback() } catch {}
    }
    console.error('Combined checkout error:', error)
    return res.status(500).json({ error: 'Transaction failed', details: error.message })
  } finally {
    if (connection) connection.release()
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
    const annualFee = parseFloat(membershipBenefit.annual_fee)

    // Calculate tax
    const TAX_RATE = 0.0825
    const taxAmount = parseFloat((annualFee * TAX_RATE).toFixed(2))
    const totalPrice = parseFloat((annualFee + taxAmount).toFixed(2))

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

    // Step 5: Create membership purchase record (line_total does NOT include tax)
    await connection.query(
      `INSERT INTO Membership_Purchase
       (transaction_id, membership_id, line_total, is_renewal)
       VALUES (?, ?, ?, ?)`,
      [transactionId, membershipId, annualFee, isRenewal],
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

// POST /api/transactions/cafeteria-pos - Process cafeteria POS order
router.post('/cafeteria-pos', async (req, res) => {
  let connection;
  
  try {
    // Get connection from pool
    connection = await db.getConnection();
    
    const {
      customerEmail,
      paymentMethod,
      items, // Array of { cafeteria_item_id, quantity, unit_price }
    } = req.body;

    console.log('Cafeteria POS checkout request:', { customerEmail, paymentMethod, items });

    // Validation
    if (!paymentMethod || !items || items.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: paymentMethod and items' 
      });
    }

    // Validate payment method matches schema ENUM
    const validPaymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'Mobile Payment'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ 
        error: `Invalid payment_method. Must be one of: ${validPaymentMethods.join(', ')}` 
      });
    }

    // Start database transaction
    await connection.beginTransaction();

    // Step 1: Find or create user for walk-in customers
    let userId = 1; // Default guest user ID (make sure you have a guest user with ID 1)
    
    if (customerEmail && customerEmail !== 'walk-in@museum.org') {
      const [users] = await connection.query(
        'SELECT user_id FROM users WHERE email = ?',
        [customerEmail]
      );
      
      if (users.length > 0) {
        userId = users[0].user_id;
      } else {
        // Create a minimal user record for the customer
        const [userResult] = await connection.query(
          `INSERT INTO users (email, password, first_name, last_name, birthdate, sex)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [customerEmail, 'not-set', 'Walk-in', 'Customer', '1990-01-01', 'Prefer not to say']
        );
        userId = userResult.insertId;
      }
    }

    // Step 2: Validate all items exist and get their details
    const itemIds = items.map(item => item.cafeteria_item_id);
    const placeholders = itemIds.map(() => '?').join(',');
    const [dbItems] = await connection.query(
      `SELECT item_id, item_name, price, is_available 
       FROM Cafeteria_Items 
       WHERE item_id IN (${placeholders})`,
      itemIds
    );

    // Check if all items were found
    if (dbItems.length !== items.length) {
      await connection.rollback();
      return res.status(404).json({ 
        error: 'One or more items not found in database'
      });
    }

    // Create a map for easy lookup
    const itemMap = {};
    dbItems.forEach(item => {
      itemMap[item.item_id] = item;
    });

    // Step 3: Validate availability
    for (const cartItem of items) {
      const dbItem = itemMap[cartItem.cafeteria_item_id];
      
      if (!dbItem.is_available) {
        await connection.rollback();
        return res.status(400).json({ 
          error: `Item "${dbItem.item_name}" is not available` 
        });
      }
    }

    // Step 4: Calculate totals
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => {
      const dbItem = itemMap[item.cafeteria_item_id];
      return sum + (parseFloat(dbItem.price) * item.quantity);
    }, 0);

    // Calculate tax
    const TAX_RATE = 0.0825
    const taxAmount = parseFloat((subtotal * TAX_RATE).toFixed(2))
    const totalPrice = parseFloat((subtotal + taxAmount).toFixed(2))

    // Step 5: Get employee ID if this is an employee processing the order
    let employeeId = null;
    if (req.user && (req.user.role === 'employee' || req.user.role === 'admin')) {
      const [employees] = await connection.query(
        'SELECT employee_id FROM Employee WHERE user_id = ?',
        [req.user.id]
      );
      if (employees.length > 0) {
        employeeId = employees[0].employee_id;
      }
    }

    // Step 6: Insert Transaction record
    const [transactionResult] = await connection.query(
      `INSERT INTO Transactions 
       (user_id, total_price, total_items, payment_method, transaction_status, employee_id) 
       VALUES (?, ?, ?, ?, 'Completed', ?)`,
      [userId, totalPrice, totalItems, paymentMethod, employeeId]
    );

    const transactionId = transactionResult.insertId;
    console.log(`Transaction created with ID: ${transactionId}`);

    // Step 7: Insert Cafeteria_Purchase records
    const purchaseRecords = [];
    
    for (const cartItem of items) {
      const dbItem = itemMap[cartItem.cafeteria_item_id];
      const lineTotal = parseFloat((parseFloat(dbItem.price) * cartItem.quantity).toFixed(2));

      // Insert purchase record
      const [purchaseResult] = await connection.query(
        `INSERT INTO Cafeteria_Purchase 
         (transaction_id, cafeteria_item_id, item_name, quantity, unit_price, line_total) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          transactionId,
          cartItem.cafeteria_item_id,
          dbItem.item_name,
          cartItem.quantity,
          dbItem.price,
          lineTotal
        ]
      );

      purchaseRecords.push({
        purchase_id: purchaseResult.insertId,
        cafeteria_item_id: cartItem.cafeteria_item_id,
        item_name: dbItem.item_name,
        quantity: cartItem.quantity,
        unit_price: dbItem.price,
        line_total: lineTotal
      });
    }

    // Step 8: Commit transaction
    await connection.commit();
    console.log('Cafeteria POS transaction committed successfully');

    // Step 9: Return success response
    res.status(201).json({
      success: true,
      message: 'Cafeteria order processed successfully',
      transactionId: transactionId,
      transaction: {
        transaction_id: transactionId,
        user_id: userId,
        total_price: totalPrice,
        total_items: totalItems,
        payment_method: paymentMethod,
        transaction_status: 'Completed',
        employee_id: employeeId
      },
      purchases: purchaseRecords
    });

  } catch (error) {
    // Rollback on any error
    if (connection) {
      await connection.rollback();
      console.log('Database transaction rolled back due to error');
    }
    console.error('Cafeteria POS checkout error:', error);
    res.status(500).json({ 
      error: 'Transaction failed',
      details: error.message
    });
  } finally {
    // Release connection back to pool
    if (connection) {
      connection.release();
    }
  }
});

export default router