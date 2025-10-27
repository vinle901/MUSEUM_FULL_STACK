// File: backend/routes/reports.js

import express from 'express';
import db from '../config/database.js';
import middleware from '../utils/middleware.js';

const router = express.Router();

// All reports require appropriate role access
// Allow analysts to view reports in addition to employees and admins
router.use(middleware.requireRole('employee', 'admin', 'analyst'));

// Helper to clamp endDate to today's date (YYYY-MM-DD)
const clampDateRange = (startDate, endDate) => {
  const today = new Date().toISOString().split('T')[0];
  const safeEnd = !endDate || endDate > today ? today : endDate;
  let safeStart = startDate && startDate <= safeEnd ? startDate : null;
  if (!safeStart) {
    const endObj = new Date(safeEnd);
    const startObj = new Date(endObj);
    startObj.setDate(startObj.getDate() - 30);
    safeStart = startObj.toISOString().split('T')[0];
  }
  if (safeStart > safeEnd) safeStart = safeEnd;
  return { startDate: safeStart, endDate: safeEnd };
};

// GET /api/reports/sales - Sales analysis report
router.get('/sales', async (req, res) => {
  try {
    const { startDate: s, endDate: e } = req.query;
    const { startDate, endDate } = clampDateRange(s, e);
    
    // Get total sales for the period
    const [totalSalesResult] = await db.query(`
      SELECT 
        SUM(total_price) as totalSales,
        COUNT(*) as transactionCount,
        AVG(total_price) as averageOrderValue
      FROM Transactions
      WHERE DATE(transaction_date) >= ? AND DATE(transaction_date) <= ?
        AND transaction_status = 'Completed'
    `, [startDate, endDate]);

    // Get daily sales
    const [dailySales] = await db.query(`
      SELECT 
        DATE(transaction_date) as date,
        SUM(total_price) as sales
      FROM Transactions
      WHERE DATE(transaction_date) >= ? AND DATE(transaction_date) <= ?
        AND transaction_status = 'Completed'
      GROUP BY DATE(transaction_date)
      ORDER BY date
    `, [startDate, endDate]);

    // Get sales by category
    const [categorySales] = await db.query(`
      SELECT 'Tickets' as category, SUM(tp.line_total) as value
      FROM Ticket_Purchase tp
      JOIN Transactions t ON tp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
        AND t.transaction_status = 'Completed'
      UNION ALL
      SELECT 'Gift Shop' as category, SUM(gsp.line_total) as value
      FROM Gift_Shop_Purchase gsp
      JOIN Transactions t ON gsp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
        AND t.transaction_status = 'Completed'
      UNION ALL
      SELECT 'Cafeteria' as category, SUM(cp.line_total) as value
      FROM Cafeteria_Purchase cp
      JOIN Transactions t ON cp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
        AND t.transaction_status = 'Completed'
      UNION ALL
      -- For memberships, sum the transaction total for transactions that include a membership purchase
      SELECT 'Memberships' as category, SUM(t.total_price) as value
      FROM Membership_Purchase mp
      JOIN Transactions t ON mp.transaction_id = t.transaction_id
      WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
        AND t.transaction_status = 'Completed'
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

// GET /api/reports/attendance - Visitor attendance report
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

    // Get peak day by total quantity used
    const [peakDayResult] = await db.query(`
      SELECT 
        DAYNAME(tp.visit_date) as peakDay,
        COALESCE(SUM(tp.quantity), 0) as count
      FROM Ticket_Purchase tp
      JOIN Transactions t ON tp.transaction_id = t.transaction_id
      WHERE tp.visit_date >= ? AND tp.visit_date <= ?
        AND t.transaction_status = 'Completed'${'${usedFilter}'}
      GROUP BY DAYNAME(tp.visit_date)
      ORDER BY count DESC
      LIMIT 1
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
      peakDay: peakDayResult[0]?.peakDay || 'N/A',
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

// GET /api/reports/popular-items - Popular items report
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

// GET /api/reports/revenue - Revenue breakdown report
router.get('/revenue', async (req, res) => {
  try {
    const { startDate: s, endDate: e } = req.query;
    const { startDate, endDate } = clampDateRange(s, e);
    
    // Get total revenue
    const [totalRevenueResult] = await db.query(`
      SELECT 
        SUM(total_price) as totalRevenue
      FROM Transactions
      WHERE DATE(transaction_date) >= ? AND DATE(transaction_date) <= ?
        AND transaction_status = 'Completed'
    `, [startDate, endDate]);

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
        -- For memberships, some schemas may not have amount_paid; use transaction total
        SELECT 'Memberships' as source, SUM(t.total_price) as amount
        FROM Membership_Purchase mp
        JOIN Transactions t ON mp.transaction_id = t.transaction_id
        WHERE DATE(t.transaction_date) >= ? AND DATE(t.transaction_date) <= ?
          AND t.transaction_status = 'Completed'
      ) revenue_sources
      GROUP BY source
    `, [startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate]);

    // Get monthly trend (ONLY_FULL_GROUP_BY-safe)
    const [monthlyTrend] = await db.query(`
      SELECT 
        DATE_FORMAT(transaction_date, '%Y-%m') as period,
        DATE_FORMAT(MIN(transaction_date), '%b') as month,
        SUM(total_price) as revenue
      FROM Transactions
      WHERE DATE(transaction_date) >= DATE_SUB(DATE(?), INTERVAL 6 MONTH)
        AND DATE(transaction_date) <= DATE(?)
        AND transaction_status = 'Completed'
      GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
      ORDER BY DATE_FORMAT(transaction_date, '%Y-%m')
      LIMIT 6
    `, [endDate, endDate]);

    const totalRevenue = parseFloat(totalRevenueResult[0].totalRevenue) || 0;
    
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

// GET /api/reports/membership - Membership analytics report
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

export default router;