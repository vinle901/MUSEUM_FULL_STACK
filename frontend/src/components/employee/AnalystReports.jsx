// File: src/components/employee/AnalystReports.jsx

import React, { useState, useEffect } from 'react';
import { FaChartBar, FaCalendarAlt, FaDownload } from 'react-icons/fa';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import api from '../../services/api';
import './EmployeePortal.css';

function AnalystReports() {
  const [activeReport, setActiveReport] = useState('sales');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [granularity, setGranularity] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [errorMsg, setErrorMsg] = useState('');

  const reportTypes = [
    { id: 'sales', label: 'Sales Analysis', icon: FaChartBar },
    { id: 'attendance', label: 'Visitor Attendance', icon: FaCalendarAlt },
    { id: 'popular-items', label: 'Popular Items', icon: FaChartBar },
    { id: 'revenue', label: 'Revenue Breakdown', icon: FaChartBar },
    { id: 'membership', label: 'Membership Analytics', icon: FaChartBar },
  ];

  useEffect(() => {
    fetchReportData();
  }, [activeReport, dateRange]);

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
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData(null);
      setErrorMsg(error?.response?.data?.error || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    // Implement CSV export functionality
    const csvContent = generateCSV(reportData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport}-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
  };

  const generateCSV = (data) => {
    // Simple CSV generation - would be more complex in real implementation
    return 'Report data would be exported here as CSV';
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Today (YYYY-MM-DD) for clamping
  const today = new Date().toISOString().split('T')[0];

  // Helpers for date formatting and aggregation
  const toDateOnlyString = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).split('T')[0] || String(value);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

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
        const dateObj = new Date(toDateOnlyString(d.date));
        const wkStart = startOfIsoWeek(dateObj);
        const key = toDateOnlyString(wkStart);
        const prev = map.get(key) || 0;
        map.set(key, prev + (Number(d.sales) || 0));
      });
      return Array.from(map.entries())
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([key, sum]) => ({ label: `Week of ${key}`, sales: sum }));
    }
    if (unit === 'monthly') {
      const map = new Map();
      dailySalesArr.forEach(d => {
        const dateObj = new Date(toDateOnlyString(d.date));
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

  const renderReportContent = () => {
    if (loading) return <div className="loading">Loading report data...</div>;
    if (errorMsg) return <div className="loading">{errorMsg}</div>;
    if (!reportData) return <div>No data available</div>;

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
        const groups = Math.max(1, series.length);
        const avgPerUnit = totalSalesNum / groups;
        const unitLabel = granularity === 'daily' ? 'Daily' : granularity === 'weekly' ? 'Weekly' : 'Monthly';

        // Prepare a compact category split
        const categoriesCompact = ['Tickets', 'Gift Shop', 'Cafeteria'].map(cat => {
          const match = categorySales.find(c => c.category === cat);
          return { label: cat, value: match ? match.value : 0 };
        });

        return (
          <div className="report-content">
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-label">Total Sales</div>
                <div className="metric-value">${totalSalesFmt}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Avg {unitLabel} Sales</div>
                <div className="metric-value">${avgPerUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Category Split</div>
                <div>
                  {categoriesCompact.map((c) => (
                    <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{c.label}</span>
                      <strong>${c.value.toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="granularity-toggle" style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
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

            <div className="chart-section">
              <h3>{unitLabel} Sales Trend</h3>
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
                <div className="metric-value">{Number(reportData.totalVisitors || 0).toLocaleString()}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Daily Average</div>
                <div className="metric-value">{Number(reportData.averageDailyVisitors || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Peak Day</div>
                <div className="metric-value">{reportData.peakDay}</div>
              </div>
            </div>

            <div className="granularity-toggle" style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
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

            <div className="chart-section">
              <h3>{attUnitLabel} Attendance</h3>
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
                <div className="metric-value">${totalRevenue.toLocaleString()}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Monthly Growth</div>
                <div className="metric-value">{monthlyGrowth.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</div>
              </div>
            </div>

            <div className="chart-section">
              <h3>Revenue Breakdown</h3>
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
                <div className="metric-label">Total Active Members</div>
                <div className="metric-value">{totalMembers.toLocaleString()}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">New This Month</div>
                <div className="metric-value">{newMembersThisMonth.toLocaleString()}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Renewal Rate</div>
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
              const fallbackStart = fallbackStartObj.toISOString().split('T')[0];
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
            min={dateRange.startDate}
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
                newStart = startObj.toISOString().split('T')[0];
              }
              if (new Date(newStart) > new Date(newEnd)) newStart = newEnd;
              setDateRange({ startDate: newStart, endDate: newEnd });
            }}
          />
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
    </div>
  );
}

export default AnalystReports;