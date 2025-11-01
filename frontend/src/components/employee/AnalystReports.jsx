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
      csvContent += `Average Group Size,${Number(data.averageGroupSize || 0).toFixed(0)}\n`;
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

  // Helpers for date formatting and aggregation
  const toDateOnlyString = (value) => {
    if (!value) return '';
    if (isYMD(value)) return value;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).split('T')[0] || String(value);
    return toLocalDateString(d);
  };

  const formatLongDate = (value) => {
    if (!value) return '';
    const d = parseLocalDate(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const selectedRangeLabel = `${formatLongDate(dateRange.startDate)} – ${formatLongDate(dateRange.endDate)}`;

  const startOfIsoWeek = (d) => {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7; // Mon=0..Sun=6
    const start = new Date(date);
    start.setDate(date.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const monthKey = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  };

  const aggregateSales = (dailySalesArr, unit) => {
    if (!Array.isArray(dailySalesArr)) return [];
    if (unit === 'daily') {
      return dailySalesArr.map(d => ({ label: toDateOnlyString(d.date), sales: Number(d.sales) || 0 }));
    }
    if (unit === 'weekly') {
      const map = new Map();
      dailySalesArr.forEach(d => {
        const dateObj = parseLocalDate(d.date);
        const wkStart = startOfIsoWeek(dateObj);
        const key = toDateOnlyString(wkStart);
        const prev = map.get(key) || 0;
        map.set(key, prev + (Number(d.sales) || 0));
      });
      return Array.from(map.entries())
        .sort((a, b) => parseLocalDate(a[0]) - parseLocalDate(b[0]))
        .map(([key, sum]) => ({ label: `Week of ${key}`, sales: sum }));
    }
    if (unit === 'monthly') {
      const map = new Map();
      dailySalesArr.forEach(d => {
        const dateObj = parseLocalDate(d.date);
        const key = monthKey(dateObj);
        const prev = map.get(key) || 0;
        map.set(key, prev + (Number(d.sales) || 0));
      });
      return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, sum]) => ({ label: key, sales: sum }));
    }
    return dailySalesArr.map(d => ({ label: toDateOnlyString(d.date), sales: Number(d.sales) || 0 }));
  };

  // Count total units in the selected date range for accurate averages
  const countUnitsInRange = (start, end, unit) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s) || Number.isNaN(e) || s > e) return 1;
    if (unit === 'daily') {
      const diffDays = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diffDays);
    }
    if (unit === 'weekly') {
      const startWeek = startOfIsoWeek(s);
      const endWeek = startOfIsoWeek(e);
      const diffWeeks = Math.floor((endWeek - startWeek) / (1000 * 60 * 60 * 24 * 7)) + 1;
      return Math.max(1, diffWeeks);
    }
    if (unit === 'monthly') {
      const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
      return Math.max(1, months);
    }
    return 1;
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
        // Normalize backend data: ensure date-only strings and numeric values
        const dailySales = (reportData.dailySales || []).map(d => ({
          date: (d.date || '').toString().split('T')[0],
          sales: Number(d.sales) || 0,
        }));
        const categorySales = (reportData.categorySales || [])
          .filter(c => ['Tickets', 'Gift Shop', 'Cafeteria'].includes(c.category))
          .map(c => ({ category: c.category, value: Number(c.value) || 0 }));
        const totalSalesNum = Number(reportData.totalSales || 0);
        const totalSalesFmt = totalSalesNum.toLocaleString();
        // Aggregate series by granularity and compute average per selected unit
        const series = aggregateSales(dailySales, granularity);
        // Avg should follow the selected date range only (independent of granularity): use daily units
        const dailyUnits = countUnitsInRange(dateRange.startDate, dateRange.endDate, 'daily');
        const avgPerUnit = totalSalesNum / dailyUnits;
        const unitLabel = granularity === 'daily' ? 'Daily' : granularity === 'weekly' ? 'Weekly' : 'Monthly';

        // Prepare a compact category split
        const categoriesCompact = ['Tickets', 'Gift Shop', 'Cafeteria'].map(cat => {
          const match = categorySales.find(c => c.category === cat);
          return { label: cat, value: match ? match.value : 0 };
        });
        // Categories available for transaction listing (exclude Memberships)
        const categoriesForTransactions = ['Tickets', 'Gift Shop', 'Cafeteria'];

        return (
          <div className="report-content">
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-label">Total Sales</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom  : 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">${totalSalesFmt}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Average Sales</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">${avgPerUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
              <div className="metric-card">
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
              <h3>{unitLabel} Sales Trend</h3>
              <div className="granularity-toggle">
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
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sales" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-section">
              <h3>Sales by Category</h3>
              <div className="text-sm" style={{ color: '#555', marginTop: -10, marginBottom: 10 }}>{selectedRangeLabel}</div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categorySales}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.category}: $${(entry.value || 0).toLocaleString()}`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categorySales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `$${Number(val || 0).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }

      case 'attendance':
        // Normalize and aggregate attendance data with selectable granularity
        const dailyAttendanceRaw = (reportData.dailyAttendance || []).map(d => ({
          date: (d.date || '').toString().split('T')[0],
          sales: Number(d.visitors) || 0, // reuse aggregateSales by mapping visitors->sales
        }));
        const attSeries = aggregateSales(dailyAttendanceRaw, granularity);
        const attUnitLabel = granularity === 'daily' ? 'Daily' : granularity === 'weekly' ? 'Weekly' : 'Monthly';
        const ticketTypeData = (reportData.ticketTypeBreakdown || []).map(x => ({
          type: x.type,
          visitors: Number(x.visitors) || 0,
        }));

        return (
          <div className="report-content">
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-label">Total Visitors</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">{Number(reportData.totalVisitors || 0).toLocaleString()}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Daily Average</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">{Number(reportData.averageDailyVisitors || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Average Group Size</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>{selectedRangeLabel}</div>
                <div className="metric-value">{Math.round(Number(reportData.averageGroupSize || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
            </div>

            <div className="chart-section">
              <h3>{attUnitLabel} Attendance</h3>
              <div className="text-sm" style={{ color: '#555', marginTop: -10, marginBottom: 10 }}>{selectedRangeLabel}</div>
              
              <div className="granularity-toggle" style={{ display: 'flex', gap: 10, margin: '15px 0' }}>
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
                <LineChart data={attSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sales" name="Visitors" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-section">
              <h3>Ticket Type Breakdown</h3>
              <div className="text-sm" style={{ color: '#555', marginTop: -10, marginBottom: 10 }}>{selectedRangeLabel}</div>
              {ticketTypeData.length === 0 ? (
                <div className="no-items">No ticket data to display</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={ticketTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      dataKey="visitors"
                      nameKey="type"
                      label={(e) => `${e.type}: ${Number(e.visitors || 0).toLocaleString()}`}
                    >
                      {ticketTypeData.map((entry, index) => (
                        <Cell key={`tt-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name, props) => [Number(val || 0).toLocaleString(), props?.payload?.type]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        );

      case 'popular-items':
        {
          const giftShop = Array.isArray(reportData.giftShop) ? reportData.giftShop : [];
          const cafeteria = Array.isArray(reportData.cafeteria) ? reportData.cafeteria : [];
          return (
            <div className="report-content">

              <div className="items-section">
                <h3>Top Gift Shop Items</h3>
                {giftShop.length === 0 ? (
                  <div className="no-items">No items to display</div>
                ) : (
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Units Sold</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {giftShop.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td>{Number(item.sales || 0).toLocaleString()}</td>
                          <td>${Number(item.revenue || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="items-section">
                <h3>Top Cafeteria Items</h3>
                {cafeteria.length === 0 ? (
                  <div className="no-items">No items to display</div>
                ) : (
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Units Sold</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cafeteria.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td>{Number(item.sales || 0).toLocaleString()}</td>
                          <td>${Number(item.revenue || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        }

      case 'revenue': {
        const totalRevenue = Number(reportData.totalRevenue || 0);
        const monthlyGrowth = Number(reportData.monthlyGrowth || 0);
        // Defensive: ensure breakdown is a valid array of objects with source and amount
        let breakdown = Array.isArray(reportData.breakdown) ? reportData.breakdown : [];
        breakdown = breakdown
          .map(b => ({
            source: b?.source ?? '',
            amount: Number(b?.amount) || 0,
            percentage: Number(b?.percentage) || 0,
          }))
          .filter(b => b.source && !isNaN(b.amount));
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
              <div className="metric-card">
                <div className="metric-label">Monthly Growth</div>
                <div className="metric-value">{monthlyGrowth.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</div>
              </div>
            </div>

            <div className="chart-section">
              <h3>Revenue Breakdown</h3>
              {breakdown.length === 0 ? (
                <div className="no-items">No revenue breakdown data to display</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={breakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(e) => `${e.source}: $${e.amount.toLocaleString()} (${e.percentage}%)`}
                      outerRadius={100}
                      dataKey="amount"
                    >
                      {breakdown.map((entry, index) => (
                        <Cell key={`rbd-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name, props) => [`$${Number(val || 0).toLocaleString()}`, props.payload.source]} />
                  </PieChart>
                </ResponsiveContainer>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '24px' }}>
          <div style={{ background: '#fff', width: 'min(840px, 90vw)', maxHeight: 'calc(100vh - 48px)', overflow: 'auto', borderRadius: 10, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
            {!txDetailView ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ margin: 0 }}>{txCategory || 'Transactions'}</h3>
                  <button className="toggle-btn" onClick={() => { setTxModalOpen(false); setTxList([]); setSelectedTxDetail(null); setTxDetailView(false); }}>Close</button>
                </div>
                <div className="text-sm" style={{ color: '#555', marginBottom: 10 }}>{selectedRangeLabel}</div>
                {txError && <div className="loading">{txError}</div>}
                {txLoading ? (
                  <div className="loading">Loading transactions...</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="report-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Date</th>
                          <th>Total</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txList.length === 0 ? (
                          <tr><td colSpan={4} style={{ textAlign: 'center' }}>No transactions</td></tr>
                        ) : txList
                          // Filter transactions by UTC date portion
                          .filter((t) => {
                            const utcDateStr = typeof t.date === 'string' ? t.date.split('T')[0] : '';
                            return utcDateStr >= dateRange.startDate && utcDateStr <= dateRange.endDate;
                          })
                          .map((t) => {
                            const utcDateStr = typeof t.date === 'string' ? t.date.split('T')[0] : '';
                            // Calculate subtotals for each category
                            const ticketsSubtotal = t.tickets ? t.tickets.reduce((sum, item) => sum + Number(item.line_total || 0), 0) : 0;
                            const giftShopSubtotal = t.giftShop ? t.giftShop.reduce((sum, item) => sum + Number(item.line_total || 0), 0) : 0;
                            const cafeteriaSubtotal = t.cafeteria ? t.cafeteria.reduce((sum, item) => sum + Number(item.line_total || 0), 0) : 0;
                            const totalSubtotal = ticketsSubtotal + giftShopSubtotal + cafeteriaSubtotal;
                            const tax = Math.max(0, Number(t.total || 0) - totalSubtotal);
                            let categorySubtotal = 0;
                            if (txCategory?.toLowerCase() === 'tickets') categorySubtotal = ticketsSubtotal;
                            else if (txCategory?.toLowerCase() === 'gift shop') categorySubtotal = giftShopSubtotal;
                            else if (txCategory?.toLowerCase() === 'cafeteria') categorySubtotal = cafeteriaSubtotal;
                            // Proportional tax for this category
                            const categoryTax = totalSubtotal > 0 ? (categorySubtotal / totalSubtotal) * tax : 0;
                            const categoryTotal = categorySubtotal + categoryTax;
                            return (
                              <tr key={t.id}>
                                <td>{t.id}</td>
                                <td>{utcDateStr}</td>
                                <td>${categoryTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button className="toggle-btn" onClick={() => viewTransactionDetail(t.id)}>View details</button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <button className="toggle-btn" onClick={backToTransactionList}>← Back to list</button>
                  <button className="toggle-btn" onClick={() => { setTxModalOpen(false); setTxList([]); setSelectedTxDetail(null); setTxDetailView(false); }}>Close</button>
                </div>
                {txDetailLoading ? (
                  <div className="loading">Loading details...</div>
                ) : selectedTxDetail ? (
                  <div style={{ padding: 12 }}>
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ margin: '0 0 8px' }}>Transaction #{selectedTxDetail.transaction?.id}</h3>
                      <div style={{ fontSize: 14, color: '#666' }}>
                        <span>{formatLongDate(selectedTxDetail.transaction?.date)}</span>
                        <span style={{ marginLeft: 16 }}>Status: <strong>{selectedTxDetail.transaction?.status}</strong></span>
                      </div>
                    </div>

                    {txError && <div className="loading">{txError}</div>}

                    <table className="report-table" style={{ fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Item</th>
                          <th style={{ textAlign: 'right' }}>Qty</th>
                          <th style={{ textAlign: 'right' }}>Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txCategory?.toLowerCase() === 'tickets' && selectedTxDetail.items?.tickets?.map((item, idx) => (
                          <tr key={`tk-${idx}`}>
                            <td>Ticket</td>
                            <td>{item.name}</td>
                            <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right' }}>${Number(item.line_total || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                        {txCategory?.toLowerCase() === 'gift shop' && selectedTxDetail.items?.giftShop?.map((item, idx) => (
                          <tr key={`gs-${idx}`}>
                            <td>Gift Shop</td>
                            <td>{item.name}</td>
                            <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right' }}>${Number(item.line_total || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                        {txCategory?.toLowerCase() === 'cafeteria' && selectedTxDetail.items?.cafeteria?.map((item, idx) => (
                          <tr key={`cf-${idx}`}>
                            <td>Cafeteria</td>
                            <td>{item.name}</td>
                            <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                            <td style={{ textAlign: 'right' }}>${Number(item.line_total || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                        {txCategory?.toLowerCase() === 'memberships' && selectedTxDetail.items?.memberships?.map((item, idx) => (
                          <tr key={`mb-${idx}`}>
                            <td>Membership</td>
                            <td>Membership #{item.membership_id} ({item.is_renewal ? 'Renewal' : 'New'})</td>
                            <td style={{ textAlign: 'right' }}>1</td>
                            <td style={{ textAlign: 'right' }}>—</td>
                          </tr>
                        ))}
                        {(!selectedTxDetail.items?.tickets?.length && 
                          !selectedTxDetail.items?.giftShop?.length && 
                          !selectedTxDetail.items?.cafeteria?.length && 
                          !selectedTxDetail.items?.memberships?.length) && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', color: '#999' }}>No items found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    <div style={{ marginTop: 16, textAlign: 'right', fontSize: 16, fontWeight: 'bold' }}>
                      {/* Show category-specific total */}
                      {txCategory?.toLowerCase() === 'tickets' && (
                        <>Total: ${
                          selectedTxDetail.items?.tickets?.reduce((sum, item) => sum + Number(item.line_total || 0), 0)
                            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        }</>
                      )}
                      {txCategory?.toLowerCase() === 'gift shop' && (
                        <>Total: ${
                          selectedTxDetail.items?.giftShop?.reduce((sum, item) => sum + Number(item.line_total || 0), 0)
                            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        }</>
                      )}
                      {txCategory?.toLowerCase() === 'cafeteria' && (
                        <>Total: ${
                          selectedTxDetail.items?.cafeteria?.reduce((sum, item) => sum + Number(item.line_total || 0), 0)
                            .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        }</>
                      )}
                      {txCategory?.toLowerCase() === 'memberships' && (
                        <>Total: —</>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="loading">No details available</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalystReports;