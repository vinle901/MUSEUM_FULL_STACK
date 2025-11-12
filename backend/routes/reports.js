// File: backend/routes/reports.js

import express from 'express';
import db from '../config/database.js';
import middleware from '../utils/middleware.js';
import bcrypt from 'bcrypt';
const router = express.Router();
const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const normalizeDate = (s) => {
  if (!s) return null;
  if (isISODate(s)) return s;
  const m = String(s).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [ , mm, dd, yyyy ] = m;
    return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
  }
  throw new Error(`Invalid date format: ${s} (use YYYY-MM-DD)`);
};
// All reports require appropriate role access
// Allow analysts to view reports in addition to employees and admins
router.use(middleware.requireRole('employee', 'admin', 'analyst'));

const clampDateRange = (startDate, endDate) => {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const safeEnd = !endDate || endDate > today ? today : endDate;
  let safeStart = startDate && startDate <= safeEnd ? startDate : null;
  if (!safeStart) {
    const endObj = new Date(safeEnd);
    const startObj = new Date(endObj);
    startObj.setDate(startObj.getDate() - 30);
    safeStart = new Date(startObj.getTime() - startObj.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }
  if (safeStart > safeEnd) safeStart = safeEnd;
  return { startDate: safeStart, endDate: safeEnd };
};


// ----------------------------- SALES ---------------------------------
// ==================== UNIFIED SALES ANALYSIS WITH SMART FILTERS ====================

router.get('/sales', async (req, res) => {
  try {
    const { 
      startDate: s, 
      endDate: e, 
      category,
      ticketType,
      giftShopCategory,
      cafeteriaCategory,
      dietaryFilter,
      topK = '5',
      paymentMethod
    } = req.query;
    
    const { startDate, endDate } = clampDateRange(s, e);
    const topItemsCount = parseInt(topK) || 5;

    let totalSales = 0;
    let transactionCount = 0;
    let averageOrderValue = 0;
    let categorySales = [];
    let dailySales = [];
    let topCategory = '';
    let topItems = [];
    let paymentMethodBreakdown = [];
    let categoryDetails = [];

    // === ALL CATEGORIES COMBINED ===
    if (!category || category === 'all') {
      // Total sales across all categories
      const [totalResult] = await db.query(`
        SELECT 
          COALESCE(SUM(tp.line_total), 0) + 
          COALESCE(SUM(gsp.line_total), 0) + 
          COALESCE(SUM(cp.line_total), 0) as totalSales,
          COUNT(DISTINCT t.transaction_id) as transactionCount
        FROM Transactions t
        LEFT JOIN Ticket_Purchase tp ON t.transaction_id = tp.transaction_id
        LEFT JOIN Gift_Shop_Purchase gsp ON t.transaction_id = gsp.transaction_id
        LEFT JOIN Cafeteria_Purchase cp ON t.transaction_id = cp.transaction_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
          AND t.transaction_status = 'Completed'
          AND (tp.purchase_id IS NOT NULL OR gsp.purchase_id IS NOT NULL OR cp.purchase_id IS NOT NULL)
          ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
      `, [startDate, endDate]);

      totalSales = Number(totalResult[0].totalSales);
      transactionCount = Number(totalResult[0].transactionCount);
      averageOrderValue = transactionCount > 0 ? totalSales / transactionCount : 0;

      // Category breakdown with actual counts
      const [categoryData] = await db.query(`
        SELECT 
          'Tickets' as category,
          COALESCE(SUM(tp.line_total), 0) as value,
          COUNT(DISTINCT tp.purchase_id) as items_sold
        FROM Ticket_Purchase tp
        JOIN Transactions t ON tp.transaction_id = t.transaction_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ? 
          AND t.transaction_status = 'Completed'
          ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
        UNION ALL
        SELECT 
          'Gift Shop' as category,
          COALESCE(SUM(gsp.line_total), 0) as value,
          COUNT(DISTINCT gsp.purchase_id) as items_sold
        FROM Gift_Shop_Purchase gsp
        JOIN Transactions t ON gsp.transaction_id = t.transaction_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ? 
          AND t.transaction_status = 'Completed'
          ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
        UNION ALL
        SELECT 
          'Cafeteria' as category,
          COALESCE(SUM(cp.line_total), 0) as value,
          COUNT(DISTINCT cp.purchase_id) as items_sold
        FROM Cafeteria_Purchase cp
        JOIN Transactions t ON cp.transaction_id = t.transaction_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ? 
          AND t.transaction_status = 'Completed'
          ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
      `, [startDate, endDate, startDate, endDate, startDate, endDate]);

      categorySales = categoryData.map(c => ({
        category: c.category,
        value: Number(c.value),
        itemsSold: Number(c.items_sold)
      })).filter(c => c.value > 0);

      topCategory = categorySales.length > 0 ? categorySales.reduce((max, c) => c.value > max.value ? c : max).category : '';

      // Top selling items from both Gift Shop and Cafeteria
      const [topGiftShop] = await db.query(`
        SELECT 
          gsp.item_name as name,
          gsi.category,
          SUM(gsp.quantity) as units_sold,
          SUM(gsp.line_total) as revenue,
          'Gift Shop' as source
        FROM Gift_Shop_Purchase gsp
        JOIN Transactions t ON gsp.transaction_id = t.transaction_id
        LEFT JOIN Gift_Shop_Items gsi ON gsp.gift_item_id = gsi.item_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
          AND t.transaction_status = 'Completed'
          ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
        GROUP BY gsp.item_name, gsi.category
        ORDER BY revenue DESC
        LIMIT ?
      `, [startDate, endDate, topItemsCount]);

      const [topCafeteria] = await db.query(`
        SELECT 
          cp.item_name as name,
          ci.category,
          SUM(cp.quantity) as units_sold,
          SUM(cp.line_total) as revenue,
          'Cafeteria' as source
        FROM Cafeteria_Purchase cp
        JOIN Transactions t ON cp.transaction_id = t.transaction_id
        LEFT JOIN Cafeteria_Items ci ON cp.cafeteria_item_id = ci.item_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
          AND t.transaction_status = 'Completed'
          ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
        GROUP BY cp.item_name, ci.category
        ORDER BY revenue DESC
        LIMIT ?
      `, [startDate, endDate, topItemsCount]);

      topItems = [...topGiftShop, ...topCafeteria]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, topItemsCount)
        .map(item => ({
          name: item.name,
          category: item.category || 'Unknown',
          unitsSold: Number(item.units_sold),
          revenue: Number(item.revenue),
          source: item.source
        }));

    }
    // === TICKETS ONLY ===
    else if (category === 'tickets') {
      const ticketFilter = ticketType && ticketType !== 'all' 
        ? `AND tt.ticket_name = ${db.escape(ticketType)}` 
        : '';

      // Total ticket sales with filter
      const [totalResult] = await db.query(`
        SELECT 
          COALESCE(SUM(tp.line_total), 0) as totalSales,
          COUNT(DISTINCT t.transaction_id) as transactionCount,
          COUNT(DISTINCT tp.purchase_id) as ticketsSold,
          SUM(tp.quantity) as totalVisitors
        FROM Ticket_Purchase tp
        JOIN Transactions t ON tp.transaction_id = t.transaction_id
        LEFT JOIN Ticket_Types tt ON tp.ticket_type_id = tt.ticket_type_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
          AND t.transaction_status = 'Completed'
          ${ticketFilter}
          ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
      `, [startDate, endDate]);

      totalSales = Number(totalResult[0].totalSales);
      transactionCount = Number(totalResult[0].transactionCount);
      averageOrderValue = transactionCount > 0 ? totalSales / transactionCount : 0;

      // If specific ticket type selected, show only that type
      if (ticketType && ticketType !== 'all') {
        categoryDetails = [{
          type: ticketType,
          revenue: totalSales,
          visitors: Number(totalResult[0].totalVisitors),
          transactions: transactionCount
        }];
      } else {
        // Breakdown by ticket types
        const [typeBreakdown] = await db.query(`
          SELECT 
            COALESCE(tt.ticket_name, 'Unknown') as type,
            SUM(tp.line_total) as revenue,
            SUM(tp.quantity) as visitors,
            COUNT(DISTINCT t.transaction_id) as transactions
          FROM Ticket_Purchase tp
          JOIN Transactions t ON tp.transaction_id = t.transaction_id
          LEFT JOIN Ticket_Types tt ON tp.ticket_type_id = tt.ticket_type_id
          WHERE DATE(t.transaction_date) BETWEEN ? AND ?
            AND t.transaction_status = 'Completed'
            ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
          GROUP BY tt.ticket_name
          ORDER BY revenue DESC
        `, [startDate, endDate]);

        categoryDetails = typeBreakdown.map(t => ({
          type: t.type,
          revenue: Number(t.revenue),
          visitors: Number(t.visitors),
          transactions: Number(t.transactions)
        }));
      }

    }
    // === GIFT SHOP ONLY ===
    else if (category === 'giftshop') {
      const categoryFilter = giftShopCategory && giftShopCategory !== 'all' 
        ? `AND gsi.category = ${db.escape(giftShopCategory)}` 
        : '';

      // Total gift shop sales
      const [totalResult] = await db.query(`
        SELECT 
          COALESCE(SUM(gsp.line_total), 0) as totalSales,
          COUNT(DISTINCT t.transaction_id) as transactionCount,
          SUM(gsp.quantity) as totalItems
        FROM Gift_Shop_Purchase gsp
        JOIN Transactions t ON gsp.transaction_id = t.transaction_id
        LEFT JOIN Gift_Shop_Items gsi ON gsp.gift_item_id = gsi.item_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
          AND t.transaction_status = 'Completed'
          ${categoryFilter}
          ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
      `, [startDate, endDate]);

      totalSales = Number(totalResult[0].totalSales);
      transactionCount = Number(totalResult[0].transactionCount);
      averageOrderValue = transactionCount > 0 ? totalSales / transactionCount : 0;

      // Top selling items in category
      const [topItemsData] = await db.query(`
        SELECT 
          gsp.item_name,
          COALESCE(gsi.category, 'Other') as category,
          SUM(gsp.quantity) as units_sold,
          SUM(gsp.line_total) as revenue,
          AVG(gsp.unit_price) as avg_price
        FROM Gift_Shop_Purchase gsp
        JOIN Transactions t ON gsp.transaction_id = t.transaction_id
        LEFT JOIN Gift_Shop_Items gsi ON gsp.gift_item_id = gsi.item_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
          AND t.transaction_status = 'Completed'
          ${categoryFilter}
          ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
        GROUP BY gsp.item_name, gsi.category
        ORDER BY revenue DESC
        LIMIT ?
      `, [startDate, endDate, topItemsCount]);

      topItems = topItemsData.map(item => ({
        name: item.item_name,
        category: item.category,
        unitsSold: Number(item.units_sold),
        revenue: Number(item.revenue),
        avgPrice: Number(item.avg_price)
      }));

      // Category breakdown if showing all categories
      if (!giftShopCategory || giftShopCategory === 'all') {
        const [catBreakdown] = await db.query(`
          SELECT 
            COALESCE(gsi.category, 'Other') as category,
            SUM(gsp.line_total) as revenue,
            SUM(gsp.quantity) as items_sold
          FROM Gift_Shop_Purchase gsp
          JOIN Transactions t ON gsp.transaction_id = t.transaction_id
          LEFT JOIN Gift_Shop_Items gsi ON gsp.gift_item_id = gsi.item_id
          WHERE DATE(t.transaction_date) BETWEEN ? AND ?
            AND t.transaction_status = 'Completed'
            ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
          GROUP BY gsi.category
          ORDER BY revenue DESC
        `, [startDate, endDate]);

        categoryDetails = catBreakdown.map(c => ({
          category: c.category,
          revenue: Number(c.revenue),
          itemsSold: Number(c.items_sold)
        }));
      }

    }
    // === CAFETERIA ONLY ===
    else if (category === 'cafeteria') {
      const categoryFilter = cafeteriaCategory && cafeteriaCategory !== 'all' 
        ? `AND ci.category = ${db.escape(cafeteriaCategory)}` 
        : '';
      
      let dietaryFilterSQL = '';
      if (dietaryFilter === 'vegetarian') dietaryFilterSQL = 'AND ci.is_vegetarian = TRUE';
      else if (dietaryFilter === 'vegan') dietaryFilterSQL = 'AND ci.is_vegan = TRUE';

      // Total cafeteria sales
      const [totalResult] = await db.query(`
        SELECT 
          COALESCE(SUM(cp.line_total), 0) as totalSales,
          COUNT(DISTINCT t.transaction_id) as transactionCount,
          SUM(cp.quantity) as totalItems
        FROM Cafeteria_Purchase cp
        JOIN Transactions t ON cp.transaction_id = t.transaction_id
        LEFT JOIN Cafeteria_Items ci ON cp.cafeteria_item_id = ci.item_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
          AND t.transaction_status = 'Completed'
          ${categoryFilter}
          ${dietaryFilterSQL}
          ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
      `, [startDate, endDate]);

      totalSales = Number(totalResult[0].totalSales);
      transactionCount = Number(totalResult[0].transactionCount);
      averageOrderValue = transactionCount > 0 ? totalSales / transactionCount : 0;

      // Top selling items
      const [topItemsData] = await db.query(`
        SELECT 
          cp.item_name,
          COALESCE(ci.category, 'Other') as category,
          SUM(cp.quantity) as units_sold,
          SUM(cp.line_total) as revenue,
          AVG(cp.unit_price) as avg_price,
          MAX(ci.is_vegetarian) as is_vegetarian,
          MAX(ci.is_vegan) as is_vegan
        FROM Cafeteria_Purchase cp
        JOIN Transactions t ON cp.transaction_id = t.transaction_id
        LEFT JOIN Cafeteria_Items ci ON cp.cafeteria_item_id = ci.item_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
          AND t.transaction_status = 'Completed'
          ${categoryFilter}
          ${dietaryFilterSQL}
          ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
        GROUP BY cp.item_name, ci.category
        ORDER BY revenue DESC
        LIMIT ?
      `, [startDate, endDate, topItemsCount]);

      topItems = topItemsData.map(item => ({
        name: item.item_name,
        category: item.category,
        unitsSold: Number(item.units_sold),
        revenue: Number(item.revenue),
        avgPrice: Number(item.avg_price),
        dietary: item.is_vegan ? 'Vegan' : item.is_vegetarian ? 'Vegetarian' : 'Regular'
      }));

      // Category breakdown if showing all categories
      if (!cafeteriaCategory || cafeteriaCategory === 'all') {
        const [catBreakdown] = await db.query(`
          SELECT 
            COALESCE(ci.category, 'Other') as category,
            SUM(cp.line_total) as revenue,
            SUM(cp.quantity) as items_sold
          FROM Cafeteria_Purchase cp
          JOIN Transactions t ON cp.transaction_id = t.transaction_id
          LEFT JOIN Cafeteria_Items ci ON cp.cafeteria_item_id = ci.item_id
          WHERE DATE(t.transaction_date) BETWEEN ? AND ?
            AND t.transaction_status = 'Completed'
            ${categoryFilter}
            ${dietaryFilterSQL}
            ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
          GROUP BY ci.category
          ORDER BY revenue DESC
        `, [startDate, endDate]);

        categoryDetails = catBreakdown.map(c => ({
          category: c.category,
          revenue: Number(c.revenue),
          itemsSold: Number(c.items_sold)
        }));
      }
    }

    // Daily sales trend - applies to all categories
    const dailyQuery = `
      SELECT 
        DATE(t.transaction_date) as date,
        ${category === 'tickets' ? 'SUM(tp.line_total)' : 
          category === 'giftshop' ? 'SUM(gsp.line_total)' : 
          category === 'cafeteria' ? 'SUM(cp.line_total)' :
          'COALESCE(SUM(tp.line_total), 0) + COALESCE(SUM(gsp.line_total), 0) + COALESCE(SUM(cp.line_total), 0)'} as sales
      FROM Transactions t
      ${category === 'tickets' ? 
        `JOIN Ticket_Purchase tp ON t.transaction_id = tp.transaction_id
         LEFT JOIN Ticket_Types tt ON tp.ticket_type_id = tt.ticket_type_id` :
        category === 'giftshop' ? 
        `JOIN Gift_Shop_Purchase gsp ON t.transaction_id = gsp.transaction_id
         LEFT JOIN Gift_Shop_Items gsi ON gsp.gift_item_id = gsi.item_id` :
        category === 'cafeteria' ?
        `JOIN Cafeteria_Purchase cp ON t.transaction_id = cp.transaction_id
         LEFT JOIN Cafeteria_Items ci ON cp.cafeteria_item_id = ci.item_id` :
        `LEFT JOIN Ticket_Purchase tp ON t.transaction_id = tp.transaction_id
         LEFT JOIN Gift_Shop_Purchase gsp ON t.transaction_id = gsp.transaction_id
         LEFT JOIN Cafeteria_Purchase cp ON t.transaction_id = cp.transaction_id`}
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        ${category === 'tickets' && ticketType && ticketType !== 'all' ? `AND tt.ticket_name = ${db.escape(ticketType)}` : ''}
        ${category === 'giftshop' && giftShopCategory && giftShopCategory !== 'all' ? `AND gsi.category = ${db.escape(giftShopCategory)}` : ''}
        ${category === 'cafeteria' && cafeteriaCategory && cafeteriaCategory !== 'all' ? `AND ci.category = ${db.escape(cafeteriaCategory)}` : ''}
        ${category === 'cafeteria' && dietaryFilter === 'vegetarian' ? 'AND ci.is_vegetarian = TRUE' : ''}
        ${category === 'cafeteria' && dietaryFilter === 'vegan' ? 'AND ci.is_vegan = TRUE' : ''}
        ${paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : ''}
        ${!category || category === 'all' ? 'AND (tp.purchase_id IS NOT NULL OR gsp.purchase_id IS NOT NULL OR cp.purchase_id IS NOT NULL)' : ''}
      GROUP BY DATE(t.transaction_date)
      ORDER BY date
    `;

    const [daily] = await db.query(dailyQuery, [startDate, endDate]);
    dailySales = daily.map(d => ({
      date: d.date,
      sales: Number(d.sales).toFixed(2)
    }));

    // Payment method breakdown - for all categories
    const [paymentBreakdown] = await db.query(`
      SELECT 
        t.payment_method,
        COUNT(DISTINCT t.transaction_id) as count,
        ${category === 'tickets' ? 'SUM(tp.line_total)' : 
          category === 'giftshop' ? 'SUM(gsp.line_total)' : 
          category === 'cafeteria' ? 'SUM(cp.line_total)' :
          'COALESCE(SUM(tp.line_total), 0) + COALESCE(SUM(gsp.line_total), 0) + COALESCE(SUM(cp.line_total), 0)'} as total
      FROM Transactions t
      ${category === 'tickets' ? 
        `JOIN Ticket_Purchase tp ON t.transaction_id = tp.transaction_id
         LEFT JOIN Ticket_Types tt ON tp.ticket_type_id = tt.ticket_type_id` :
        category === 'giftshop' ? 
        `JOIN Gift_Shop_Purchase gsp ON t.transaction_id = gsp.transaction_id
         LEFT JOIN Gift_Shop_Items gsi ON gsp.gift_item_id = gsi.item_id` :
        category === 'cafeteria' ?
        `JOIN Cafeteria_Purchase cp ON t.transaction_id = cp.transaction_id
         LEFT JOIN Cafeteria_Items ci ON cp.cafeteria_item_id = ci.item_id` :
        `LEFT JOIN Ticket_Purchase tp ON t.transaction_id = tp.transaction_id
         LEFT JOIN Gift_Shop_Purchase gsp ON t.transaction_id = gsp.transaction_id
         LEFT JOIN Cafeteria_Purchase cp ON t.transaction_id = cp.transaction_id`}
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        ${category === 'tickets' && ticketType && ticketType !== 'all' ? `AND tt.ticket_name = ${db.escape(ticketType)}` : ''}
        ${category === 'giftshop' && giftShopCategory && giftShopCategory !== 'all' ? `AND gsi.category = ${db.escape(giftShopCategory)}` : ''}
        ${category === 'cafeteria' && cafeteriaCategory && cafeteriaCategory !== 'all' ? `AND ci.category = ${db.escape(cafeteriaCategory)}` : ''}
        ${category === 'cafeteria' && dietaryFilter === 'vegetarian' ? 'AND ci.is_vegetarian = TRUE' : ''}
        ${category === 'cafeteria' && dietaryFilter === 'vegan' ? 'AND ci.is_vegan = TRUE' : ''}
        ${!category || category === 'all' ? 'AND (tp.purchase_id IS NOT NULL OR gsp.purchase_id IS NOT NULL OR cp.purchase_id IS NOT NULL)' : ''}
      GROUP BY t.payment_method
      ORDER BY total DESC
    `, [startDate, endDate]);

    paymentMethodBreakdown = paymentBreakdown.map(p => ({
      method: p.payment_method,
      count: Number(p.count),
      total: Number(p.total)
    }));

    res.json({
      totalSales,
      transactionCount,
      averageOrderValue,
      categorySales,
      dailySales,
      topCategory,
      topItems,
      paymentMethodBreakdown,
      categoryDetails
    });

  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Raw data endpoint for Sales Analysis
router.get('/sales/raw-data', async (req, res) => {
  try {
    const { startDate, endDate, category, ticketType, giftShopCategory, cafeteriaCategory, paymentMethod } = req.query;

    let query = '';
    let params = [startDate, endDate];

    if (category === 'tickets') {
      const ticketFilter = ticketType && ticketType !== 'all' ? `AND tt.ticket_name = ${db.escape(ticketType)}` : '';
      const paymentFilter = paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : '';
      
      query = `
        SELECT 
          t.transaction_id,
          t.transaction_date,
          COALESCE(tt.ticket_name, 'Unknown') as item_type,
          'Tickets' as category,
          tp.quantity,
          tp.final_price as unit_price,
          tp.line_total,
          t.payment_method,
          t.transaction_status as status
        FROM Ticket_Purchase tp
        JOIN Transactions t ON tp.transaction_id = t.transaction_id
        LEFT JOIN Ticket_Types tt ON tp.ticket_type_id = tt.ticket_type_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
          AND t.transaction_status = 'Completed'
          ${ticketFilter}
          ${paymentFilter}
        ORDER BY t.transaction_date DESC
      `;
    } else if (category === 'giftshop') {
      const catFilter = giftShopCategory && giftShopCategory !== 'all' ? `AND gsi.category = ${db.escape(giftShopCategory)}` : '';
      const paymentFilter = paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : '';
      
      query = `
        SELECT 
          t.transaction_id,
          t.transaction_date,
          gsp.item_name as item_type,
          COALESCE(gsi.category, 'Other') as category,
          gsp.quantity,
          gsp.unit_price,
          gsp.line_total,
          t.payment_method,
          t.transaction_status as status
        FROM Gift_Shop_Purchase gsp
        JOIN Transactions t ON gsp.transaction_id = t.transaction_id
        LEFT JOIN Gift_Shop_Items gsi ON gsp.gift_item_id = gsi.item_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
          AND t.transaction_status = 'Completed'
          ${catFilter}
          ${paymentFilter}
        ORDER BY t.transaction_date DESC
      `;
    } else if (category === 'cafeteria') {
      const catFilter = cafeteriaCategory && cafeteriaCategory !== 'all' ? `AND ci.category = ${db.escape(cafeteriaCategory)}` : '';
      const paymentFilter = paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : '';
      
      query = `
        SELECT 
          t.transaction_id,
          t.transaction_date,
          cp.item_name as item_type,
          COALESCE(ci.category, 'Other') as category,
          cp.quantity,
          cp.unit_price,
          cp.line_total,
          t.payment_method,
          t.transaction_status as status
        FROM Cafeteria_Purchase cp
        JOIN Transactions t ON cp.transaction_id = t.transaction_id
        LEFT JOIN Cafeteria_Items ci ON cp.cafeteria_item_id = ci.item_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
          AND t.transaction_status = 'Completed'
          ${catFilter}
          ${paymentFilter}
        ORDER BY t.transaction_date DESC
      `;
    } else {
      const paymentFilter = paymentMethod && paymentMethod !== 'all' ? `AND t.payment_method = ${db.escape(paymentMethod)}` : '';
      
      query = `
        SELECT 
          t.transaction_id,
          t.transaction_date,
          COALESCE(tt.ticket_name, gsp.item_name, cp.item_name) as item_type,
          CASE 
            WHEN tp.purchase_id IS NOT NULL THEN 'Tickets'
            WHEN gsp.purchase_id IS NOT NULL THEN 'Gift Shop'
            WHEN cp.purchase_id IS NOT NULL THEN 'Cafeteria'
            ELSE 'Unknown'
          END as category,
          COALESCE(tp.quantity, gsp.quantity, cp.quantity, 0) as quantity,
          COALESCE(tp.final_price, gsp.unit_price, cp.unit_price, 0) as unit_price,
          COALESCE(tp.line_total, gsp.line_total, cp.line_total, 0) as line_total,
          t.payment_method,
          t.transaction_status as status
        FROM Transactions t
        LEFT JOIN Ticket_Purchase tp ON t.transaction_id = tp.transaction_id
        LEFT JOIN Gift_Shop_Purchase gsp ON t.transaction_id = gsp.transaction_id
        LEFT JOIN Cafeteria_Purchase cp ON t.transaction_id = cp.transaction_id
        LEFT JOIN Ticket_Types tt ON tp.ticket_type_id = tt.ticket_type_id
        WHERE DATE(t.transaction_date) BETWEEN ? AND ?
          AND t.transaction_status = 'Completed'
          AND (tp.purchase_id IS NOT NULL OR gsp.purchase_id IS NOT NULL OR cp.purchase_id IS NOT NULL)
          ${paymentFilter}
        ORDER BY t.transaction_date DESC
      `;
    }

    const [rows] = await db.query(query, params);
    res.json({ data: rows });

  } catch (error) {
    console.error('Sales raw data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== VISITOR ATTENDANCE ====================

router.get('/attendance', async (req, res) => {
  try {
    const { startDate: s, endDate: e, ticketType } = req.query;
    const { startDate, endDate } = clampDateRange(s, e);

    const ticketTypeFilter = (!ticketType || ticketType === 'all') 
      ? '' 
      : `AND tt.ticket_name = ${db.escape(ticketType)}`;

    // Total visitors
    const [totalResult] = await db.query(`
      SELECT 
        SUM(tp.quantity) as totalVisitors,
        COUNT(DISTINCT t.transaction_id) as totalTransactions
      FROM Ticket_Purchase tp
      JOIN Transactions t ON tp.transaction_id = t.transaction_id
      LEFT JOIN Ticket_Types tt ON tp.ticket_type_id = tt.ticket_type_id
      WHERE tp.visit_date BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        ${ticketTypeFilter}
    `, [startDate, endDate]);

    const totalVisitors = Number(totalResult[0].totalVisitors || 0);
    const totalTransactions = Number(totalResult[0].totalTransactions || 0);

    // Calculate date range for average
    const daysDiff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    const averageDailyVisitors = daysDiff > 0 ? totalVisitors / daysDiff : 0;
    const averageGroupSize = totalTransactions > 0 ? totalVisitors / totalTransactions : 0;

    // Daily attendance
    const [daily] = await db.query(`
      SELECT 
        DATE(tp.visit_date) as date,
        SUM(tp.quantity) as visitors,
        COUNT(DISTINCT t.transaction_id) as transactions
      FROM Ticket_Purchase tp
      JOIN Transactions t ON tp.transaction_id = t.transaction_id
      LEFT JOIN Ticket_Types tt ON tp.ticket_type_id = tt.ticket_type_id
      WHERE tp.visit_date BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        ${ticketTypeFilter}
      GROUP BY DATE(tp.visit_date)
      ORDER BY date
    `, [startDate, endDate]);

    const dailyAttendance = daily.map(d => ({
      date: d.date,
      visitors: Number(d.visitors),
      transactions: Number(d.transactions)
    }));

    // Ticket type breakdown
    let ticketTypeBreakdown = [];
    if (!ticketType || ticketType === 'all') {
      const [breakdown] = await db.query(`
        SELECT 
          COALESCE(tt.ticket_name, 'Unknown') as type,
          SUM(tp.quantity) as visitors,
          SUM(tp.line_total) as revenue
        FROM Ticket_Purchase tp
        JOIN Transactions t ON tp.transaction_id = t.transaction_id
        LEFT JOIN Ticket_Types tt ON tp.ticket_type_id = tt.ticket_type_id
        WHERE tp.visit_date BETWEEN ? AND ?
          AND t.transaction_status = 'Completed'
        GROUP BY tt.ticket_name
        ORDER BY visitors DESC
      `, [startDate, endDate]);

      ticketTypeBreakdown = breakdown.map(b => ({
        type: b.type,
        visitors: Number(b.visitors),
        revenue: Number(b.revenue)
      }));
    }

    res.json({
      totalVisitors,
      averageDailyVisitors,
      averageGroupSize,
      dailyAttendance,
      ticketTypeBreakdown
    });

  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/attendance/raw-data', async (req, res) => {
  try {
    const { startDate, endDate, ticketType } = req.query;
    
    const ticketTypeFilter = (!ticketType || ticketType === 'all') 
      ? '' 
      : `AND tt.ticket_name = ${db.escape(ticketType)}`;

    const query = `
      SELECT 
        tp.purchase_id,
        t.transaction_id,
        t.transaction_date as purchase_date,
        tp.visit_date,
        COALESCE(tt.ticket_name, 'Unknown') as ticket_type,
        tp.quantity as visitors,
        tp.base_price,
        tp.discount_amount,
        tp.final_price,
        tp.line_total,
        tp.is_used,
        CONCAT(u.first_name, ' ', u.last_name) as customer_name,
        u.email as customer_email
      FROM Ticket_Purchase tp
      JOIN Transactions t ON tp.transaction_id = t.transaction_id
      JOIN users u ON t.user_id = u.user_id
      LEFT JOIN Ticket_Types tt ON tp.ticket_type_id = tt.ticket_type_id
      WHERE tp.visit_date BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        ${ticketTypeFilter}
      ORDER BY tp.visit_date DESC, tp.purchase_id
    `;
    
    const [rows] = await db.query(query, [startDate, endDate]);
    res.json({ data: rows });
    
  } catch (error) {
    console.error('Attendance raw data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== MEMBERSHIP ANALYTICS (FIXED) ====================

router.get('/membership', async (req, res) => {
  try {
    const { startDate: s, endDate: e, membershipType } = req.query;
    const { startDate, endDate } = clampDateRange(s, e);

    const membershipTypeFilter = (!membershipType || membershipType === 'all') 
      ? '' 
      : `AND m.membership_type = ${db.escape(membershipType)}`;

    // New members in period
    const [newMembersResult] = await db.query(`
      SELECT COUNT(*) as newMembers
      FROM Membership m
      JOIN Membership_Purchase mp ON m.membership_id = mp.membership_id
      JOIN Transactions t ON mp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        AND mp.is_renewal = FALSE
        ${membershipTypeFilter}
    `, [startDate, endDate]);

    const newMembers = Number(newMembersResult[0].newMembers);

    // Total active members (current, respecting filter)
    const [totalMembersResult] = await db.query(`
      SELECT COUNT(*) as totalMembers
      FROM Membership m
      WHERE m.is_active = TRUE
        AND m.expiration_date >= CURDATE()
        ${membershipTypeFilter}
    `);

    //const totalMembers = Number(totalMembersResult[0].totalMembers);

    // Renewals in period
    const [renewalsResult] = await db.query(`
      SELECT COUNT(*) as renewals
      FROM Membership m
      JOIN Membership_Purchase mp ON m.membership_id = mp.membership_id
      JOIN Transactions t ON mp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        AND mp.is_renewal = TRUE
        ${membershipTypeFilter}
    `, [startDate, endDate]);

    const renewals = Number(renewalsResult[0].renewals);

    // Renewal rate
    //const renewalRate = newMembers + renewals > 0 
      //? ((renewals / (newMembers + renewals)) * 100).toFixed(1) 
      //: '0.0';

    // Member retention (current active members)
    const memberRetention = totalMembers;

    // Membership type distribution - FIXED: proper filtering
    let membershipTypesDistribution = [];
    
    if (!membershipType || membershipType === 'all') {
      // Show all types when no filter
      const [typeDistribution] = await db.query(`
        SELECT 
          b.membership_type as type,
          b.annual_fee as fee,
          COUNT(m.membership_id) as count
        FROM Benefits b
        LEFT JOIN Membership m ON b.membership_type = m.membership_type 
          AND m.is_active = TRUE 
          AND m.expiration_date >= CURDATE()
        GROUP BY b.membership_type, b.annual_fee
        ORDER BY b.annual_fee DESC
      `);

      membershipTypesDistribution = typeDistribution.map(t => ({
        type: t.type,
        count: Number(t.count || 0),
        fee: Number(t.fee)
      }));
    } else {
      // Show only selected type when filtered
      const [typeDistribution] = await db.query(`
        SELECT 
          b.membership_type as type,
          b.annual_fee as fee,
          COUNT(m.membership_id) as count
        FROM Benefits b
        LEFT JOIN Membership m ON b.membership_type = m.membership_type 
          AND m.is_active = TRUE 
          AND m.expiration_date >= CURDATE()
        WHERE b.membership_type = ?
        GROUP BY b.membership_type, b.annual_fee
      `, [membershipType]);

      membershipTypesDistribution = typeDistribution.map(t => ({
        type: t.type,
        count: Number(t.count || 0),
        fee: Number(t.fee)
      }));
    }

    // New memberships over time
    const [dailySignups] = await db.query(`
      SELECT 
        DATE(t.transaction_date) as date,
        COUNT(CASE WHEN mp.is_renewal = FALSE THEN 1 END) as new_signups,
        COUNT(CASE WHEN mp.is_renewal = TRUE THEN 1 END) as renewals
      FROM Membership m
      JOIN Membership_Purchase mp ON m.membership_id = mp.membership_id
      WHERE m.start_date >= DATE_SUB(?, INTERVAL 6 MONTH)
        AND m.start_date <= ?
      GROUP BY DATE_FORMAT(m.start_date, '%Y-%m')
      ORDER BY DATE_FORMAT(m.start_date, '%Y-%m')
      LIMIT 6
    `, [endDate, endDate]);

    const totalMembers = totalMembersResult[0].totalMembers || 0;
    const renewalRate = renewalRateResult[0].total > 0 
      ? (renewalRateResult[0].renewals / renewalRateResult[0].total * 100).toFixed(1)
      : 0;

    res.json({
      totalMembers: totalMembers,
      newMembersThisMonth: newMembersResult[0].newMembers || 0,
      renewalRate: parseFloat(renewalRate),
      membershipTypes: membershipTypes.map(m => ({
        type: m.type,
        count: m.count,
        percentage: totalMembers > 0 ? ((m.count / totalMembers) * 100).toFixed(0) : 0
      })),
      monthlyGrowth: monthlyGrowth.map(m => ({
        month: m.month,
        new: m.new,
        renewals: m.renewals
      }))
    });
  } catch (error) {
    console.error('Membership report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --------------------- MEMBERSHIP SIGN-UPS (DETAIL) ------------------

// GET /api/reports/membership-signups?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// --------------------- MEMBERSHIP SIGN-UPS (DETAIL) ------------------
router.get('/membership-signups', async (req, res) => {
  try {
    // 1) Dates: accept empty, normalize, and default last 30 days
    const rawS = (req.query.startDate ?? '').trim();
    const rawE = (req.query.endDate ?? '').trim();

    const sNorm = rawS ? normalizeDate(rawS) : null;
    const eNorm = rawE ? normalizeDate(rawE) : null;

    // ❗ Use normalized vars (NOT s/e)
    const { startDate, endDate } = clampDateRange(sNorm, eNorm);

    // 2) Detect the actual users table and optional columns at runtime
    //    This avoids case/pluralization and “unknown column” crashes.
    const [[usersTableRow] = []] = await db.query(
      `
      SELECT TABLE_NAME AS name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('users','Users','User')
      LIMIT 1
      `
    );

    if (!usersTableRow?.name) {
      return res.status(500).json({ error: "Could not find a users table (users/Users/User)." });
    }
    const usersTableName = String(usersTableRow.name).replace(/`/g, '');
    const USERS_TABLE = `\`${usersTableName}\``;

    const [optCols] = await db.query(
      `
      SELECT COLUMN_NAME AS name
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${usersTableName}'
        AND COLUMN_NAME IN ('phone_number','subscribe_to_newsletter')
      `,
    );
    const hasPhone = optCols.some(c => c.name === 'phone_number');
    const hasNews  = optCols.some(c => c.name === 'subscribe_to_newsletter');

    // Build SELECT list safely
    const userCols = [
      "u.`user_id`",
      "u.`first_name`",
      "u.`last_name`",
      "u.`email`",
      hasPhone ? "u.`phone_number`" : "NULL AS `phone_number`",
      hasNews  ? "u.`subscribe_to_newsletter`" : "0 AS `subscribe_to_newsletter`",
    ].join(",\n        ");

    // 3) Detail rows
    const [rows] = await db.query(
      `
      SELECT
        ${userCols},
        m.\`membership_id\`,
        m.\`membership_type\`,
        m.\`is_active\`,
        m.\`expiration_date\`,
        COALESCE(mp.\`line_total\`, 0) AS line_total,
        t.\`transaction_date\`         AS purchased_at
      FROM \`Membership\` m
      JOIN ${USERS_TABLE} u           ON u.\`user_id\`        = m.\`user_id\`
      JOIN \`Membership_Purchase\` mp ON mp.\`membership_id\` = m.\`membership_id\`
      JOIN \`Transactions\` t         ON t.\`transaction_id\` = mp.\`transaction_id\`
      WHERE DATE(t.\`transaction_date\`) >= ?
        AND DATE(t.\`transaction_date\`) <= ?
        AND t.\`transaction_status\` = 'Completed'
      ORDER BY t.\`transaction_date\` ASC, m.\`membership_id\` ASC
      `,
      [startDate, endDate]
    );

    // 4) Summary
    const [summary] = await db.query(
      `
      SELECT
        COUNT(*)                            AS signupCount,
        SUM(COALESCE(mp.\`line_total\`, 0)) AS totalAmount
      FROM \`Membership\` m
      JOIN \`Membership_Purchase\` mp ON mp.\`membership_id\` = m.\`membership_id\`
      JOIN \`Transactions\` t         ON t.\`transaction_id\` = mp.\`transaction_id\`
      WHERE DATE(t.\`transaction_date\`) >= ?
        AND DATE(t.\`transaction_date\`) <= ?
        AND t.\`transaction_status\` = 'Completed'
      `,
      [startDate, endDate]
    );

    // 5) Response
    res.json({
      window: { startDate, endDate },
      summary: {
        signupCount: Number(summary[0]?.signupCount || 0),
        totalAmount: Number(summary[0]?.totalAmount || 0),
      },
      rows: rows.map(r => ({
        user_id: r.user_id,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        phone_number: r.phone_number ?? null,
        subscribe_to_newsletter: !!r.subscribe_to_newsletter,
        membership_id: r.membership_id,
        membership_type: r.membership_type,
        expiration_date: r.expiration_date,
        is_active: !!r.is_active,
        line_total: Number(r.line_total || 0),
        purchased_at: r.purchased_at,
      })),
    });
  } catch (error) {
    console.error('Membership sign-ups report error:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
    });
    res.status(500).json({ error: error.message });
  }
});
// backend/routes/reports.js
// backend/routes/reports.js
router.post('/membership-signups/member', async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone_number,
    subscribe_to_newsletter,
    membership_type,
    start_date,
    expiration_date,
    birthdate,
    sex,
    temp_password,               // <-- frontend is already sending this
  } = req.body;

  if (!temp_password) {
    return res.status(400).json({ error: 'temp_password is required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[usersTableRow] = []] = await conn.query(`
      SELECT TABLE_NAME AS name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('users','Users','User')
      LIMIT 1
    `);
    if (!usersTableRow?.name) {
      throw new Error('Could not find a users table (users/Users/User).');
    }
    const usersTableName = String(usersTableRow.name).replace(/`/g, '');
    const USERS_TABLE = `\`${usersTableName}\``;

    // find which password-ish columns exist
    const [cols] = await conn.query(
      `
      SELECT COLUMN_NAME AS name
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${usersTableName}'
        AND COLUMN_NAME IN ('password','password_hash','require_password_change')
      `
    );
    const hasPasswordCol = cols.some(c => c.name === 'password');
    const hasHashCol     = cols.some(c => c.name === 'password_hash');
    const hasRequireFlag = cols.some(c => c.name === 'require_password_change');
    const normalizeSex = (v) => {
      if (v == null) return undefined;
      const s = String(v).trim().toUpperCase();
      if (s === 'M' || s === 'F') return s; // add 'O' if your enum has it
      return undefined;
    };

    const providedSex = normalizeSex(sex);
    const insertSex = providedSex ?? 'M';
    // hash the temp password once
    const pwHash = await bcrypt.hash(String(temp_password), 10);

    // build INSERT ... ON DUPLICATE KEY UPDATE dynamically
    const fields = [
      'first_name','last_name','email',
      'phone_number','subscribe_to_newsletter','birthdate','sex'
    ];
    const placeholders = ['?','?','?','?','?','?','?'];
    const values = [
      first_name,
      last_name,
      email,
      phone_number || null,
      !!subscribe_to_newsletter,
      birthdate || null,
      insertSex,
    ];

    if (hasPasswordCol) {
      fields.push('password');
      placeholders.push('?');
      values.push(pwHash);
    } else if (hasHashCol) {
      fields.push('password_hash');
      placeholders.push('?');
      values.push(pwHash);
    }

    if (hasRequireFlag) {
      fields.push('require_password_change');
      placeholders.push('?');
      values.push(1);
    }

    const updates = [
      'first_name = VALUES(first_name)',
      'last_name = VALUES(last_name)',
      'phone_number = VALUES(phone_number)',
      'subscribe_to_newsletter = VALUES(subscribe_to_newsletter)',
      'birthdate = VALUES(birthdate)',
      'sex = VALUES(sex)',
    ];
    if (hasPasswordCol) updates.push('password = VALUES(password)');
    if (hasHashCol)     updates.push('password_hash = VALUES(password_hash)');
    if (hasRequireFlag) updates.push('require_password_change = VALUES(require_password_change)');

    const sql = `
      INSERT INTO  ${USERS_TABLE} (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON DUPLICATE KEY UPDATE ${updates.join(', ')}
    `;
    const [userRows] = await conn.query(sql, values);
    
    // resolve user_id
    let user_id = userRows.insertId;
    if (!user_id) {
      const [[u]] = await conn.query(`SELECT user_id FROM ${USERS_TABLE} WHERE email = ? LIMIT 1`, [email]);
      user_id = u?.user_id;
    }
    if (!user_id) throw new Error('Could not resolve user_id for email: ' + email);

    // NOTE: use your actual table case; elsewhere you use "Membership"
    const [mRows] = await conn.query(
      `INSERT INTO Membership (user_id, membership_type, start_date, expiration_date, is_active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [user_id, membership_type, start_date, expiration_date]
    );
    
    await conn.commit();
    res.json({ ok: true, user_id, membership_id: mRows.insertId });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(400).json({ error: e.message || 'Failed to create member' });
  } finally {
    conn.release();
  }
});
// ------ MEMBERSHIP CHECKOUT (creates Transaction + Membership_Purchase) ------
router.post('/membership-signups/checkout', async (req, res) => {
  const { users, membership, payment } = req.body;

  try {
    // --------- VALIDATE INPUT ----------
    if (!users || !users.email) {
      return res.status(400).json({ error: 'User email is required' });
    }
    const mType = membership?.membership_type;
    if (!mType) {
      return res.status(400).json({ error: 'membership_type is required' });
    }
    const qty = Math.max(1, Number(membership?.quantity || 1));
    const start_date = membership?.start_date || null;
    const expiration_date = membership?.expiration_date || null;

    // --------- PRICE ----------
    const PLAN_PRICES = { Individual: 70, Dual: 95, Family: 115, Patron: 200 };
    const unit = PLAN_PRICES[mType] || 0;
    const expectedTotal = unit * qty;

    if (payment?.amount != null && Number(payment.amount) !== expectedTotal) {
      return res.status(400).json({ error: `Amount mismatch. Expected ${expectedTotal}, got ${payment.amount}` });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // --------- PASSWORD COLUMNS IN users ----------
      const [cols] = await conn.query(`
        SELECT COLUMN_NAME AS name
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME IN ('password','password_hash','require_password_change')
      `);
      const hasPasswordCol = cols.some(c => c.name === 'password');
      const hasHashCol     = cols.some(c => c.name === 'password_hash');
      const hasRequireFlag = cols.some(c => c.name === 'require_password_change');

      const rawTemp = users.temp_password || Math.random().toString(36).slice(2, 10);
      const pwHash = await bcrypt.hash(String(rawTemp), 10);

      // --------- UPSERT USER ----------
      const uFields = ['first_name','last_name','email','phone_number','subscribe_to_newsletter','birthdate','sex'];
      const uPH     = ['?','?','?','?','?','?','?'];
      const uVals   = [
        users.first_name || '',
        users.last_name  || '',
        String(users.email).toLowerCase(),
        users.phone_number || null,
        !!users.subscribe_to_newsletter,
        users.birthdate || null,
        users.sex || null,
      ];
      if (hasPasswordCol) { uFields.push('password'); uPH.push('?'); uVals.push(pwHash); }
      if (hasHashCol)     { uFields.push('password_hash'); uPH.push('?'); uVals.push(pwHash); }
      if (hasRequireFlag) { uFields.push('require_password_change'); uPH.push('?'); uVals.push(1); }

      const uSql = `
        INSERT INTO users (${uFields.join(', ')})
        VALUES (${uPH.join(', ')})
        ON DUPLICATE KEY UPDATE
          first_name = VALUES(first_name),
          last_name  = VALUES(last_name),
          phone_number = VALUES(phone_number),
          subscribe_to_newsletter = VALUES(subscribe_to_newsletter),
          birthdate = VALUES(birthdate),
          sex = VALUES(sex)
          ${hasPasswordCol ? ', password = VALUES(password)' : ''}
          ${hasHashCol ? ', password_hash = VALUES(password_hash)' : ''}
          ${hasRequireFlag ? ', require_password_change = VALUES(require_password_change)' : ''}
      `;
      const [userRows] = await conn.query(uSql, uVals);

      let user_id = userRows.insertId;
      if (!user_id) {
        const [[u]] = await conn.query(`SELECT user_id FROM users WHERE email = ? LIMIT 1`, [String(users.email).toLowerCase()]);
        user_id = u?.user_id;
      }
      if (!user_id) throw new Error('Could not resolve user_id');

      // --------- DETECT OPTIONAL COLUMNS ON RELATED TABLES ----------
      const [txCols] = await conn.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Transactions'
          AND COLUMN_NAME IN ('user_id','customer_id')
      `);
      const hasTxUserId = txCols.some(c => c.COLUMN_NAME === 'user_id');
      const hasTxCustomerId = txCols.some(c => c.COLUMN_NAME === 'customer_id');

      const [mpCols] = await conn.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Membership_Purchase'
          AND COLUMN_NAME IN ('user_id')
      `);
      const hasMpUserId = mpCols.some(c => c.COLUMN_NAME === 'user_id');

      // --------- CREATE TRANSACTION (include user ref only if column exists) ----------
      let txSql, txParams;
      if (hasTxUserId) {
        txSql = `
          INSERT INTO Transactions (user_id, transaction_date, total_price, transaction_status)
          VALUES (?, NOW(), ?, 'Completed')
        `;
        txParams = [user_id, expectedTotal];
      } else if (hasTxCustomerId) {
        txSql = `
          INSERT INTO Transactions (customer_id, transaction_date, total_price, transaction_status)
          VALUES (?, NOW(), ?, 'Completed')
        `;
        txParams = [user_id, expectedTotal]; // reuse user_id as customer_id
      } else {
        txSql = `
          INSERT INTO Transactions (transaction_date, total_price, transaction_status)
          VALUES (NOW(), ?, 'Completed')
        `;
        txParams = [expectedTotal];
      }
      const [txRows] = await conn.query(txSql, txParams);
      const transaction_id = txRows.insertId;

      // --------- CREATE MEMBERSHIPS + PURCHASE LINES ----------
      const membership_ids = [];
      for (let i = 0; i < qty; i++) {
        const [mRows] = await conn.query(
          `INSERT INTO Membership (user_id, membership_type, start_date, expiration_date, is_active)
           VALUES (?, ?, ?, ?, TRUE)`,
          [user_id, mType, start_date, expiration_date]
        );
        const membership_id = mRows.insertId;
        membership_ids.push(membership_id);

        if (hasMpUserId) {
          // Columns and values ORDER must match
          await conn.query(
            `INSERT INTO Membership_Purchase (membership_id, transaction_id, user_id, is_renewal, line_total)
             VALUES (?, ?, ?, ?, ?)`,
            [membership_id, transaction_id, user_id, false, unit]
          );
        } else {
          await conn.query(
            `INSERT INTO Membership_Purchase (membership_id, transaction_id, is_renewal, line_total)
             VALUES (?, ?, ?, ?)`,
            [membership_id, transaction_id, false, unit]
          );
        }
      }

      await conn.commit();
      return res.json({
        ok: true,
        transaction_id,
        membership_ids,
        total_charged: expectedTotal,
        temp_password: rawTemp,
      });
    } catch (err) {
      await conn.rollback();
      console.error('Checkout TX error:', err);
      return res.status(400).json({ error: err.message || 'Checkout failed' });
    } finally {
      conn.release();
    }
  } catch (outer) {
    console.error('Checkout outer error:', outer);
    return res.status(400).json({ error: outer.message || 'Checkout failed' });
  }
});






// ---Donations Reports---
router.get('/donations', async (req, res) => {
  try {
    const { startDate: s, endDate: e } = req.query;
    const { startDate, endDate } = clampDateRange(s, e);
    
    // get total donations for the period
    const [totalDonationsResult] = await db.query(`
      SELECT 
        SUM(d.amount) as totalDonations,
        COUNT(*) as donationCount,
        AVG(d.amount) as averageDonation,
        COUNT(CASE WHEN d.is_anonymous = TRUE THEN 1 END) as anonymousCount
      FROM Donation d
      JOIN Transactions t ON d.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
    `, [startDate, endDate]);

    // get thedaily donations
    const [dailyDonations] = await db.query(`
      SELECT 
        DATE(t.transaction_date) as date,
        SUM(d.amount) as donations
      FROM Donation d
      JOIN Transactions t ON d.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        ${membershipTypeFilter}
      GROUP BY DATE(t.transaction_date)
      ORDER BY date
    `, [startDate, endDate]);

    const membershipTrend = dailySignups.map(d => ({
      date: d.date,
      newSignups: Number(d.new_signups),
      renewals: Number(d.renewals)
    }));

    res.json({
      newMembers,
      totalMembers,
      renewalRate,
      memberRetention,
      membershipTypesDistribution,
      membershipTrend
    });

  } catch (error) {
    console.error('Membership analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/membership/raw-data', async (req, res) => {
  try {
    const { startDate, endDate, membershipType } = req.query;

    const membershipTypeFilter = (!membershipType || membershipType === 'all') 
      ? '' 
      : `AND m.membership_type = ${db.escape(membershipType)}`;

    const query = `
      SELECT 
        mp.purchase_id,
        t.transaction_id,
        t.transaction_date as purchase_date,
        CONCAT(u.first_name, ' ', u.last_name) as member_name,
        u.email as member_email,
        u.phone_number as member_phone,
        m.membership_type,
        m.start_date,
        m.expiration_date,
        mp.line_total as amount,
        mp.is_renewal,
        m.is_active
      FROM Membership_Purchase mp
      JOIN Transactions t ON mp.transaction_id = t.transaction_id
      JOIN Membership m ON mp.membership_id = m.membership_id
      JOIN users u ON m.user_id = u.user_id
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        ${membershipTypeFilter}
      ORDER BY t.transaction_date DESC
    `;

    const [rows] = await db.query(query, [startDate, endDate]);
    res.json({ data: rows });

  } catch (error) {
    console.error('Membership raw data error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;