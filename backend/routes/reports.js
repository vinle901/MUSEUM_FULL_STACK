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
    
    // Get total sales for the period (only tickets, gift shop, cafeteria)
    const [totalSalesResult] = await db.query(`
      SELECT 
        (
          SELECT COALESCE(SUM(tp.line_total),0) FROM Ticket_Purchase tp
          JOIN Transactions t ON tp.transaction_id = t.transaction_id
          WHERE DATE(t.transaction_date) BETWEEN ? AND ?
            AND t.transaction_status = 'Completed'
            AND NOT EXISTS (
              SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
            )
        )
        + (
          SELECT COALESCE(SUM(gsp.line_total),0) FROM Gift_Shop_Purchase gsp
          JOIN Transactions t ON gsp.transaction_id = t.transaction_id
          WHERE DATE(t.transaction_date) BETWEEN ? AND ?
            AND t.transaction_status = 'Completed'
            AND NOT EXISTS (
              SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
            )
        )
        + (
          SELECT COALESCE(SUM(cp.line_total),0) FROM Cafeteria_Purchase cp
          JOIN Transactions t ON cp.transaction_id = t.transaction_id
          WHERE DATE(t.transaction_date) BETWEEN ? AND ?
            AND t.transaction_status = 'Completed'
            AND NOT EXISTS (
              SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
            )
        ) as totalSales,
        COUNT(*) as transactionCount,
        AVG(t.total_price) as averageOrderValue
      FROM Transactions t
      WHERE t.transaction_date >= ? AND t.transaction_date < DATE_ADD(?, INTERVAL 1 DAY)
        AND t.transaction_status = 'Completed'
        AND NOT EXISTS (
          SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
        )
    `, [startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate]);

    // Get daily sales (only tickets, gift shop, cafeteria; exclude membership and donation)
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
        AND NOT EXISTS (
          SELECT 1 FROM Membership_Purchase mp WHERE mp.transaction_id = t.transaction_id
        )
        AND (
          EXISTS (SELECT 1 FROM Ticket_Purchase tp WHERE tp.transaction_id = t.transaction_id)
          OR EXISTS (SELECT 1 FROM Gift_Shop_Purchase gsp WHERE gsp.transaction_id = t.transaction_id)
          OR EXISTS (SELECT 1 FROM Cafeteria_Purchase cp WHERE cp.transaction_id = t.transaction_id)
        )
      GROUP BY DATE(t.transaction_date)
      ORDER BY date
    `, [startDate, endDate]);

    // Get all completed transactions in the date range
    const [txRows] = await db.query(`
      SELECT t.transaction_id, t.total_price
      FROM Transactions t
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        AND NOT EXISTS (
          SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
        )
    `, [startDate, endDate]);

    // For each transaction, get line totals for each category
    let ticketsTotal = 0, giftShopTotal = 0, cafeteriaTotal = 0;
    for (const tx of txRows) {
      const [tickets] = await db.query(`SELECT COALESCE(SUM(line_total),0) as sum FROM Ticket_Purchase WHERE transaction_id = ?`, [tx.transaction_id]);
      const [giftShop] = await db.query(`SELECT COALESCE(SUM(line_total),0) as sum FROM Gift_Shop_Purchase WHERE transaction_id = ?`, [tx.transaction_id]);
      const [cafeteria] = await db.query(`SELECT COALESCE(SUM(line_total),0) as sum FROM Cafeteria_Purchase WHERE transaction_id = ?`, [tx.transaction_id]);
      const ticketsSum = Number(tickets[0].sum);
      const giftShopSum = Number(giftShop[0].sum);
      const cafeteriaSum = Number(cafeteria[0].sum);
      const subtotal = ticketsSum + giftShopSum;
      const tax = Math.max(0, Number(tx.total_price) - (ticketsSum + giftShopSum + cafeteriaSum));

      // Cafeteria only
      if (cafeteriaSum > 0 && ticketsSum === 0 && giftShopSum === 0) {
        cafeteriaTotal += Number(tx.total_price);
      }
      // Tickets only
      else if (ticketsSum > 0 && giftShopSum === 0 && cafeteriaSum === 0) {
        ticketsTotal += Number(tx.total_price);
      }
      // Gift shop only
      else if (giftShopSum > 0 && ticketsSum === 0 && cafeteriaSum === 0) {
        giftShopTotal += Number(tx.total_price);
      }
      // Mixed: only tickets and gift shop
      else if (ticketsSum > 0 && giftShopSum > 0 && cafeteriaSum === 0) {
        ticketsTotal += ticketsSum + (ticketsSum / subtotal) * tax;
        giftShopTotal += giftShopSum + (giftShopSum / subtotal) * tax;
      }
    }

    const toFixed2 = v => Number(v).toFixed(2);
    const ticketsRounded = toFixed2(ticketsTotal);
    const giftShopRounded = toFixed2(giftShopTotal);
    const cafeteriaRounded = toFixed2(cafeteriaTotal);
    const categorySales = [
      { category: 'Tickets', value: ticketsRounded },
      { category: 'Gift Shop', value: giftShopRounded },
      { category: 'Cafeteria', value: cafeteriaRounded }
    ];
    const totalSalesRounded = toFixed2(Number(ticketsTotal) + Number(giftShopTotal) + Number(cafeteriaTotal));
    const avgOrderValueRounded = toFixed2(totalSalesResult[0].averageOrderValue || 0);

    res.json({
      totalSales: totalSalesRounded,
      transactionCount: totalSalesResult[0].transactionCount || 0,
      averageOrderValue: avgOrderValueRounded,
      dailySales: dailySales.map(d => ({
        date: d.date,
        sales: toFixed2(d.sales)
      })),
      categorySales: categorySales
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
    const startTs = `${startDate} 00:00:00`;
    const endTsExclusive = endDate;
    const cat = (category || '').toLowerCase();

    // Build subquery join and any extra selects if needed
    let joinTable = null;
    if (cat === 'tickets' || cat === 'ticket' || cat === 'ticket sales') joinTable = 'Ticket_Purchase';
    else if (cat === 'gift shop' || cat === 'giftshop' || cat === 'gift') joinTable = 'Gift_Shop_Purchase';
    else if (cat === 'cafeteria' || cat === 'cafe') joinTable = 'Cafeteria_Purchase';
    else if (cat === 'membership' || cat === 'membership') joinTable = 'Membership_Purchase';

    if (!joinTable) {
      return res.status(400).json({ error: 'Invalid or missing category. Use one of: Tickets, Gift Shop, Cafeteria, membership.' });
    }

    const [rows] = await db.query(`
      SELECT DISTINCT 
        t.transaction_id as id,
        t.transaction_date as date,
        t.total_price as total
      FROM ${joinTable} j
      JOIN Transactions t ON j.transaction_id = t.transaction_id
      WHERE t.transaction_date >= ? AND t.transaction_date < DATE_ADD(?, INTERVAL 1 DAY)
        AND t.transaction_status = 'Completed'
        AND NOT EXISTS (
          SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
        )
      ORDER BY t.transaction_date DESC
    `, [startDate, endDate]);

    // For each transaction, fetch line items for all categories
    const transactions = await Promise.all(rows.map(async (r) => {
      const [tickets] = await db.query(`
        SELECT COALESCE(tt.ticket_name, CONCAT('Type ', tp.ticket_type_id)) as name, tp.quantity, tp.line_total
        FROM Ticket_Purchase tp
        LEFT JOIN Ticket_Types tt ON tt.ticket_type_id = tp.ticket_type_id
        WHERE tp.transaction_id = ?
      `, [r.id]);
      const [giftShop] = await db.query(`
        SELECT item_name as name, quantity, line_total
        FROM Gift_Shop_Purchase
        WHERE transaction_id = ?
      `, [r.id]);
      const [cafeteria] = await db.query(`
        SELECT item_name as name, quantity, line_total
        FROM Cafeteria_Purchase
        WHERE transaction_id = ?
      `, [r.id]);
      return {
        id: r.id,
        date: r.date,
        total: parseFloat(r.total) || 0,
        tickets,
        giftShop,
        cafeteria
      };
    }));

    res.json({
      category: category,
      transactions
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

    const [membership] = await db.query(`
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
        membership: membership.map(x => ({ membership_id: x.membership_id, is_renewal: !!x.is_renewal })),
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
      WHERE t.transaction_date >= ? AND t.transaction_date < DATE_ADD(?, INTERVAL 1 DAY)
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
    
    // Get revenue breakdown by source, splitting out categories per transaction and allocating proportional tax, excluding donations
    const [txRows] = await db.query(`
      SELECT t.transaction_id, t.total_price
      FROM Transactions t
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        AND NOT EXISTS (
          SELECT 1 FROM Donation d WHERE d.transaction_id = t.transaction_id
        )
    `, [startDate, endDate]);

    let ticketsTotal = 0, giftShopTotal = 0, cafeteriaTotal = 0, membershipTotal = 0;
    for (const tx of txRows) {
      const [tickets] = await db.query(`SELECT COALESCE(SUM(line_total),0) as sum FROM Ticket_Purchase WHERE transaction_id = ?`, [tx.transaction_id]);
      const [giftShop] = await db.query(`SELECT COALESCE(SUM(line_total),0) as sum FROM Gift_Shop_Purchase WHERE transaction_id = ?`, [tx.transaction_id]);
      const [cafeteria] = await db.query(`SELECT COALESCE(SUM(line_total),0) as sum FROM Cafeteria_Purchase WHERE transaction_id = ?`, [tx.transaction_id]);
      const [membership] = await db.query(`SELECT COALESCE(SUM(line_total),0) as sum FROM Membership_Purchase WHERE transaction_id = ?`, [tx.transaction_id]);
      const ticketsSum = Number(tickets[0].sum);
      const giftShopSum = Number(giftShop[0].sum);
      const cafeteriaSum = Number(cafeteria[0].sum);
      const membershipSum = Number(membership[0].sum);
      const subtotal = ticketsSum + giftShopSum;
      const tax = Math.max(0, Number(tx.total_price) - (ticketsSum + giftShopSum + cafeteriaSum + membershipSum));

      // Mixed: only tickets and gift shop
      if (ticketsSum > 0 && giftShopSum > 0 && cafeteriaSum === 0 && membershipSum === 0) {
        ticketsTotal += ticketsSum + (ticketsSum / subtotal) * tax;
        giftShopTotal += giftShopSum + (giftShopSum / subtotal) * tax;
      } else {
        if (ticketsSum > 0) ticketsTotal += Number(tx.total_price);
        if (giftShopSum > 0) giftShopTotal += Number(tx.total_price);
        if (cafeteriaSum > 0) cafeteriaTotal += Number(tx.total_price);
        if (membershipSum > 0) membershipTotal += Number(tx.total_price);
      }
    }

    const toFixed2 = v => Number(v).toFixed(2);
    const ticketsRounded = toFixed2(ticketsTotal);
    const giftShopRounded = toFixed2(giftShopTotal);
    const cafeteriaRounded = toFixed2(cafeteriaTotal);
    const membershipRounded = toFixed2(membershipTotal);
    const totalRevenue = toFixed2(Number(ticketsTotal) + Number(giftShopTotal) + Number(cafeteriaTotal) + Number(membershipTotal));
    const breakdown = [
      { source: 'Ticket Sales', amount: ticketsRounded },
      { source: 'Gift Shop', amount: giftShopRounded },
      { source: 'Cafeteria', amount: cafeteriaRounded },
      { source: 'membership', amount: membershipRounded }
    ];

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
        WHERE t.transaction_date >= ? AND t.transaction_date < DATE_ADD(?, INTERVAL 1 DAY)
          AND DATE(t.transaction_date) <= DATE(?)
          AND t.transaction_status = 'Completed'
        GROUP BY DATE_FORMAT(t.transaction_date, '%Y-%m')
      ) monthly_sources
      GROUP BY period, month
      ORDER BY period
      LIMIT 6
    `, [endDate, endDate, endDate, endDate, endDate, endDate, endDate, endDate]);
    
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
      FROM membership
      WHERE is_active = TRUE
        AND expiration_date >= CURDATE()
    `);

    // Get new members this month
    const [newMembersResult] = await db.query(`
      SELECT COUNT(*) as newMembers
      FROM membership
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
    membership_id,
    email,
    first_name = '',
    last_name = '',
    phone_number = null,
    subscribe_to_newsletter = false,
    birthdate = null,
    sex = null,                 // send 'M' or 'F' only; otherwise omit
    membership_type = null,
    start_date = null,
    expiration_date = null,
    is_active = null,
  } = req.body || {};

  if (!membership_id) return res.status(400).json({ error: 'membership_id is required' });
  if (!email)         return res.status(400).json({ error: 'email is required' });

  const normalizeSex = (v) => {
    if (v == null) return null;
    const s = String(v).trim().toUpperCase();
    return (s === 'M' || s === 'F') ? s : null;
  };
  const sexNorm = normalizeSex(sex);
  const newEmail = String(email).trim().toLowerCase();

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // ----- detect table names once -----
    const [[uTbl]] = await conn.query(`
      SELECT TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('users','Users','User') LIMIT 1
    `);
    const [[mTbl]] = await conn.query(`
      SELECT TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('membership','Membership','memberships','Memberships') LIMIT 1
    `);
    if (!uTbl?.name || !mTbl?.name) throw new Error('users/Membership table not found');

    const USERS_TABLE = `\`${uTbl.name}\``;
    const MEMBERSHIP_TABLE = `\`${mTbl.name}\``;

    // ----- 1) resolve user_id from membership_id (BEFORE using it) -----
    const [[m]] = await conn.query(
      `SELECT user_id FROM ${MEMBERSHIP_TABLE} WHERE membership_id = ? LIMIT 1`,
      [membership_id]
    );
    if (!m) throw new Error('Unknown membership_id');
    let user_id = m.user_id; // <-- reuse this variable; do NOT redeclare later

    // ----- 2) prevent email collision with another user -----
    const [[dupe]] = await conn.query(
      `SELECT user_id FROM ${USERS_TABLE} WHERE email = ? AND user_id <> ? LIMIT 1`,
      [newEmail, user_id]
    );
    if (dupe) throw new Error('Email already in use by another account');

    // ----- 3) update USERS by user_id -----
    const paramsUser = [
      newEmail, first_name, last_name, phone_number, !!subscribe_to_newsletter, birthdate
    ];
    let setSex = '';
    if (sexNorm) { setSex = ', sex = ?'; paramsUser.push(sexNorm); }

    paramsUser.push(user_id);

    await conn.query(
      `
      UPDATE ${USERS_TABLE}
         SET email = ?,
             first_name = ?,
             last_name  = ?,
             phone_number = ?,
             subscribe_to_newsletter = ?,
             birthdate = ?
             ${setSex}
       WHERE user_id = ?
      `,
      paramsUser
    );

    // ----- 4) update MEMBERSHIP by membership_id (only provided fields) -----
    const set = [];
    const vals = [];
    if (membership_type !== null) { set.push('membership_type = ?'); vals.push(membership_type); }
    if (start_date !== null)       { set.push('start_date = ?');      vals.push(start_date); }
    if (expiration_date !== null)  { set.push('expiration_date = ?'); vals.push(expiration_date); }
    if (is_active !== null)        { set.push('is_active = ?');       vals.push(!!is_active); }

    if (set.length > 0) {
      vals.push(membership_id, user_id);
      await conn.query(
        `UPDATE ${MEMBERSHIP_TABLE} SET ${set.join(', ')} WHERE membership_id = ? AND user_id = ?`,
        vals
      );
    }

    await conn.commit();
    return res.json({ ok: true, user_id, membership_id });
  } catch (e) {
    if (conn) await conn.rollback();
    console.error('Member update error:', e);
    return res.status(400).json({ error: e.message || 'Member update failed' });
  } finally {
    if (conn) conn.release();
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
      GROUP BY DATE(t.transaction_date)
      ORDER BY date
    `, [startDate, endDate]);

    // get the donations type
    const [donationsByType] = await db.query(`
      SELECT 
        d.donation_type as category,
        SUM(d.amount) as value
      FROM Donation d
      JOIN Transactions t ON d.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
      GROUP BY d.donation_type
      ORDER BY value DESC
    `, [startDate, endDate]);

    const toFixed2 = v => Number(v).toFixed(2);

    res.json({
      totalSales: toFixed2(totalDonationsResult[0].totalDonations || 0),
      transactionCount: totalDonationsResult[0].donationCount || 0,
      averageOrderValue: toFixed2(totalDonationsResult[0].averageDonation || 0),
      anonymousCount: totalDonationsResult[0].anonymousCount || 0,
      dailySales: dailyDonations.map(d => ({
        date: d.date,
        sales: toFixed2(d.donations)
      })),
      categorySales: donationsByType.map(c => ({
        category: c.category,
        value: toFixed2(c.value)
      }))
    });
  } catch (error) {
    console.error('Donations report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/donations/transactions - List donation transactions by type
router.get('/donations/transactions', async (req, res) => {
  try {
    const { startDate: s, endDate: e, category } = req.query;
    const { startDate, endDate } = clampDateRange(s, e);

    if (!category) {
      return res.status(400).json({ error: 'Category (donation type) is required' });
    }

    const [rows] = await db.query(`
      SELECT DISTINCT 
        t.transaction_id as id,
        t.transaction_date as date,
        d.amount as total,
        d.donation_type,
        d.is_anonymous,
        CASE 
          WHEN d.is_anonymous = TRUE THEN 'Anonymous'
          ELSE CONCAT(u.first_name, ' ', u.last_name)
        END as donor_name
      FROM Donation d
      JOIN Transactions t ON d.transaction_id = t.transaction_id
      LEFT JOIN users u ON t.user_id = u.user_id
      WHERE DATE(t.transaction_date) BETWEEN ? AND ?
        AND t.transaction_status = 'Completed'
        AND d.donation_type = ?
      ORDER BY t.transaction_date DESC
    `, [startDate, endDate, category]);

    const transactions = rows.map(r => ({
      id: r.id,
      date: r.date,
      total: parseFloat(r.total) || 0,
      tickets: [],
      giftShop: [],
      cafeteria: [],
      donorName: r.donor_name,
      donationType: r.donation_type,
      isAnonymous: !!r.is_anonymous
    }));

    res.json({
      category: category,
      transactions
    });
  } catch (error) {
    console.error('Donations transactions list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/donations/transaction/:id - Donation transaction detail
router.get('/donations/transaction/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [txRows] = await db.query(`
      SELECT 
        t.transaction_id as id, 
        t.transaction_date as date, 
        t.total_price as total, 
        t.transaction_status as status,
        d.amount as donation_amount,
        d.donation_type,
        d.is_anonymous,
        d.dedication_message,
        t.payment_method,
        CASE 
          WHEN d.is_anonymous = TRUE THEN 'Anonymous'
          ELSE CONCAT(u.first_name, ' ', u.last_name)
        END as donor_name
      FROM Transactions t
      JOIN Donation d ON d.transaction_id = t.transaction_id
      LEFT JOIN users u ON t.user_id = u.user_id
      WHERE t.transaction_id = ?
    `, [id]);
    
    if (txRows.length === 0) return res.status(404).json({ error: 'Transaction not found' });

    const transaction = {
      id: txRows[0].id,
      date: txRows[0].date,
      total: parseFloat(txRows[0].donation_amount) || 0,
      status: txRows[0].status,
    };

    const donationDetails = [{
      type: 'Donation',
      name: `${txRows[0].donation_type}${txRows[0].dedication_message ? ' - ' + txRows[0].dedication_message : ''}`,
      donor: txRows[0].donor_name,
      amount: parseFloat(txRows[0].donation_amount) || 0,
      payment_method: txRows[0].payment_method
    }];

    res.json({
      transaction,
      items: {
        tickets: [],
        giftShop: [],
        cafeteria: [],
        donations: donationDetails
      }
    });
  } catch (error) {
    console.error('Donation transaction detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;