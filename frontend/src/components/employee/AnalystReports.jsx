// File: frontend/src/components/employee/AnalystReports.jsx

import React, { useState, useEffect } from 'react';
import { FaChartBar, FaCalendarAlt, FaDownload } from 'react-icons/fa';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import api from '../../services/api';
import './EmployeePortal.css';

function AnalystReports() {
  // Helper: format a Date as YYYY-MM-DD in local time (avoids UTC off-by-one)
  const toLocalDateString = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
  };

  // Helper: detect plain YYYY-MM-DD strings
  const isYMD = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

  // Helper: parse a date-like value into a local date at midnight (no UTC shift)
  const parseLocalDate = (value) => {
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    if (isYMD(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return new Date(NaN);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const [activeReport, setActiveReport] = useState('sales');
  const [dateRange, setDateRange] = useState({
    startDate: (() => { const d = new Date(); d.setDate(d.getDate() - 30); return toLocalDateString(d); })(),
    endDate: toLocalDateString(new Date())
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [granularity, setGranularity] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [errorMsg, setErrorMsg] = useState('');
  // Sales transactions UI state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txCategory, setTxCategory] = useState(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txList, setTxList] = useState([]);
  const [txError, setTxError] = useState('');
  const [txDetailView, setTxDetailView] = useState(false);
  const [selectedTxDetail, setSelectedTxDetail] = useState(null);
  const [txDetailLoading, setTxDetailLoading] = useState(false);
  // Membership-only revenue (from Revenue breakdown)
  const [membershipRevenue, setMembershipRevenue] = useState(0);

  const reportTypes = [
    { id: 'sales', label: 'Sales Analysis', icon: FaChartBar },
    { id: 'attendance', label: 'Visitor Attendance', icon: FaCalendarAlt },
    { id: 'popular-items', label: 'Popular Items', icon: FaChartBar },
    { id: 'revenue', label: 'Revenue Breakdown', icon: FaChartBar },
    { id: 'membership', label: 'Membership Analytics', icon: FaChartBar },
  ];

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const response = await api.get(`/api/reports/${activeReport}`, {
          params: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          }
        });
        
        // If viewing Membership analytics, also fetch revenue breakdown
        // and extract Memberships revenue for the selected date range.
        if (activeReport === 'membership') {
          try {
            const revResp = await api.get('/api/reports/revenue', {
              params: {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
              },
            });
            const breakdown = Array.isArray(revResp.data?.breakdown) ? revResp.data.breakdown : [];
            const mem = breakdown.find((b) => b.source === 'Memberships');
            setMembershipRevenue(Number(mem?.amount || 0));
          } catch (re) {
            console.error('Failed to load membership revenue:', re);
            setMembershipRevenue(0);
          }
        } else {
          // Reset to avoid stale numbers when switching tabs
          setMembershipRevenue(0);
        }
        
        // Set report data AFTER all fetches complete
        setReportData(response.data);
      } catch (error) {
        console.error('Error fetching report data:', error);
        setReportData(null);
        setErrorMsg(error?.response?.data?.error || 'Failed to load report data.');
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [activeReport, dateRange]);

  const openTransactionsModal = async (category) => {
    setTxError('');
    setTxDetailView(false);
    setSelectedTxDetail(null);
    setTxCategory(category);
    setTxLoading(true);
    setTxModalOpen(true);
    try {
      const resp = await api.get('/api/reports/sales/transactions', {
        params: {
          category,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      setTxList(Array.isArray(resp.data.transactions) ? resp.data.transactions : []);
    } catch (err) {
      console.error('Load transactions failed:', err);
      setTxError(err?.response?.data?.error || 'Failed to load transactions.');
      setTxList([]);
    } finally {
      setTxLoading(false);
    }
  };

  const viewTransactionDetail = async (id) => {
    setTxDetailLoading(true);
    setTxError('');
    setTxDetailView(true);
    try {
      const resp = await api.get(`/api/reports/sales/transaction/${id}`);
      setSelectedTxDetail(resp.data);
    } catch (err) {
      console.error('Load transaction detail failed:', err);
      setTxError(err?.response?.data?.error || 'Failed to load transaction detail.');
      setSelectedTxDetail(null);
      setTxDetailView(false);
    } finally {
      setTxDetailLoading(false);
    }
  };

  const backToTransactionList = () => {
    setTxDetailView(false);
    setSelectedTxDetail(null);
    setTxError('');
  };

  const exportReport = () => {
    // Implement CSV export functionality
    const csvContent = generateCSV(reportData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport}-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateCSV = (data) => {
    if (!data) return 'No data available';

    // Helper function to escape CSV values
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Helper function to format currency
    const formatCurrency = (value) => {
      return `$${Number(value || 0).toFixed(2)}`;
    };

    // Helper function to format date
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    let csvContent = '';
    
    // Add report header
    csvContent += `Report Type,${escapeCSV(activeReport.toUpperCase())}\n`;
    csvContent += `Date Range,${dateRange.startDate} to ${dateRange.endDate}\n`;
    csvContent += `Generated,${new Date().toLocaleString()}\n`;
    csvContent += '\n';

    // Generate CSV based on report type
    switch (activeReport) {
      case 'sales': {
        // Summary section
        csvContent += 'SUMMARY\n';
        csvContent += 'Metric,Value\n';
        csvContent += `Total Sales,${formatCurrency(data.totalSales)}\n`;
        csvContent += `Transaction Count,${data.transactionCount || 0}\n`;
        csvContent += `Average Order Value,${formatCurrency(data.averageOrderValue)}\n`;
        csvContent += '\n';

        // Category breakdown
        csvContent += 'CATEGORY BREAKDOWN\n';
        csvContent += 'Category,Sales Amount\n';
        if (data.categorySales && data.categorySales.length > 0) {
          data.categorySales.forEach(cat => {
            csvContent += `${escapeCSV(cat.category)},${formatCurrency(cat.value)}\n`;
          });
        }
        csvContent += '\n';

        // Daily sales trend
        csvContent += 'DAILY SALES TREND\n';
        csvContent += 'Date,Sales\n';
        if (data.dailySales && data.dailySales.length > 0) {
          data.dailySales.forEach(day => {
            csvContent += `${formatDate(day.date)},${formatCurrency(day.sales)}\n`;
          });
        }
        break;
      }

      case 'attendance': {
        // Summary section
        csvContent += 'SUMMARY\n';
        csvContent += 'Metric,Value\n';
        csvContent += `Total Visitors,${Number(data.totalVisitors || 0).toLocaleString()}\n`;
        csvContent += `Average Daily Visitors,${Number(data.averageVisitors || 0).toFixed(0)}\n`;
        csvContent += `Peak Day Visitors,${Number(data.peakDayVisitors || 0).toLocaleString()}\n`;
        csvContent += '\n';

        // Visitor type breakdown
        if (data.visitorTypes && data.visitorTypes.length > 0) {
          csvContent += 'VISITOR TYPE BREAKDOWN\n';
          csvContent += 'Visitor Type,Count,Percentage\n';
          data.visitorTypes.forEach(type => {
            csvContent += `${escapeCSV(type.type)},${Number(type.count || 0).toLocaleString()},${Number(type.percentage || 0).toFixed(1)}%\n`;
          });
          csvContent += '\n';
        }

        // Daily attendance
        csvContent += 'DAILY ATTENDANCE\n';
        csvContent += 'Date,Visitors\n';
        if (data.dailyAttendance && data.dailyAttendance.length > 0) {
          data.dailyAttendance.forEach(day => {
            csvContent += `${formatDate(day.date)},${Number(day.visitors || 0).toLocaleString()}\n`;
          });
        }
        break;
      }

      case 'popular-items': {
        // Top tickets
        if (data.topTickets && data.topTickets.length > 0) {
          csvContent += 'TOP TICKETS\n';
          csvContent += 'Ticket Type,Quantity Sold,Revenue\n';
          data.topTickets.forEach(ticket => {
            csvContent += `${escapeCSV(ticket.name)},${Number(ticket.quantity || 0).toLocaleString()},${formatCurrency(ticket.revenue)}\n`;
          });
          csvContent += '\n';
        }

        // Top gift shop items
        if (data.topGiftShopItems && data.topGiftShopItems.length > 0) {
          csvContent += 'TOP GIFT SHOP ITEMS\n';
          csvContent += 'Item Name,Quantity Sold,Revenue\n';
          data.topGiftShopItems.forEach(item => {
            csvContent += `${escapeCSV(item.name)},${Number(item.quantity || 0).toLocaleString()},${formatCurrency(item.revenue)}\n`;
          });
          csvContent += '\n';
        }

        // Top cafeteria items
        if (data.topCafeteriaItems && data.topCafeteriaItems.length > 0) {
          csvContent += 'TOP CAFETERIA ITEMS\n';
          csvContent += 'Item Name,Quantity Sold,Revenue\n';
          data.topCafeteriaItems.forEach(item => {
            csvContent += `${escapeCSV(item.name)},${Number(item.quantity || 0).toLocaleString()},${formatCurrency(item.revenue)}\n`;
          });
        }
        break;
      }

      case 'revenue': {
        // Summary section
        csvContent += 'SUMMARY\n';
        csvContent += 'Metric,Value\n';
        csvContent += `Total Revenue,${formatCurrency(data.totalRevenue)}\n`;
        csvContent += '\n';

        // Revenue breakdown by source
        if (data.breakdown && data.breakdown.length > 0) {
          csvContent += 'REVENUE BREAKDOWN BY SOURCE\n';
          csvContent += 'Source,Amount,Percentage\n';
          data.breakdown.forEach(source => {
            csvContent += `${escapeCSV(source.source)},${formatCurrency(source.amount)},${Number(source.percentage || 0).toFixed(1)}%\n`;
          });
          csvContent += '\n';
        }

        // Monthly revenue trend
        if (data.monthlyTrend && data.monthlyTrend.length > 0) {
          csvContent += 'MONTHLY REVENUE TREND\n';
          csvContent += 'Month,Revenue\n';
          data.monthlyTrend.forEach(month => {
            csvContent += `${escapeCSV(month.month)},${formatCurrency(month.revenue)}\n`;
          });
        }
        break;
      }

      case 'membership': {
        // Summary section
        csvContent += 'SUMMARY\n';
        csvContent += 'Metric,Value\n';
        csvContent += `Total Revenue,${formatCurrency(membershipRevenue)}\n`;
        csvContent += `Total Active Members,${Number(data.totalMembers || 0).toLocaleString()}\n`;
        csvContent += `New Members (${dateRange.startDate} to ${dateRange.endDate}),${Number(data.newMembersThisMonth || 0).toLocaleString()}\n`;
        csvContent += `Renewal Rate,${Number(data.renewalRate || 0).toFixed(1)}%\n`;
        csvContent += '\n';

        // Membership type distribution
        if (data.membershipTypes && data.membershipTypes.length > 0) {
          csvContent += 'MEMBERSHIP TYPE DISTRIBUTION\n';
          csvContent += 'Type,Count,Percentage\n';
          data.membershipTypes.forEach(type => {
            csvContent += `${escapeCSV(type.type)},${Number(type.count || 0).toLocaleString()},${Number(type.percentage || 0)}%\n`;
          });
          csvContent += '\n';
        }

        // Monthly growth
        if (data.monthlyGrowth && data.monthlyGrowth.length > 0) {
          csvContent += 'MONTHLY NEW VS RENEWALS\n';
          csvContent += 'Month,New Members,Renewals\n';
          data.monthlyGrowth.forEach(month => {
            csvContent += `${escapeCSV(month.month)},${Number(month.new || 0).toLocaleString()},${Number(month.renewals || 0).toLocaleString()}\n`;
          });
        }
        break;
      }

      default:
        csvContent += 'Report type not supported for CSV export\n';
    }

    return csvContent;
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Today (YYYY-MM-DD) for clamping
  const today = toLocalDateString(new Date());

  // Preset ranges for quick selection
  const applyPresetRange = (preset) => {
    const now = new Date();
    const end = today; // clamp to today
    const endDateObj = new Date(end);

    const format = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    let startStr = dateRange.startDate;
    let endStr = end;

    if (preset === 'last7') {
      const start = new Date(endDateObj);
      start.setDate(start.getDate() - 6); // inclusive 7 days
      startStr = format(start);
      endStr = end;
    } else if (preset === 'last30') {
      const start = new Date(endDateObj);
      start.setDate(start.getDate() - 29); // inclusive 30 days
      startStr = format(start);
      endStr = end;
    } else if (preset === 'thisMonth') {
      const start = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), 1);
      startStr = format(start);
      endStr = end;
    } else if (preset === 'lastMonth') {
      const start = new Date(endDateObj.getFullYear(), endDateObj.getMonth() - 1, 1);
      const endOfLastMonth = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), 0);
      startStr = format(start);
      endStr = format(endOfLastMonth);
    }

    setDateRange({ startDate: startStr, endDate: endStr });
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div style={{ padding: '3rem', textAlign: 'center', fontSize: '1.1rem', color: '#666' }}>
          Loading report...
        </div>
      );
    }

    if (errorMsg) {
      return (
        <div style={{ padding: '3rem', textAlign: 'center', fontSize: '1.1rem', color: '#d32f2f' }}>
          {errorMsg}
        </div>
      );
    }

    if (!reportData) {
      return (
        <div style={{ padding: '3rem', textAlign: 'center', fontSize: '1.1rem', color: '#666' }}>
          No data available
        </div>
      );
    }

    const selectedRangeLabel = `${dateRange.startDate} – ${dateRange.endDate}`;

    switch (activeReport) {
      case 'sales': {
        const totalSales = Number(reportData.totalSales || 0);
        const transactionCount = Number(reportData.transactionCount || 0);
        const averageOrderValue = Number(reportData.averageOrderValue || 0);
        const categorySales = (reportData.categorySales || []).map(c => ({
          category: c.category,
          value: Number(c.value) || 0,
        }));
        const totalCatSales = categorySales.reduce((sum, c) => sum + c.value, 0);

        const dailySales = (reportData.dailySales || []).map(d => ({
          date: d.date,
          sales: Number(d.sales) || 0,
        }));

        return (
          <div className="report-content">
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-label">Total Sales</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">${totalSales.toLocaleString()}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Average Sales</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">${averageOrderValue.toFixed(2)}</div>
              </div>
              <div className="metric-card category-split-card">
                <div className="metric-label">Category Split</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {categorySales.map((cat, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                      <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => openTransactionsModal(cat.category)}>
                        {cat.category}
                      </span>
                      <span style={{ fontWeight: 'bold' }}>${cat.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="chart-section">
              <h3>Daily Sales Trend</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  className={`toggle-btn ${granularity === 'daily' ? 'active' : ''}`}
                  onClick={() => setGranularity('daily')}
                >
                  Daily
                </button>
                <button
                  className={`toggle-btn ${granularity === 'weekly' ? 'active' : ''}`}
                  onClick={() => setGranularity('weekly')}
                >
                  Weekly
                </button>
                <button
                  className={`toggle-btn ${granularity === 'monthly' ? 'active' : ''}`}
                  onClick={() => setGranularity('monthly')}
                >
                  Monthly
                </button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sales" fill="#8884D8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }

      case 'attendance': {
        const totalVisitors = Number(reportData.totalVisitors || 0);
        const averageVisitors = Number(reportData.averageVisitors || 0);
        const peakDayVisitors = Number(reportData.peakDayVisitors || 0);
        const visitorTypes = (reportData.visitorTypes || []).map(v => ({
          type: v.type,
          count: Number(v.count) || 0,
          percentage: Number(v.percentage) || 0,
        }));
        const dailyAttendance = (reportData.dailyAttendance || []).map(d => ({
          date: d.date,
          visitors: Number(d.visitors) || 0,
        }));

        return (
          <div className="report-content">
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-label">Total Visitors</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">{totalVisitors.toLocaleString()}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Average Daily Visitors</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">{averageVisitors.toFixed(0)}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Peak Day Visitors</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">{peakDayVisitors.toLocaleString()}</div>
              </div>
            </div>

            <div className="chart-section">
              <h3>Visitor Type Breakdown</h3>
              {visitorTypes.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={visitorTypes}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="count"
                      label={({ payload }) => `${payload?.type ?? ''}: ${Number(payload?.count ?? 0).toLocaleString()} (${Number(payload?.percentage ?? 0).toFixed(1)}%)`}
                    >
                      {visitorTypes.map((entry, index) => (
                        <Cell key={`vt-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name, props) => [Number(val || 0).toLocaleString(), props?.payload?.type]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No visitor type data available</div>
              )}
            </div>

            <div className="chart-section">
              <h3>Daily Attendance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyAttendance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="visitors" stroke="#00C49F" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }

      case 'popular-items': {
        const topTickets = (reportData.topTickets || []).map(t => ({
          name: t.name,
          quantity: Number(t.quantity) || 0,
          revenue: Number(t.revenue) || 0,
        }));
        const topGiftShopItems = (reportData.topGiftShopItems || []).map(g => ({
          name: g.name,
          quantity: Number(g.quantity) || 0,
          revenue: Number(g.revenue) || 0,
        }));
        const topCafeteriaItems = (reportData.topCafeteriaItems || []).map(c => ({
          name: c.name,
          quantity: Number(c.quantity) || 0,
          revenue: Number(c.revenue) || 0,
        }));

        return (
          <div className="report-content">
            <div className="chart-section">
              <h3>Top Tickets</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topTickets} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#0088FE" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-section">
              <h3>Top Gift Shop Items</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topGiftShopItems} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#00C49F" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-section">
              <h3>Top Cafeteria Items</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCafeteriaItems} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#FFBB28" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }

      case 'revenue': {
        const totalRevenue = Number(reportData.totalRevenue || 0);
        const breakdown = (reportData.breakdown || []).map(b => ({
          source: b.source,
          amount: Number(b.amount) || 0,
          percentage: Number(b.percentage) || 0,
        }));
        const monthlyTrend = (reportData.monthlyTrend || []).map(m => ({
          month: m.month,
          revenue: Number(m.revenue) || 0,
        }));

        return (
          <div className="report-content">
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-label">Total Revenue</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">${totalRevenue.toLocaleString()}</div>
              </div>
            </div>

            <div className="chart-section">
              <h3>Revenue Breakdown by Source</h3>
              {breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={breakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="amount"
                      label={({ payload }) => `${payload?.source ?? ''}: $${Number(payload?.amount ?? 0).toLocaleString()} (${Number(payload?.percentage ?? 0)}%)`}
                    >
                      {breakdown.map((entry, index) => (
                        <Cell key={`rb-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name, props) => [`$${Number(val || 0).toLocaleString()}`, props?.payload?.source]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No breakdown data available</div>
              )}
            </div>

            <div className="chart-section">
              <h3>Monthly Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#0088FE" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }

      case 'membership': {
        const totalMembers = Number(reportData.totalMembers || 0);
        const newMembersThisMonth = Number(reportData.newMembersThisMonth || 0);
        const renewalRate = Number(reportData.renewalRate || 0);
        const membershipTypes = (reportData.membershipTypes || []).map(m => ({
          type: m.type,
          count: Number(m.count) || 0,
          percentage: Number(m.percentage) || 0,
        }));
        const monthlyGrowth = (reportData.monthlyGrowth || []).map(m => ({
          month: m.month,
          new: Number(m.new) || 0,
          renewals: Number(m.renewals) || 0,
        }));
        const monthlyGrowthSeries = monthlyGrowth.map(m => ({
          month: m.month,
          newMembers: m.new,
          renewals: m.renewals,
        }));
        return (
          <div className="report-content">
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-label">Total Revenue</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">${membershipRevenue.toLocaleString()}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Total Active Members</div>
                <div className="metric-value">{totalMembers.toLocaleString()}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">New Members</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">{newMembersThisMonth.toLocaleString()}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Renewal Rate</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">{renewalRate.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</div>
              </div>
            </div>

            <div className="chart-section">
              <h3>Membership Types</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={membershipTypes}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="count"
                    label={({ payload }) => `${payload?.type ?? ''}: ${Number(payload?.count ?? 0).toLocaleString()} (${Number(payload?.percentage ?? 0)}%)`}
                  >
                    {membershipTypes.map((entry, index) => (
                      <Cell key={`mt-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name, props) => [Number(val || 0).toLocaleString(), props?.payload?.type]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-section">
              <h3>Monthly New vs Renewals</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyGrowthSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="newMembers" name="New" fill="#00C49F" />
                  <Bar dataKey="renewals" name="Renewals" fill="#8884D8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }

      default:
        return <div>Select a report to view</div>;
    }
  };

  return (
    <div className="analyst-reports-container">
      <div className="reports-header">
        <h1>Analytics & Reports</h1>
        <div className="date-filter">
          <input 
            type="date" 
            value={dateRange.startDate}
            required
            max={dateRange.endDate && dateRange.endDate <= today ? dateRange.endDate : today}
            onChange={(e) => {
              const raw = e.target.value;
              const endBase = (dateRange.endDate && dateRange.endDate <= today) ? dateRange.endDate : today;
              // Fallback start = endBase - 30 days
              const endDateObj = new Date(endBase);
              const fallbackStartObj = new Date(endDateObj);
              fallbackStartObj.setDate(fallbackStartObj.getDate() - 30);
              const fallbackStart = toLocalDateString(fallbackStartObj);
              const newStart = raw && raw.length ? raw : fallbackStart;

              // Clamp end to today and ensure end >= start
              const clampedEnd = (dateRange.endDate && dateRange.endDate <= today) ? dateRange.endDate : today;
              const nextEnd = new Date(newStart) > new Date(clampedEnd) ? newStart : clampedEnd;
              setDateRange({ startDate: newStart, endDate: nextEnd });
            }}
          />
          <span>to</span>
          <input 
            type="date" 
            value={dateRange.endDate}
            required
            // Ensure min never exceeds max to avoid disabling all dates
            min={dateRange.startDate && dateRange.startDate <= today ? dateRange.startDate : today}
            max={today}
            onChange={(e) => {
              const raw = e.target.value;
              // Default end to today if cleared or future
              let newEnd = raw && raw.length ? raw : today;
              if (newEnd > today) newEnd = today;

              // Ensure start exists and <= end; default start to end - 30 days if missing
              let newStart = dateRange.startDate && dateRange.startDate.length ? dateRange.startDate : null;
              if (!newStart) {
                const endObj = new Date(newEnd);
                const startObj = new Date(endObj);
                startObj.setDate(startObj.getDate() - 30);
                newStart = toLocalDateString(startObj);
              }
              if (new Date(newStart) > new Date(newEnd)) newStart = newEnd;
              setDateRange({ startDate: newStart, endDate: newEnd });
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="toggle-btn" onClick={() => applyPresetRange('last7')}>Last 7 days</button>
            <button className="toggle-btn" onClick={() => applyPresetRange('last30')}>Last 30 days</button>
            <button className="toggle-btn" onClick={() => applyPresetRange('thisMonth')}>This month</button>
            <button className="toggle-btn" onClick={() => applyPresetRange('lastMonth')}>Last month</button>
          </div>
          <button onClick={exportReport} className="export-btn">
            <FaDownload /> Export
          </button>
        </div>
      </div>

      <div className="reports-layout">
        <div className="reports-sidebar">
          {reportTypes.map(report => (
            <button
              key={report.id}
              className={`report-nav-item ${activeReport === report.id ? 'active' : ''}`}
              onClick={() => setActiveReport(report.id)}
            >
              <report.icon />
              <span>{report.label}</span>
            </button>
          ))}
        </div>

        <div className="report-main">
          {renderReportContent()}
        </div>
      </div>

      {/* Transaction Modal */}
      {txModalOpen && (
        <div className="modal-overlay" onClick={() => setTxModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{txDetailView ? 'Transaction Detail' : `${txCategory} Transactions`}</h2>
              <button className="modal-close" onClick={() => setTxModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {txError && <div style={{ color: '#d32f2f', marginBottom: 16 }}>{txError}</div>}
              {txDetailView ? (
                txDetailLoading ? (
                  <div>Loading...</div>
                ) : selectedTxDetail ? (
                  <div>
                    <button onClick={backToTransactionList} style={{ marginBottom: 16 }}>← Back to list</button>
                    <div><strong>Transaction ID:</strong> {selectedTxDetail.id}</div>
                    <div><strong>Date:</strong> {new Date(selectedTxDetail.date).toLocaleString()}</div>
                    <div><strong>Total:</strong> ${Number(selectedTxDetail.total).toFixed(2)}</div>
                    <div><strong>Status:</strong> {selectedTxDetail.status}</div>
                    <h3 style={{ marginTop: 16 }}>Line Items</h3>
                    {selectedTxDetail.items && selectedTxDetail.items.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #ccc' }}>
                            <th style={{ padding: 8, textAlign: 'left' }}>Name</th>
                            <th style={{ padding: 8, textAlign: 'right' }}>Quantity</th>
                            <th style={{ padding: 8, textAlign: 'right' }}>Line Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTxDetail.items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: 8 }}>{item.name}</td>
                              <td style={{ padding: 8, textAlign: 'right' }}>{item.quantity}</td>
                              <td style={{ padding: 8, textAlign: 'right' }}>${Number(item.line_total || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div>No line items</div>
                    )}
                  </div>
                ) : (
                  <div>No detail available</div>
                )
              ) : (
                txLoading ? (
                  <div>Loading...</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #ccc' }}>
                        <th style={{ padding: 8, textAlign: 'left' }}>Transaction ID</th>
                        <th style={{ padding: 8, textAlign: 'left' }}>Date</th>
                        <th style={{ padding: 8, textAlign: 'right' }}>Total</th>
                        <th style={{ padding: 8 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {txList.length > 0 ? (
                        txList.map((tx) => (
                          <tr key={tx.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: 8 }}>{tx.id}</td>
                            <td style={{ padding: 8 }}>{new Date(tx.date).toLocaleString()}</td>
                            <td style={{ padding: 8, textAlign: 'right' }}>${Number(tx.total).toFixed(2)}</td>
                            <td style={{ padding: 8 }}>
                              <button onClick={() => viewTransactionDetail(tx.id)}>View Details</button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={{ padding: 16, textAlign: 'center', color: '#999' }}>
                            No transactions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalystReports;