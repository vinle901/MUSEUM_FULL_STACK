// File: frontend/src/components/employee/AnalystReports.jsx
// Purpose: Enhanced analytics and reports system with schema-driven filters
// This is a COMPLETE file replacement - copy this entire file to your project

import React, { useState } from 'react';
import { FaChartBar, FaCalendarAlt, FaDownload, FaFilter, FaTable } from 'react-icons/fa';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell, 
  ComposedChart, 
  Area 
} from 'recharts';
import api from '../../services/api';
import './EmployeePortal.css';

function AnalystReports() {
  // ==================== HELPER FUNCTIONS ====================
  
  // Helper: format a Date as YYYY-MM-DD in local time
  const toLocalDateString = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
  };

  // ==================== STATE MANAGEMENT ====================
  
  // State for filters - cascading and dynamic based on schema
  const [reportType, setReportType] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: (() => { 
      const d = new Date(); 
      d.setDate(d.getDate() - 30); 
      return toLocalDateString(d); 
    })(),
    endDate: toLocalDateString(new Date())
  });
  
  // Enhanced filters based on database schema
  const [filters, setFilters] = useState({
    // Sales specific (from Transactions table)
    category: 'all',
    paymentMethod: 'all',
    transactionStatus: 'Completed',
    
    // Gift Shop specific (from Gift_Shop_Items table)
    giftShopCategory: 'all',
    
    // Cafeteria specific (from Cafeteria_Items table)
    cafeteriaCategory: 'all',
    dietaryFilter: 'all',
    
    // Donation specific (from Donation table)
    donationType: 'all',
    includeAnonymous: true,
    
    // Membership specific (from Membership table)
    membershipType: 'all',
    includeRenewals: true,
    
    // General
    granularity: 'daily',
    compareWithPrevious: false
  });

  // State for generated report
  const [reportData, setReportData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ==================== CONFIGURATION ====================
  
  // Report type definitions with descriptions
  const reportTypes = [
    { 
      id: 'sales', 
      label: 'Sales Analysis', 
      icon: FaChartBar, 
      description: 'Analyze sales by category, payment method, and time' 
    },
    { 
      id: 'attendance', 
      label: 'Visitor Attendance', 
      icon: FaCalendarAlt, 
      description: 'Track visitor patterns and ticket sales' 
    },
    { 
      id: 'popular-items', 
      label: 'Popular Items', 
      icon: FaChartBar, 
      description: 'View top-selling gift shop and cafeteria items' 
    },
    { 
      id: 'revenue', 
      label: 'Revenue Breakdown', 
      icon: FaChartBar, 
      description: 'Comprehensive revenue analysis by source' 
    },
    { 
      id: 'membership', 
      label: 'Membership Analytics', 
      icon: FaChartBar, 
      description: 'Track memberships, renewals, and retention' 
    },
    { 
      id: 'donations', 
      label: 'Donation Analytics', 
      icon: FaChartBar, 
      description: 'Analyze donations by type and donor patterns' 
    },
  ];

  // Color scheme - Teal/Emerald (replacing blue/purple)
  const COLORS = [
    '#14b8a6', // teal-500
    '#0d9488', // teal-600
    '#10b981', // emerald-500
    '#059669', // emerald-600
    '#06b6d4', // cyan-500
    '#0891b2', // cyan-600
    '#0e7490', // cyan-700
    '#047857'  // emerald-700
  ];

  // Dynamic options from database schema ENUMs
  const giftShopCategories = [
    'Posters', 'Books', 'Postcards', 'Jewelry', 
    'Souvenirs', 'Toys', 'Stationery', 'Other'
  ];
  
  const cafeteriaCategories = [
    'Hot Beverages', 'Cold Beverages', 'Sandwiches', 
    'Salads', 'Desserts', 'Snacks', 'Main Dishes'
  ];
  
  const donationTypes = [
    'General Fund', 'Exhibition Support', 'Education Programs', 
    'Artwork Acquisition', 'Building Maintenance', 'Other'
  ];
  
  const paymentMethods = [
    'Cash', 'Credit Card', 'Debit Card', 'Mobile Payment'
  ];
  
  const transactionStatuses = [
    'Completed', 'Pending', 'Cancelled', 'Refunded'
  ];

  // ==================== DATE HANDLING ====================
  
  // Handle quick date range selection
  const handleQuickDateRange = (range) => {
    const today = new Date();
    let start = new Date();
    
    switch(range) {
      case 'last7':
        start.setDate(today.getDate() - 7);
        break;
      case 'last30':
        start.setDate(today.getDate() - 30);
        break;
      case 'last90':
        start.setDate(today.getDate() - 90);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        setDateRange({
          startDate: toLocalDateString(start),
          endDate: toLocalDateString(endOfLastMonth)
        });
        return;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        return;
    }
    
    setDateRange({
      startDate: toLocalDateString(start),
      endDate: toLocalDateString(today)
    });
  };

  // Calculate date difference in days
  const calculateDateDiff = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  };

  // ==================== REPORT GENERATION ====================
  
  // Main function to generate report (only runs when user clicks button)
  const generateReport = async () => {
    if (!reportType) {
      setErrorMsg('Please select a report type');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setReportData(null);
    setComparisonData(null);
    setRawData([]);

    try {
      // Fetch current period data
      const response = await api.get(`/api/reports/${reportType}`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });

      setReportData(response.data);
      
      // If comparison is enabled, fetch previous period data
      if (filters.compareWithPrevious) {
        const daysDiff = calculateDateDiff(dateRange.startDate, dateRange.endDate);
        const prevEnd = new Date(dateRange.startDate);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - daysDiff);
        
        try {
          const prevResponse = await api.get(`/api/reports/${reportType}`, {
            params: {
              startDate: toLocalDateString(prevStart),
              endDate: toLocalDateString(prevEnd)
            }
          });
          setComparisonData(prevResponse.data);
        } catch (err) {
          console.error('Failed to load comparison data:', err);
        }
      }
      
      // Generate comprehensive raw data table
      const raw = generateRawDataTable(reportType, response.data);
      setRawData(raw);

    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData(null);
      setRawData([]);
      setErrorMsg(error?.response?.data?.error || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  // ==================== RAW DATA GENERATION ====================
  
  // Generate raw data table with contextual columns for each report type
  const generateRawDataTable = (type, data) => {
    switch(type) {
      case 'sales':
        if (data.dailySales) {
          return data.dailySales.map(d => ({
            Date: d.date,
            Sales: `$${Number(d.sales).toFixed(2)}`,
            'Day of Week': new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' })
          }));
        }
        return [];
      
      case 'attendance':
        if (data.dailyAttendance) {
          return data.dailyAttendance.map(d => ({
            Date: d.date,
            Visitors: d.visitors,
            'Day of Week': new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' }),
            'Percentage of Peak': data.peakDay?.visitors 
              ? `${((d.visitors / data.peakDay.visitors) * 100).toFixed(1)}%` 
              : 'N/A'
          }));
        }
        return [];
      
      case 'popular-items':
        if (data.topGiftShopItems) {
          return data.topGiftShopItems.map((item, idx) => ({
            Rank: idx + 1,
            Item: item.item_name,
            Category: item.category,
            'Units Sold': item.total_quantity,
            Revenue: `$${Number(item.total_revenue).toFixed(2)}`,
            'Avg Price': `$${(Number(item.total_revenue) / Number(item.total_quantity)).toFixed(2)}`
          }));
        }
        if (data.topCafeteriaItems) {
          return data.topCafeteriaItems.map((item, idx) => ({
            Rank: idx + 1,
            Item: item.item_name,
            Category: item.category,
            'Units Sold': item.total_quantity,
            Revenue: `$${Number(item.total_revenue).toFixed(2)}`,
            'Avg Price': `$${(Number(item.total_revenue) / Number(item.total_quantity)).toFixed(2)}`
          }));
        }
        return [];
      
      case 'revenue':
        if (data.breakdown) {
          return data.breakdown.map(b => ({
            Source: b.source,
            Amount: `$${Number(b.amount).toFixed(2)}`,
            Percentage: `${b.percentage}%`,
            'Percentage of Total': `${((Number(b.amount) / Number(data.totalRevenue)) * 100).toFixed(2)}%`
          }));
        }
        return [];
      
      case 'membership':
        if (data.signUps) {
          return data.signUps.map(m => ({
            'Member Name': `${m.first_name} ${m.last_name}`,
            Email: m.email,
            Phone: m.phone_number || 'N/A',
            'Membership Type': m.membership_type,
            'Purchase Date': new Date(m.purchased_at).toLocaleDateString(),
            Amount: `$${Number(m.line_total).toFixed(2)}`,
            'Renewal': m.is_renewal ? 'Yes' : 'No'
          }));
        }
        return [];
      
      case 'donations':
        if (data.dailySales) {
          const totalDonations = data.dailySales.reduce((sum, d) => sum + Number(d.sales), 0);
          return data.dailySales.map(d => ({
            Date: d.date,
            'Donation Amount': `$${Number(d.sales).toFixed(2)}`,
            '% of Total': totalDonations > 0 
              ? `${((Number(d.sales) / totalDonations) * 100).toFixed(2)}%` 
              : '0%',
            'Day of Week': new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' })
          }));
        }
        return [];
      
      default:
        return [];
    }
  };

  // ==================== CSV EXPORT ====================
  
  // Export raw data to CSV file
  const exportToCSV = () => {
    if (!rawData || rawData.length === 0) return;

    const headers = Object.keys(rawData[0]);
    const csvContent = [
      headers.join(','),
      ...rawData.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // ==================== COMPARISON METRICS ====================
  
  // Render comparison metric with % change vs previous period
  const renderComparisonMetric = (currentValue, previousValue) => {
    if (!comparisonData || previousValue === null || previousValue === undefined) return null;
    
    const current = Number(currentValue) || 0;
    const previous = Number(previousValue) || 0;
    const diff = current - previous;
    const percentChange = previous !== 0 ? ((diff / previous) * 100) : 0;
    const isPositive = diff >= 0;
    
    return (
      <div style={{ 
        marginTop: '0.5rem', 
        fontSize: '0.85rem', 
        color: isPositive ? '#059669' : '#dc2626',
        fontWeight: '600'
      }}>
        {isPositive ? '↑' : '↓'} {Math.abs(percentChange).toFixed(1)}% vs previous period
      </div>
    );
  };

  // ==================== VISUALIZATION RENDERERS ====================
  
  // Main visualization router based on report type
  const renderVisualization = () => {
    if (!reportData) return null;

    switch(reportType) {
      case 'sales':
        return renderSalesVisualization();
      case 'attendance':
        return renderAttendanceVisualization();
      case 'popular-items':
        return renderPopularItemsVisualization();
      case 'revenue':
        return renderRevenueVisualization();
      case 'membership':
        return renderMembershipVisualization();
      case 'donations':
        return renderDonationsVisualization();
      default:
        return null;
    }
  };

  // Sales Analysis Visualization
  const renderSalesVisualization = () => {
    const data = reportData;
    
    return (
      <div className="report-content">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Sales Analysis Report</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Period: {new Date(dateRange.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - {new Date(dateRange.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="report-summary" style={{ marginBottom: '2rem' }}>
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Total Sales</h3>
                <p className="summary-value" style={{ fontSize: '2rem', fontWeight: '700', margin: '0.5rem 0' }}>
                  ${Number(data.totalSales).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {renderComparisonMetric(data.totalSales, comparisonData?.totalSales)}
              </div>
              <FaChartBar size={32} style={{ opacity: 0.5 }} />
            </div>
            <span className="summary-period" style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              {data.transactionCount || 0} transactions
            </span>
          </div>
          
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Average Order Value</h3>
                <p className="summary-value" style={{ fontSize: '2rem', fontWeight: '700', margin: '0.5rem 0' }}>
                  ${Number(data.averageOrderValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {renderComparisonMetric(data.averageOrderValue, comparisonData?.averageOrderValue)}
              </div>
              <FaChartBar size={32} style={{ opacity: 0.5 }} />
            </div>
            <span className="summary-period" style={{ fontSize: '0.85rem', opacity: 0.9 }}>Per transaction</span>
          </div>
          
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Top Category</h3>
                <p className="summary-value" style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0.5rem 0' }}>
                  {data.categorySales && data.categorySales.length > 0 
                    ? data.categorySales.reduce((max, cat) => Number(cat.value) > Number(max.value) ? cat : max).category
                    : 'N/A'}
                </p>
              </div>
              <FaChartBar size={32} style={{ opacity: 0.5 }} />
            </div>
            <span className="summary-period" style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              {data.categorySales && data.categorySales.length > 0 
                ? `$${Number(data.categorySales.reduce((max, cat) => Number(cat.value) > Number(max.value) ? cat : max).value).toLocaleString()}`
                : 'No data'}
            </span>
          </div>
        </div>

        {/* Daily Sales Chart */}
        <div className="chart-container" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Daily Sales Trend</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={filters.granularity === 'daily' ? 'toggle-btn active' : 'toggle-btn'}
                onClick={() => setFilters({...filters, granularity: 'daily'})}
              >
                Daily
              </button>
              <button 
                className={filters.granularity === 'weekly' ? 'toggle-btn active' : 'toggle-btn'}
                onClick={() => setFilters({...filters, granularity: 'weekly'})}
              >
                Weekly
              </button>
              <button 
                className={filters.granularity === 'monthly' ? 'toggle-btn active' : 'toggle-btn'}
                onClick={() => setFilters({...filters, granularity: 'monthly'})}
              >
                Monthly
              </button>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data.dailySales || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value) => `$${Number(value).toFixed(2)}`}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="sales" fill="#14b8a6" name="Sales" radius={[8, 8, 0, 0]} />
              {data.dailySales && data.dailySales.length > 5 && (
                <Line type="monotone" dataKey="sales" stroke="#0d9488" strokeWidth={2} dot={false} name="Trend" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="chart-container">
            <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Sales by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.categorySales || []}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={100}
                  fill="#14b8a6"
                  dataKey="value"
                >
                  {(data.categorySales || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Category Details</h3>
            <table className="report-table" style={{ width: '100%', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {(data.categorySales || []).map((cat, idx) => {
                  const total = (data.categorySales || []).reduce((sum, c) => sum + Number(c.value), 0);
                  const percentage = total > 0 ? ((Number(cat.value) / total) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ 
                            width: '12px', 
                            height: '12px', 
                            borderRadius: '3px', 
                            background: COLORS[idx % COLORS.length] 
                          }}></div>
                          {cat.category}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>
                        ${Number(cat.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right' }}>{percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Attendance Visualization
  const renderAttendanceVisualization = () => {
    const data = reportData;
    
    return (
      <div className="report-content">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Visitor Attendance Report</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Period: {new Date(dateRange.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - {new Date(dateRange.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="report-summary" style={{ marginBottom: '2rem' }}>
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Total Visitors</h3>
              <p className="summary-value" style={{ fontSize: '2rem', fontWeight: '700', margin: '0.5rem 0' }}>
                {Number(data.totalVisitors || 0).toLocaleString()}
              </p>
              {renderComparisonMetric(data.totalVisitors, comparisonData?.totalVisitors)}
            </div>
            <span className="summary-period" style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              {dateRange.startDate} — {dateRange.endDate}
            </span>
          </div>
          
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Average Daily</h3>
              <p className="summary-value" style={{ fontSize: '2rem', fontWeight: '700', margin: '0.5rem 0' }}>
                {Number(data.averageDaily || 0).toLocaleString()}
              </p>
              {renderComparisonMetric(data.averageDaily, comparisonData?.averageDaily)}
            </div>
            <span className="summary-period" style={{ fontSize: '0.85rem', opacity: 0.9 }}>Per day average</span>
          </div>
          
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Peak Day</h3>
              <p className="summary-value" style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0.5rem 0' }}>
                {data.peakDay?.visitors || 0}
              </p>
            </div>
            <span className="summary-period" style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              {data.peakDay?.date ? new Date(data.peakDay.date).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>

        <div className="chart-container" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Daily Visitor Attendance</h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data.dailyAttendance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Legend />
              <Area type="monotone" dataKey="visitors" fill="#a7f3d0" stroke="#14b8a6" strokeWidth={2} name="Visitors" />
              <Line type="monotone" dataKey="visitors" stroke="#0d9488" strokeWidth={3} dot={{ fill: '#14b8a6', r: 4 }} name="Trend" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {data.ticketTypeDistribution && (
          <div className="chart-container" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Ticket Type Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.ticketTypeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="count" fill="#10b981" name="Tickets Sold" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  // Popular Items Visualization
  const renderPopularItemsVisualization = () => {
    const data = reportData;
    
    return (
      <div className="report-content">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Popular Items Report</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Period: {new Date(dateRange.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - {new Date(dateRange.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {data.topGiftShopItems && data.topGiftShopItems.length > 0 && (
          <div className="chart-container" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Top 10 Gift Shop Items</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.topGiftShopItems.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="item_name" type="category" width={180} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'total_quantity' ? value.toLocaleString() : `$${Number(value).toFixed(2)}`,
                    name === 'total_quantity' ? 'Units Sold' : 'Revenue'
                  ]}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="total_quantity" fill="#14b8a6" name="Units Sold" />
                <Bar dataKey="total_revenue" fill="#10b981" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.topCafeteriaItems && data.topCafeteriaItems.length > 0 && (
          <div className="chart-container" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Top 10 Cafeteria Items</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.topCafeteriaItems.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="item_name" type="category" width={180} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'total_quantity' ? value.toLocaleString() : `$${Number(value).toFixed(2)}`,
                    name === 'total_quantity' ? 'Units Sold' : 'Revenue'
                  ]}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="total_quantity" fill="#06b6d4" name="Units Sold" />
                <Bar dataKey="total_revenue" fill="#0891b2" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  // Revenue Visualization
  const renderRevenueVisualization = () => {
    const data = reportData;
    
    return (
      <div className="report-content">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Revenue Breakdown Report</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Period: {new Date(dateRange.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - {new Date(dateRange.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="report-summary" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Total Revenue</h3>
              <p className="summary-value" style={{ fontSize: '2.5rem', fontWeight: '700', margin: '0.5rem 0' }}>
                ${Number(data.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {renderComparisonMetric(data.totalRevenue, comparisonData?.totalRevenue)}
            </div>
          </div>
          
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Top Source</h3>
              <p className="summary-value" style={{ fontSize: '1.3rem', fontWeight: '700', margin: '0.5rem 0' }}>
                {data.breakdown && data.breakdown.length > 0
                  ? data.breakdown.reduce((max, src) => Number(src.amount) > Number(max.amount) ? src : max).source
                  : 'N/A'}
              </p>
              <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                {data.breakdown && data.breakdown.length > 0
                  ? `$${Number(data.breakdown.reduce((max, src) => Number(src.amount) > Number(max.amount) ? src : max).amount).toLocaleString()}`
                  : 'No data'}
              </span>
            </div>
          </div>
          
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Sources</h3>
              <p className="summary-value" style={{ fontSize: '2rem', fontWeight: '700', margin: '0.5rem 0' }}>
                {data.breakdown ? data.breakdown.length : 0}
              </p>
              <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Revenue streams</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="chart-container">
            <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Revenue by Source</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.breakdown || []}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ source, percentage }) => `${source}: ${percentage}%`}
                  outerRadius={100}
                  fill="#14b8a6"
                  dataKey="amount"
                >
                  {(data.breakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Revenue Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.breakdown || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="source" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={100} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => `$${Number(value).toFixed(2)}`}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="amount" fill="#10b981" name="Revenue" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // Membership Visualization
  const renderMembershipVisualization = () => {
    const data = reportData;
    
    return (
      <div className="report-content">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Membership Analytics Report</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Period: {new Date(dateRange.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - {new Date(dateRange.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="report-summary" style={{ marginBottom: '2rem' }}>
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>New Members</h3>
              <p className="summary-value" style={{ fontSize: '2rem', fontWeight: '700', margin: '0.5rem 0' }}>
                {data.newMemberships || 0}
              </p>
              {renderComparisonMetric(data.newMemberships, comparisonData?.newMemberships)}
            </div>
            <span className="summary-period" style={{ fontSize: '0.85rem', opacity: 0.9 }}>New sign-ups</span>
          </div>
          
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Renewals</h3>
              <p className="summary-value" style={{ fontSize: '2rem', fontWeight: '700', margin: '0.5rem 0' }}>
                {data.renewals || 0}
              </p>
              {renderComparisonMetric(data.renewals, comparisonData?.renewals)}
            </div>
            <span className="summary-period" style={{ fontSize: '0.85rem', opacity: 0.9 }}>Renewed memberships</span>
          </div>
          
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Active Members</h3>
              <p className="summary-value" style={{ fontSize: '2rem', fontWeight: '700', margin: '0.5rem 0' }}>
                {data.activeMembers || 0}
              </p>
            </div>
            <span className="summary-period" style={{ fontSize: '0.85rem', opacity: 0.9 }}>Current total</span>
          </div>
        </div>

        {data.membershipTypes && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="chart-container">
              <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Membership Types Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.membershipTypes}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ type, count }) => `${type}: ${count}`}
                    outerRadius={100}
                    fill="#14b8a6"
                    dataKey="count"
                  >
                    {data.membershipTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Membership Type Details</h3>
              <table className="report-table" style={{ width: '100%', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Type</th>
                    <th style={{ textAlign: 'right' }}>Count</th>
                    <th style={{ textAlign: 'right' }}>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.membershipTypes.map((type, idx) => {
                    const total = data.membershipTypes.reduce((sum, t) => sum + Number(t.count), 0);
                    const percentage = total > 0 ? ((Number(type.count) / total) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={idx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '3px', 
                              background: COLORS[idx % COLORS.length] 
                            }}></div>
                            {type.type}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{type.count}</td>
                        <td style={{ textAlign: 'right' }}>{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.dailySignups && (
          <div className="chart-container" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Daily Membership Sign-ups</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.dailySignups}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="signups" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 4 }} name="Sign-ups" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  // Donations Visualization
  const renderDonationsVisualization = () => {
    const data = reportData;
    
    return (
      <div className="report-content">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Donation Analytics Report</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Period: {new Date(dateRange.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - {new Date(dateRange.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="report-summary" style={{ marginBottom: '2rem' }}>
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Total Donations</h3>
              <p className="summary-value" style={{ fontSize: '2rem', fontWeight: '700', margin: '0.5rem 0' }}>
                ${Number(data.totalSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {renderComparisonMetric(data.totalSales, comparisonData?.totalSales)}
            </div>
            <span className="summary-period" style={{ fontSize: '0.85rem', opacity: 0.9 }}>Total donated</span>
          </div>
          
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Average Donation</h3>
              <p className="summary-value" style={{ fontSize: '2rem', fontWeight: '700', margin: '0.5rem 0' }}>
                ${Number(data.averageOrderValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {renderComparisonMetric(data.averageOrderValue, comparisonData?.averageOrderValue)}
            </div>
            <span className="summary-period" style={{ fontSize: '0.85rem', opacity: 0.9 }}>Per donation</span>
          </div>
          
          <div className="summary-card" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9 }}>Total Donors</h3>
              <p className="summary-value" style={{ fontSize: '2rem', fontWeight: '700', margin: '0.5rem 0' }}>
                {data.transactionCount || 0}
              </p>
              {data.anonymousCount !== undefined && (
                <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  ({data.anonymousCount} anonymous)
                </span>
              )}
            </div>
            <span className="summary-period" style={{ fontSize: '0.85rem', opacity: 0.9 }}>Unique donors</span>
          </div>
        </div>

        <div className="chart-container" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Daily Donation Trend</h3>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data.dailySales || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value) => `$${Number(value).toFixed(2)}`}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="sales" fill="#14b8a6" name="Donations" radius={[8, 8, 0, 0]} />
              {data.dailySales && data.dailySales.length > 5 && (
                <Line type="monotone" dataKey="sales" stroke="#0d9488" strokeWidth={2} dot={false} name="Trend" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="chart-container">
            <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Donations by Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.categorySales || []}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={100}
                  fill="#14b8a6"
                  dataKey="value"
                >
                  {(data.categorySales || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Donation Type Details</h3>
            <table className="report-table" style={{ width: '100%', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Type</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>% of Total</th>
                </tr>
              </thead>
              <tbody>
                {(data.categorySales || []).map((cat, idx) => {
                  const total = (data.categorySales || []).reduce((sum, c) => sum + Number(c.value), 0);
                  const percentage = total > 0 ? ((Number(cat.value) / total) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ 
                            width: '12px', 
                            height: '12px', 
                            borderRadius: '3px', 
                            background: COLORS[idx % COLORS.length] 
                          }}></div>
                          {cat.category}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '600' }}>
                        ${Number(cat.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right' }}>{percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==================== RAW DATA TABLE ====================
  
  // Render raw data table with export functionality
  const renderRawDataTable = () => {
    if (!rawData || rawData.length === 0) return null;

    const headers = Object.keys(rawData[0]);

    return (
      <div className="chart-container" style={{ marginTop: '2rem', background: '#f8fafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', color: '#0f172a' }}>
              <FaTable style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Raw Data Export
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Detailed data table with {rawData.length} records
            </p>
          </div>
          <button 
            className="toggle-btn" 
            onClick={exportToCSV}
            style={{ 
              background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
              color: 'white',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <FaDownload />
            Export to CSV
          </button>
        </div>
        
        <div style={{ 
          overflowX: 'auto', 
          maxHeight: '500px', 
          overflowY: 'auto',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          background: 'white'
        }}>
          <table className="report-table" style={{ width: '100%', fontSize: '0.9rem' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#14b8a6', zIndex: 1 }}>
              <tr>
                <th style={{ padding: '0.75rem', color: 'white', fontWeight: '600', textAlign: 'left', borderBottom: '2px solid #0d9488' }}>
                  #
                </th>
                {headers.map(header => (
                  <th key={header} style={{ padding: '0.75rem', color: 'white', fontWeight: '600', textAlign: 'left', borderBottom: '2px solid #0d9488' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawData.map((row, idx) => (
                <tr key={idx} style={{ 
                  background: idx % 2 === 0 ? 'white' : '#f8fafc',
                  transition: 'background 0.2s'
                }}>
                  <td style={{ padding: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                    {idx + 1}
                  </td>
                  {headers.map(header => (
                    <td key={header} style={{ padding: '0.75rem', color: '#0f172a' }}>
                      {row[header]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
              <strong style={{ color: '#0f172a' }}>{rawData.length}</strong> records displayed
            </span>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Report generated on {new Date().toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ==================== FILTER OPTIONS ====================
  
  // Render additional filters based on report type (cascading)
  const renderFilterOptions = () => {
    if (!reportType) return null;

    return (
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#0f172a' }}>
          3. Additional Filters
        </label>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Sales Specific Filters */}
          {reportType === 'sales' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                  style={{ 
                    width: '100%',
                    padding: '0.6rem', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white'
                  }}
                >
                  <option value="all">All Categories</option>
                  <option value="tickets">Tickets Only</option>
                  <option value="giftshop">Gift Shop Only</option>
                  <option value="cafeteria">Cafeteria Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                  Payment Method
                </label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters({...filters, paymentMethod: e.target.value})}
                  style={{ 
                    width: '100%',
                    padding: '0.6rem', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white'
                  }}
                >
                  <option value="all">All Methods</option>
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                  Transaction Status
                </label>
                <select
                  value={filters.transactionStatus}
                  onChange={(e) => setFilters({...filters, transactionStatus: e.target.value})}
                  style={{ 
                    width: '100%',
                    padding: '0.6rem', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white'
                  }}
                >
                  {transactionStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Donation Specific Filters */}
          {reportType === 'donations' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                  Donation Type
                </label>
                <select
                  value={filters.donationType}
                  onChange={(e) => setFilters({...filters, donationType: e.target.value})}
                  style={{ 
                    width: '100%',
                    padding: '0.6rem', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white'
                  }}
                >
                  <option value="all">All Types</option>
                  {donationTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filters.includeAnonymous}
                    onChange={(e) => setFilters({...filters, includeAnonymous: e.target.checked})}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.9rem', color: '#0f172a' }}>Include Anonymous Donations</span>
                </label>
              </div>
            </>
          )}

          {/* Popular Items Specific Filters */}
          {reportType === 'popular-items' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                  Item Source
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                  style={{ 
                    width: '100%',
                    padding: '0.6rem', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white'
                  }}
                >
                  <option value="all">Both Gift Shop & Cafeteria</option>
                  <option value="giftshop">Gift Shop Only</option>
                  <option value="cafeteria">Cafeteria Only</option>
                </select>
              </div>

              {filters.category !== 'cafeteria' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                    Gift Shop Category
                  </label>
                  <select
                    value={filters.giftShopCategory}
                    onChange={(e) => setFilters({...filters, giftShopCategory: e.target.value})}
                    style={{ 
                      width: '100%',
                      padding: '0.6rem', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      background: 'white'
                    }}
                  >
                    <option value="all">All Categories</option>
                    {giftShopCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {filters.category !== 'giftshop' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                      Cafeteria Category
                    </label>
                    <select
                      value={filters.cafeteriaCategory}
                      onChange={(e) => setFilters({...filters, cafeteriaCategory: e.target.value})}
                      style={{ 
                        width: '100%',
                        padding: '0.6rem', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: 'white'
                      }}
                    >
                      <option value="all">All Categories</option>
                      {cafeteriaCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                      Dietary Filter
                    </label>
                    <select
                      value={filters.dietaryFilter}
                      onChange={(e) => setFilters({...filters, dietaryFilter: e.target.value})}
                      style={{ 
                        width: '100%',
                        padding: '0.6rem', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: 'white'
                      }}
                    >
                      <option value="all">All Items</option>
                      <option value="vegetarian">Vegetarian Only</option>
                      <option value="vegan">Vegan Only</option>
                    </select>
                  </div>
                </>
              )}
            </>
          )}

          {/* Membership Specific Filters */}
          {reportType === 'membership' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                  Membership Type
                </label>
                <select
                  value={filters.membershipType}
                  onChange={(e) => setFilters({...filters, membershipType: e.target.value})}
                  style={{ 
                    width: '100%',
                    padding: '0.6rem', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white'
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="Basic">Basic</option>
                  <option value="Premium">Premium</option>
                  <option value="Family">Family</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filters.includeRenewals}
                    onChange={(e) => setFilters({...filters, includeRenewals: e.target.checked})}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.9rem', color: '#0f172a' }}>Include Renewals</span>
                </label>
              </div>
            </>
          )}

          {/* General: Compare with Previous Period */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filters.compareWithPrevious}
                onChange={(e) => setFilters({...filters, compareWithPrevious: e.target.checked})}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '500' }}>
                Compare with previous period
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                (Shows trend arrows and % changes)
              </span>
            </label>
          </div>
        </div>
      </div>
    );
  };

  // ==================== MAIN RENDER ====================
  
  return (
    <div className="reports-container" style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div className="reports-header" style={{ 
        background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        color: 'white'
      }}>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '700' }}>Analytics & Reports</h2>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
          Generate custom reports with advanced filters and data export
        </p>
      </div>

      {/* Filter Panel */}
      <div className="chart-container" style={{ marginBottom: '2rem', background: 'white', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #e2e8f0' }}>
          <FaFilter style={{ marginRight: '0.75rem', color: '#14b8a6', fontSize: '1.25rem' }} />
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>Report Configuration</h3>
        </div>

        {/* Step 1: Select Report Type */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>
            1. Select Report Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {reportTypes.map(type => (
              <button
                key={type.id}
                className={reportType === type.id ? 'toggle-btn active' : 'toggle-btn'}
                onClick={() => setReportType(type.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  padding: '1rem',
                  background: reportType === type.id ? 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' : 'white',
                  color: reportType === type.id ? 'white' : '#0f172a',
                  border: reportType === type.id ? 'none' : '2px solid #e2e8f0',
                  borderRadius: '12px',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <type.icon size={20} />
                  <span style={{ fontWeight: '600', fontSize: '1rem' }}>{type.label}</span>
                </div>
                <span style={{ 
                  fontSize: '0.85rem', 
                  opacity: reportType === type.id ? 0.9 : 0.6,
                  lineHeight: '1.4'
                }}>
                  {type.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Date Range */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>
            2. Select Date Range
          </label>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                style={{ 
                  padding: '0.6rem', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  background: 'white'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                style={{ 
                  padding: '0.6rem', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  background: 'white'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="toggle-btn" onClick={() => handleQuickDateRange('last7')}>Last 7 days</button>
              <button className="toggle-btn" onClick={() => handleQuickDateRange('last30')}>Last 30 days</button>
              <button className="toggle-btn" onClick={() => handleQuickDateRange('last90')}>Last 90 days</button>
              <button className="toggle-btn" onClick={() => handleQuickDateRange('thisMonth')}>This month</button>
              <button className="toggle-btn" onClick={() => handleQuickDateRange('lastMonth')}>Last month</button>
              <button className="toggle-btn" onClick={() => handleQuickDateRange('thisYear')}>This year</button>
            </div>
          </div>
        </div>

        {/* Step 3: Additional Filters */}
        {renderFilterOptions()}

        {/* Generate Button */}
        <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #e2e8f0' }}>
          <button
            onClick={generateReport}
            disabled={!reportType || loading}
            style={{
              background: reportType && !loading ? 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' : '#cbd5e1',
              color: 'white',
              padding: '1rem 3rem',
              fontSize: '1.1rem',
              fontWeight: '700',
              border: 'none',
              borderRadius: '12px',
              cursor: reportType && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              boxShadow: reportType && !loading ? '0 4px 12px rgba(20, 184, 166, 0.3)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            {loading ? (
              <>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  border: '3px solid white', 
                  borderTop: '3px solid transparent', 
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Generating Report...
              </>
            ) : (
              <>
                <FaChartBar />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div style={{ 
          background: '#fef2f2', 
          border: '2px solid #fecaca', 
          padding: '1rem 1.5rem', 
          borderRadius: '12px', 
          marginBottom: '2rem',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <span style={{ fontWeight: '500' }}>{errorMsg}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            border: '4px solid #e2e8f0', 
            borderTop: '4px solid #14b8a6', 
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Generating your report...</p>
        </div>
      )}

      {/* Report Visualization */}
      {!loading && reportData && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', border: '1px solid #e2e8f0' }}>
          {renderVisualization()}
          {renderRawDataTable()}
        </div>
      )}

      {/* Empty State */}
      {!loading && !reportData && !errorMsg && (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem', 
          color: '#64748b',
          background: 'white',
          borderRadius: '12px',
          border: '2px dashed #e2e8f0'
        }}>
          <FaChartBar size={64} style={{ color: '#14b8a6', marginBottom: '1.5rem', opacity: 0.5 }} />
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.5rem' }}>No Report Generated</h3>
          <p style={{ margin: 0, fontSize: '1rem' }}>
            Configure your filters above and click <strong>Generate Report</strong> to view analytics
          </p>
        </div>
      )}

      {/* Spinner Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AnalystReports;