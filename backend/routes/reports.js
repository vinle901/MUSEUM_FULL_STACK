// File: backend/routes/reports.js

import express from 'express';
import db from '../config/database.js';
import middleware from '../utils/middleware.js';

const router = express.Router();

// All reports require appropriate role access
// Allow analysts to view reports in addition to employees and admins
router.use(middleware.requireRole('employee', 'admin', 'analyst'));

// Helper to clamp endDate to today's date (YYYY-MM-DD) using local time
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
router.get('/sales', async (req, res) => {
  try {
    const { startDate: s, endDate: e } = req.query;
    const { startDate, endDate } = clampDateRange(s, e);
    
    // Get total sales for the period
    const [totalSalesResult] = await db.query(`
      SELECT 
        SUM(t.total_price) as totalSales,
        COUNT(*) as transactionCount,
        AVG(t.total_price) as averageOrderValue
      FROM Transactions t
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        AND NOT EXISTS (
          SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
        )
    `, [startDate, endDate]);

    // Get daily sales
    const [dailySales] = await db.query(`
      SELECT 
        DATE(t.transaction_date) as date,
        SUM(t.total_price) as sales
      FROM Transactions t
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        AND NOT EXISTS (
          SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
        )
      GROUP BY DATE(t.transaction_date)
      ORDER BY date
    `, [startDate, endDate]);

    // Get sales by category
    const [categorySales] = await db.query(`
      SELECT 'Tickets' as category, SUM(tp.line_total) as value
      FROM Ticket_Purchase tp
      JOIN Transactions t ON tp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        AND NOT EXISTS (
          SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
        )
      UNION ALL
      SELECT 'Gift Shop' as category, SUM(gsp.line_total) as value
      FROM Gift_Shop_Purchase gsp
      JOIN Transactions t ON gsp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        AND NOT EXISTS (
          SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
        )
      UNION ALL
      SELECT 'Cafeteria' as category, SUM(cp.line_total) as value
      FROM Cafeteria_Purchase cp
      JOIN Transactions t ON cp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        AND NOT EXISTS (
          SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
        )
      UNION ALL
      -- For memberships, sum the transaction total for transactions that include a membership purchase
      SELECT 'Memberships' as category, SUM(t.total_price) as value
      FROM Membership_Purchase mp
      JOIN Transactions t ON mp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        AND NOT EXISTS (
          SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
        )
    `, [startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate]);

    res.json({
      totalSales: parseFloat(totalSalesResult[0].totalSales) || 0,
      transactionCount: totalSalesResult[0].transactionCount || 0,
      averageOrderValue: parseFloat(totalSalesResult[0].averageOrderValue) || 0,
      dailySales: dailySales.map(d => ({
        date: d.date,
        sales: parseFloat(d.sales)
      })),
      categorySales: categorySales.map(c => ({
        category: c.category,
        value: parseFloat(c.value) || 0
      }))
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/sales/transactions - List transactions by category
router.get('/sales/transactions', async (req, res) => {
  try {
    const { startDate: s, endDate: e, category } = req.query;
    const { startDate, endDate } = clampDateRange(s, e);
    const cat = (category || '').toLowerCase();

    // Build subquery join and any extra selects if needed
    let joinTable = null;
    if (cat === 'tickets' || cat === 'ticket' || cat === 'ticket sales') joinTable = 'Ticket_Purchase';
    else if (cat === 'gift shop' || cat === 'giftshop' || cat === 'gift') joinTable = 'Gift_Shop_Purchase';
    else if (cat === 'cafeteria' || cat === 'cafe') joinTable = 'Cafeteria_Purchase';
    else if (cat === 'memberships' || cat === 'membership') joinTable = 'Membership_Purchase';

    if (!joinTable) {
      return res.status(400).json({ error: 'Invalid or missing category. Use one of: Tickets, Gift Shop, Cafeteria, Memberships.' });
    }

    const [rows] = await db.query(`
      SELECT DISTINCT 
        t.transaction_id as id,
        t.transaction_date as date,
        t.total_price as total
      FROM ${joinTable} j
      JOIN Transactions t ON j.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        AND NOT EXISTS (
          SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
        )
      ORDER BY t.transaction_date DESC
    `, [startDate, endDate]);

    res.json({
      category: category,
      transactions: rows.map(r => ({
        id: r.id,
        date: r.date,
        total: parseFloat(r.total) || 0
      }))
    });
  } catch (error) {
    console.error('Sales transactions list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/sales/transaction/:id - Transaction detail with line items
router.get('/sales/transaction/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Basic transaction info
    const [txRows] = await db.query(`
      SELECT transaction_id as id, transaction_date as date, total_price as total, transaction_status as status
      FROM Transactions
      WHERE transaction_id = ?
    `, [id]);
    if (txRows.length === 0) return res.status(404).json({ error: 'Transaction not found' });

    const transaction = {
      id: txRows[0].id,
      date: txRows[0].date,
      total: parseFloat(txRows[0].total) || 0,
      status: txRows[0].status,
    };

    // Line items by source
    const [tickets] = await db.query(`
      SELECT COALESCE(tt.ticket_name, CONCAT('Type ', tp.ticket_type_id)) as name, tp.quantity, tp.line_total
      FROM Ticket_Purchase tp
      LEFT JOIN Ticket_Types tt ON tt.ticket_type_id = tp.ticket_type_id
      WHERE tp.transaction_id = ?
    `, [id]);

    const [giftShop] = await db.query(`
      SELECT item_name as name, quantity, line_total
      FROM Gift_Shop_Purchase
      WHERE transaction_id = ?
    `, [id]);

    const [cafeteria] = await db.query(`
      SELECT item_name as name, quantity, line_total
      FROM Cafeteria_Purchase
      WHERE transaction_id = ?
    `, [id]);

    const [memberships] = await db.query(`
      SELECT mp.membership_id, mp.is_renewal
      FROM Membership_Purchase mp
      WHERE mp.transaction_id = ?
    `, [id]);

    res.json({
      transaction,
      items: {
        tickets: tickets.map(x => ({ name: x.name, quantity: x.quantity, line_total: parseFloat(x.line_total) || 0 })),
        giftShop: giftShop.map(x => ({ name: x.name, quantity: x.quantity, line_total: parseFloat(x.line_total) || 0 })),
        cafeteria: cafeteria.map(x => ({ name: x.name, quantity: x.quantity, line_total: parseFloat(x.line_total) || 0 })),
        memberships: memberships.map(x => ({ membership_id: x.membership_id, is_renewal: !!x.is_renewal })),
      }
    });
  } catch (error) {
    console.error('Sales transaction detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --------------------------- ATTENDANCE ------------------------------
router.get('/attendance', async (req, res) => {
  try {
    const { startDate: s, endDate: e, usedOnly } = req.query;
    const { startDate, endDate } = clampDateRange(s, e);
    const usedFilter = usedOnly === 'true' ? ' AND tp.is_used = TRUE' : '';
    
    // Get total visitors as the sum of ticket quantities in the date range
    const [totalVisitorsResult] = await db.query(`
      SELECT 
        COALESCE(SUM(tp.quantity), 0) as totalVisitors,
        COALESCE(SUM(tp.quantity), 0) / GREATEST(1, DATEDIFF(?, ?) + 1) as averageDailyVisitors
      FROM Ticket_Purchase tp
      JOIN Transactions t ON tp.transaction_id = t.transaction_id
      WHERE tp.visit_date >= ? AND tp.visit_date <= ?
        AND t.transaction_status = 'Completed'${'${usedFilter}'}
    `.replace('${usedFilter}', usedFilter), [endDate, startDate, startDate, endDate]);

    // Get daily attendance (sum of quantities per visit_date)
    const [dailyAttendance] = await db.query(`
      SELECT 
        tp.visit_date as date,
        COALESCE(SUM(tp.quantity), 0) as visitors
      FROM Ticket_Purchase tp
      JOIN Transactions t ON tp.transaction_id = t.transaction_id
      WHERE tp.visit_date >= ? AND tp.visit_date <= ?
        AND t.transaction_status = 'Completed'${'${usedFilter}'}
      GROUP BY tp.visit_date
      ORDER BY tp.visit_date
    `.replace('${usedFilter}', usedFilter), [startDate, endDate]);

    // Average group size = total quantity divided by number of distinct transactions (party checkouts)
    const [avgGroupSizeResult] = await db.query(`
      SELECT 
        COALESCE(ROUND(SUM(tp.quantity) / NULLIF(COUNT(DISTINCT t.transaction_id), 0), 0), 0) AS avgGroupSize
      FROM Ticket_Purchase tp
      JOIN Transactions t ON tp.transaction_id = t.transaction_id
      WHERE tp.visit_date >= ? AND tp.visit_date <= ?
        AND t.transaction_status = 'Completed'${'${usedFilter}'}
    `.replace('${usedFilter}', usedFilter), [startDate, endDate]);

    // Hourly distribution (based on transaction times; sum quantities)
    const [hourlyDistribution] = await db.query(`
      SELECT 
        HOUR(t.transaction_date) as hour,
        COALESCE(SUM(tp.quantity), 0) as visitors
      FROM Ticket_Purchase tp
      JOIN Transactions t ON tp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
        AND t.transaction_status = 'Completed'${'${usedFilter}'}
      GROUP BY HOUR(t.transaction_date)
      ORDER BY hour
    `.replace('${usedFilter}', usedFilter), [startDate, endDate]);

    // Ticket type breakdown (sum of quantities per ticket type)
    const [ticketTypeBreakdown] = await db.query(`
      SELECT 
        COALESCE(tt.ticket_name, CONCAT('Type ', tp.ticket_type_id)) as type,
        COALESCE(SUM(tp.quantity), 0) as visitors
      FROM Ticket_Purchase tp
      JOIN Transactions t ON tp.transaction_id = t.transaction_id
      LEFT JOIN Ticket_Types tt ON tt.ticket_type_id = tp.ticket_type_id
      WHERE tp.visit_date BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'${'${usedFilter}'}
      GROUP BY tp.ticket_type_id, tt.ticket_name
      ORDER BY visitors DESC
    `.replace('${usedFilter}', usedFilter), [startDate, endDate]);

    res.json({
  totalVisitors: Number(totalVisitorsResult[0].totalVisitors) || 0,
  averageDailyVisitors: Math.round(Number(totalVisitorsResult[0].averageDailyVisitors) || 0),
      averageGroupSize: Number(avgGroupSizeResult[0]?.avgGroupSize || 0),
      dailyAttendance: dailyAttendance,
      hourlyDistribution: hourlyDistribution.map(h => ({
        hour: `${h.hour}:00`,
        visitors: h.visitors
      })),
      ticketTypeBreakdown
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ------------------------- POPULAR ITEMS -----------------------------
router.get('/popular-items', async (req, res) => {
  try {
    const { startDate: s, endDate: e } = req.query;
    const { startDate, endDate } = clampDateRange(s, e);
    
    // Get top gift shop items
    const [giftShopItems] = await db.query(`
      SELECT 
        gsp.item_name as name,
        SUM(gsp.quantity) as sales,
        SUM(gsp.line_total) as revenue
      FROM Gift_Shop_Purchase gsp
      JOIN Transactions t ON gsp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
        AND t.transaction_status = 'Completed'
      GROUP BY gsp.item_name
      ORDER BY sales DESC
      LIMIT 5
    `, [startDate, endDate]);

    // Get top cafeteria items
    const [cafeteriaItems] = await db.query(`
      SELECT 
        cp.item_name as name,
        SUM(cp.quantity) as sales,
        SUM(cp.line_total) as revenue
      FROM Cafeteria_Purchase cp
      JOIN Transactions t ON cp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
        AND t.transaction_status = 'Completed'
      GROUP BY cp.item_name
      ORDER BY sales DESC
      LIMIT 5
    `, [startDate, endDate]);

    res.json({
      giftShop: giftShopItems.map(item => ({
        name: item.name,
        sales: item.sales,
        revenue: parseFloat(item.revenue)
      })),
      cafeteria: cafeteriaItems.map(item => ({
        name: item.name,
        sales: item.sales,
        revenue: parseFloat(item.revenue)
      }))
    });
  } catch (error) {
    console.error('Popular items report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --------------------------- REVENUE --------------------------------
router.get('/revenue', async (req, res) => {
  try {
    const { startDate: s, endDate: e } = req.query;
    const { startDate, endDate } = clampDateRange(s, e);
    
    // Get revenue breakdown by source
    const [breakdown] = await db.query(`
      SELECT source, SUM(amount) as amount FROM (
        SELECT 'Ticket Sales' as source, SUM(line_total) as amount
        FROM Ticket_Purchase tp
        JOIN Transactions t ON tp.transaction_id = t.transaction_id
        WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
          AND t.transaction_status = 'Completed'
        UNION ALL
        SELECT 'Gift Shop' as source, SUM(line_total) as amount
        FROM Gift_Shop_Purchase gsp
        JOIN Transactions t ON gsp.transaction_id = t.transaction_id
        WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
          AND t.transaction_status = 'Completed'
        UNION ALL
        SELECT 'Cafeteria' as source, SUM(line_total) as amount
        FROM Cafeteria_Purchase cp
        JOIN Transactions t ON cp.transaction_id = t.transaction_id
        WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
          AND t.transaction_status = 'Completed'
        UNION ALL
        -- Membership revenue uses line_total from Membership_Purchase
        SELECT 'Memberships' as source, SUM(mp.line_total) as amount
        FROM Membership_Purchase mp
        JOIN Transactions t ON mp.transaction_id = t.transaction_id
        WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
          AND t.transaction_status = 'Completed'
      ) revenue_sources
      GROUP BY source
    `, [startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate]);

    // Get monthly trend from non-donation sources (ONLY_FULL_GROUP_BY-safe)
    const [monthlyTrend] = await db.query(`
      SELECT period, month, SUM(amount) as revenue FROM (
        SELECT 
          DATE_FORMAT(t.transaction_date, '%Y-%m') as period,
          DATE_FORMAT(MIN(t.transaction_date), '%b') as month,
          SUM(tp.line_total) as amount
        FROM Ticket_Purchase tp
        JOIN Transactions t ON tp.transaction_id = t.transaction_id
        WHERE DATE(t.transaction_date) >= DATE_SUB(DATE(?), INTERVAL 6 MONTH)
          AND DATE(t.transaction_date) <= DATE(?)
          AND t.transaction_status = 'Completed'
        GROUP BY DATE_FORMAT(t.transaction_date, '%Y-%m')
        UNION ALL
        SELECT 
          DATE_FORMAT(t.transaction_date, '%Y-%m') as period,
          DATE_FORMAT(MIN(t.transaction_date), '%b') as month,
          SUM(gsp.line_total) as amount
        FROM Gift_Shop_Purchase gsp
        JOIN Transactions t ON gsp.transaction_id = t.transaction_id
        WHERE DATE(t.transaction_date) >= DATE_SUB(DATE(?), INTERVAL 6 MONTH)
          AND DATE(t.transaction_date) <= DATE(?)
          AND t.transaction_status = 'Completed'
        GROUP BY DATE_FORMAT(t.transaction_date, '%Y-%m')
        UNION ALL
        SELECT 
          DATE_FORMAT(t.transaction_date, '%Y-%m') as period,
          DATE_FORMAT(MIN(t.transaction_date), '%b') as month,
          SUM(cp.line_total) as amount
        FROM Cafeteria_Purchase cp
        JOIN Transactions t ON cp.transaction_id = t.transaction_id
        WHERE DATE(t.transaction_date) >= DATE_SUB(DATE(?), INTERVAL 6 MONTH)
          AND DATE(t.transaction_date) <= DATE(?)
          AND t.transaction_status = 'Completed'
        GROUP BY DATE_FORMAT(t.transaction_date, '%Y-%m')
        UNION ALL
        SELECT 
          DATE_FORMAT(t.transaction_date, '%Y-%m') as period,
          DATE_FORMAT(MIN(t.transaction_date), '%b') as month,
          SUM(mp.line_total) as amount
        FROM Membership_Purchase mp
        JOIN Transactions t ON mp.transaction_id = t.transaction_id
        WHERE DATE(t.transaction_date) >= DATE_SUB(DATE(?), INTERVAL 6 MONTH)
          AND DATE(t.transaction_date) <= DATE(?)
          AND t.transaction_status = 'Completed'
        GROUP BY DATE_FORMAT(t.transaction_date, '%Y-%m')
      ) monthly_sources
      GROUP BY period, month
      ORDER BY period
      LIMIT 6
    `, [endDate, endDate, endDate, endDate, endDate, endDate, endDate, endDate]);
    // Derive totalRevenue from breakdown (excludes donations by construction)
    const totalRevenue = breakdown.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    
    res.json({
      totalRevenue: totalRevenue,
      monthlyGrowth: 0, // Calculate based on previous period if needed
      breakdown: breakdown.map(b => ({
        source: b.source,
        amount: parseFloat(b.amount) || 0,
        percentage: totalRevenue > 0 ? ((parseFloat(b.amount) / totalRevenue) * 100).toFixed(1) : 0
      })),
      monthlyTrend: monthlyTrend.map(m => ({
        month: m.month,
        revenue: parseFloat(m.revenue)
      }))
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// -------------------------- MEMBERSHIP ------------------------------
router.get('/membership', async (req, res) => {
  try {
    const { startDate: s, endDate: e } = req.query;
    const { startDate, endDate } = clampDateRange(s, e);
    
    // Get total active members
    const [totalMembersResult] = await db.query(`
      SELECT COUNT(*) as totalMembers
      FROM Membership
      WHERE is_active = TRUE
        AND expiration_date >= CURDATE()
    `);

    // Get new members this month
    const [newMembersResult] = await db.query(`
      SELECT COUNT(*) as newMembers
      FROM Membership
      WHERE start_date >= ? AND start_date <= ?
    `, [startDate, endDate]);

    // Get renewal rate
    const [renewalRateResult] = await db.query(`
      SELECT 
        COUNT(CASE WHEN mp.is_renewal = TRUE THEN 1 END) as renewals,
        COUNT(*) as total
      FROM Membership_Purchase mp
      JOIN Transactions t ON mp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
    `, [startDate, endDate]);

    // Get membership type distribution
    const [membershipTypes] = await db.query(`
      SELECT 
        membership_type as type,
        COUNT(*) as count
      FROM Membership
      WHERE is_active = TRUE
        AND expiration_date >= CURDATE()
      GROUP BY membership_type
    `);

    // Get monthly growth (ONLY_FULL_GROUP_BY-safe)
    const [monthlyGrowth] = await db.query(`
      SELECT 
        DATE_FORMAT(m.start_date, '%Y-%m') as period,
        DATE_FORMAT(MIN(m.start_date), '%b') as month,
        COUNT(CASE WHEN mp.is_renewal = FALSE THEN 1 END) as new,
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
router.get('/membership-signups', async (req, res) => {
  try {
    const { startDate: s, endDate: e } = req.query;
    if (!s || !e) {
      return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD)' });
    }
    const { startDate, endDate } = clampDateRange(s, e);

    // Detail rows
    const [rows] = await db.query(
      `
      SELECT
        u.\`user_id\`,
        u.\`first_name\`,
        u.\`last_name\`,
        u.\`email\`,
        u.\`phone_number\`,
        u.\`subscribe_to_newsletter\`,
        m.\`membership_id\`,
        m.\`membership_type\`,
        COALESCE(mp.\`line_total\`, 0)                 AS line_total,
        t.\`transaction_date\`                         AS purchased_at
      FROM \`Membership\` m
      JOIN \`users\` u                ON u.\`user_id\`         = m.\`user_id\`
      JOIN \`Membership_Purchase\` mp ON mp.\`membership_id\`  = m.\`membership_id\`
      JOIN \`Transactions\` t         ON t.\`transaction_id\`  = mp.\`transaction_id\`
      WHERE DATE(t.\`transaction_date\`) >= ? 
        AND DATE(t.\`transaction_date\`) <= ?
        AND t.\`transaction_status\` = 'Completed'
      ORDER BY t.\`transaction_date\` ASC, m.\`membership_id\` ASC
      `,
      [startDate, endDate]
    );

    // Summary totals
    const [summary] = await db.query(
      `
      SELECT
        COUNT(*)                                 AS signupCount,
        SUM(COALESCE(mp.\`line_total\`, 0))      AS totalAmount
      FROM \`Membership\` m
      JOIN \`Membership_Purchase\` mp ON mp.\`membership_id\` = m.\`membership_id\`
      JOIN \`Transactions\` t         ON t.\`transaction_id\` = mp.\`transaction_id\`
      WHERE DATE(t.\`transaction_date\`) >= ? 
        AND DATE(t.\`transaction_date\`) <= ?
        AND t.\`transaction_status\` = 'Completed'
      `,
      [startDate, endDate]
    );

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
        phone_number: r.phone_number,
        subscribe_to_newsletter: !!r.subscribe_to_newsletter,
        membership_id: r.membership_id,
        membership_type: r.membership_type,
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

export default router;