// File: src/components/employee/AnalystReports.jsx

import React, { useState, useEffect } from 'react';
import { FaChartBar, FaCalendarAlt, FaDownload, FaFilter } from 'react-icons/fa';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
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
      // Use mock data for demonstration
      setReportData(generateMockData(activeReport));
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (reportType) => {
    switch (reportType) {
      case 'sales':
        return {
          totalSales: 145678.50,
          transactionCount: 892,
          averageOrderValue: 163.45,
          dailySales: [
            { date: 'Mon', sales: 12450 },
            { date: 'Tue', sales: 15680 },
            { date: 'Wed', sales: 18920 },
            { date: 'Thu', sales: 22100 },
            { date: 'Fri', sales: 28450 },
            { date: 'Sat', sales: 32100 },
            { date: 'Sun', sales: 15978 },
          ],
          categorySales: [
            { category: 'Tickets', value: 65000 },
            { category: 'Gift Shop', value: 35000 },
            { category: 'Cafeteria', value: 28000 },
            { category: 'Memberships', value: 17678.50 },
          ]
        };

      case 'attendance':
        return {
          totalVisitors: 8945,
          averageDailyVisitors: 298,
          peakDay: 'Saturday',
          dailyAttendance: [
            { date: '2024-01-01', visitors: 250 },
            { date: '2024-01-02', visitors: 280 },
            { date: '2024-01-03', visitors: 320 },
            { date: '2024-01-04', visitors: 290 },
            { date: '2024-01-05', visitors: 450 },
            { date: '2024-01-06', visitors: 520 },
            { date: '2024-01-07', visitors: 380 },
          ],
          hourlyDistribution: [
            { hour: '10AM', visitors: 50 },
            { hour: '11AM', visitors: 120 },
            { hour: '12PM', visitors: 180 },
            { hour: '1PM', visitors: 220 },
            { hour: '2PM', visitors: 280 },
            { hour: '3PM', visitors: 250 },
            { hour: '4PM', visitors: 180 },
            { hour: '5PM', visitors: 90 },
          ]
        };

      case 'popular-items':
        return {
          giftShop: [
            { name: 'Museum Tote Bag', sales: 245, revenue: 4900 },
            { name: 'Art Print Collection', sales: 189, revenue: 5670 },
            { name: 'Ceramic Mug', sales: 156, revenue: 2340 },
            { name: 'Postcard Set', sales: 420, revenue: 2100 },
            { name: 'Kids Activity Book', sales: 98, revenue: 980 },
          ],
          cafeteria: [
            { name: 'House Latte', sales: 892, revenue: 4682 },
            { name: 'Artisan Sandwich', sales: 456, revenue: 5244 },
            { name: 'Garden Salad', sales: 234, revenue: 2397 },
            { name: 'Chocolate Tart', sales: 189, revenue: 1228 },
            { name: 'Cold Brew', sales: 567, revenue: 2694 },
          ]
        };

      case 'revenue':
        return {
          totalRevenue: 145678.50,
          monthlyGrowth: 12.5,
          breakdown: [
            { source: 'Ticket Sales', amount: 65000, percentage: 44.6 },
            { source: 'Gift Shop', amount: 35000, percentage: 24.0 },
            { source: 'Cafeteria', amount: 28000, percentage: 19.2 },
            { source: 'Memberships', amount: 17678.50, percentage: 12.1 },
          ],
          monthlyTrend: [
            { month: 'Jan', revenue: 120000 },
            { month: 'Feb', revenue: 115000 },
            { month: 'Mar', revenue: 128000 },
            { month: 'Apr', revenue: 135000 },
            { month: 'May', revenue: 142000 },
            { month: 'Jun', revenue: 145678.50 },
          ]
        };

      case 'membership':
        return {
          totalMembers: 1234,
          newMembersThisMonth: 45,
          renewalRate: 78.5,
          membershipTypes: [
            { type: 'Basic', count: 567, percentage: 46 },
            { type: 'Premium', count: 345, percentage: 28 },
            { type: 'Student', count: 234, percentage: 19 },
            { type: 'Senior', count: 88, percentage: 7 },
          ],
          monthlyGrowth: [
            { month: 'Jan', new: 32, renewals: 45 },
            { month: 'Feb', new: 28, renewals: 52 },
            { month: 'Mar', new: 41, renewals: 48 },
            { month: 'Apr', new: 35, renewals: 61 },
            { month: 'May', new: 39, renewals: 55 },
            { month: 'Jun', new: 45, renewals: 58 },
          ]
        };

      default:
        return null;
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

  const renderReportContent = () => {
    if (loading) return <div className="loading">Loading report data...</div>;
    if (!reportData) return <div>No data available</div>;

    switch (activeReport) {
      case 'sales':
        return (
          <div className="report-content">
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-label">Total Sales</div>
                <div className="metric-value">${reportData.totalSales.toLocaleString()}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Transactions</div>
                <div className="metric-value">{reportData.transactionCount}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Average Order Value</div>
                <div className="metric-value">${reportData.averageOrderValue}</div>
              </div>
            </div>

            <div className="chart-section">
              <h3>Daily Sales Trend</h3>
              <BarChart width={800} height={300} data={reportData.dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#8884d8" />
              </BarChart>
            </div>

            <div className="chart-section">
              <h3>Sales by Category</h3>
              <PieChart width={400} height={300}>
                <Pie
                  data={reportData.categorySales}
                  cx={200}
                  cy={150}
                  labelLine={false}
                  label={(entry) => `${entry.category}: $${entry.value.toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {reportData.categorySales.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="report-content">
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-label">Total Visitors</div>
                <div className="metric-value">{reportData.totalVisitors.toLocaleString()}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Daily Average</div>
                <div className="metric-value">{reportData.averageDailyVisitors}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Peak Day</div>
                <div className="metric-value">{reportData.peakDay}</div>
              </div>
            </div>

            <div className="chart-section">
              <h3>Daily Attendance</h3>
              <LineChart width={800} height={300} data={reportData.dailyAttendance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="visitors" stroke="#8884d8" />
              </LineChart>
            </div>

            <div className="chart-section">
              <h3>Hourly Distribution</h3>
              <BarChart width={800} height={300} data={reportData.hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="visitors" fill="#00C49F" />
              </BarChart>
            </div>
          </div>
        );

      case 'popular-items':
        return (
          <div className="report-content">
            <div className="items-section">
              <h3>Top Gift Shop Items</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.giftShop.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.sales}</td>
                      <td>${item.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="items-section">
              <h3>Top Cafeteria Items</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.cafeteria.map((item, index) => (
                    <tr key={index}>
                      <td>{item.name}</td>
                      <td>{item.sales}</td>
                      <td>${item.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return <div>Select a report to view</div>;
    }
  };

  return (
    <div className="analyst-reports-container">
      <div className="reports-header">
        <h1>Analytics & Reports</h1>
        <div className="date-filter">
          <FaFilter />
          <input 
            type="date" 
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          />
          <span>to</span>
          <input 
            type="date" 
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
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