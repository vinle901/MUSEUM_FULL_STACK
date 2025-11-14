// File: frontend/src/components/employee/AnalystReports.jsx

import React, { useState, useEffect } from 'react';
import { FaChartBar, FaDownload, FaFilter, FaTable, FaUsers, FaShoppingCart, FaTicketAlt } from 'react-icons/fa';
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
  Cell, 
  ComposedChart,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend
} from 'recharts';
import api from '../../services/api';
import './EmployeePortal.css';

const COLORS = [
  '#149ab8', '#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', 
  '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
];

function AnalystReports() {
  // ==================== HELPER FUNCTIONS ====================
  
  const toLocalDateString = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    // Extract date part from datetime strings (handles "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss")
    const datePart = dateStr.split('T')[0].split(' ')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    
    // Validate the parsed values
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return 'N/A';
    }
    
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  };

  // Check if two date ranges overlap
  const dateRangesOverlap = (start1, end1, start2, end2) => {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);
    return s1 <= e2 && s2 <= e1;
  };

  // ==================== STATE MANAGEMENT ====================
  
  const [reportType, setReportType] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: (() => { 
      const d = new Date(); 
      d.setDate(d.getDate() - 30); 
      return toLocalDateString(d); 
    })(),
    endDate: toLocalDateString(new Date())
  });
  
  const [comparisonDateRange, setComparisonDateRange] = useState({
    startDate: (() => { 
      const d = new Date(); 
      d.setDate(d.getDate() - 61); 
      return toLocalDateString(d); 
    })(),
    endDate: (() => { 
      const d = new Date(); 
      d.setDate(d.getDate() - 31); 
      return toLocalDateString(d); 
    })()
  });
  
  const [filters, setFilters] = useState({
    category: 'all',
    ticketType: 'all',
    giftShopCategory: 'all',
    cafeteriaCategory: 'all',
    dietaryFilter: 'all',
    topK: '0',
    membershipType: 'all',
    paymentMethod: 'all',
    enableComparison: false
  });

  const [reportData, setReportData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [comparisonRawData, setComparisonRawData] = useState([]);
  const [activeVisualizationTab, setActiveVisualizationTab] = useState('primary');
  const [activeRawDataTab, setActiveRawDataTab] = useState('primary');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Save the actual date ranges used when report was generated
  const [generatedDateRange, setGeneratedDateRange] = useState(null);
  const [generatedComparisonDateRange, setGeneratedComparisonDateRange] = useState(null);
  const [generatedFilters, setGeneratedFilters] = useState(null);

  // ==================== CLEAR DATA ON REPORT TYPE CHANGE ====================
  
  useEffect(() => {
    // Clear all data when report type changes to prevent stale data/bugs
    setReportData(null);
    setComparisonData(null);
    setRawData([]);
    setComparisonRawData([]);
    setErrorMsg('');
    setActiveVisualizationTab('primary');
    setActiveRawDataTab('primary');
  }, [reportType]);

  // ==================== CONFIGURATION ====================
  
  const reportTypes = [
    { 
      id: 'sales', 
      label: 'Sales Analysis', 
      icon: FaShoppingCart, 
      description: 'Comprehensive sales analysis with category filtering and popular items' 
    },
    { 
      id: 'attendance', 
      label: 'Visitor Attendance', 
      icon: FaUsers, 
      description: 'Track visitor patterns and ticket sales' 
    },
    { 
      id: 'membership', 
      label: 'Membership Analytics', 
      icon: FaTicketAlt, 
      description: 'Track memberships, renewals, and retention' 
    },
  ];

  const giftShopCategories = [
    'Posters', 'Books', 'Postcards', 'Jewelry', 
    'Souvenirs', 'Toys', 'Stationery', 'Other'
  ];
  
  const cafeteriaCategories = [
    'Hot Beverages', 'Cold Beverages', 'Sandwiches', 
    'Salads', 'Desserts', 'Snacks', 'Main Dishes'
  ];

  const ticketTypes = [
    'Adults', 'Children (6-13)', 'Students (with ID)', 
    'Seniors (65+)', 'Members'
  ];

  const membershipTypes = [
    'Individual', 'Dual', 'Family', 'Student', 'Senior', 'Patron'
  ];

  const paymentMethods = [
    'Cash', 'Credit Card', 'Debit Card', 'Mobile Payment'
  ];

  // ==================== DATE HANDLING ====================
  
  const handleQuickDateRange = (range, isComparison = false) => {
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
        // Calculate last month's range (handles year boundary)
        const lastMonthIndex = today.getMonth() - 1;
        const lastMonthYear = lastMonthIndex < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const adjustedMonthIndex = lastMonthIndex < 0 ? 11 : lastMonthIndex;
        
        start = new Date(lastMonthYear, adjustedMonthIndex, 1);
        // Get last day of last month: day 0 of the following month
        const endOfLastMonth = new Date(lastMonthYear, adjustedMonthIndex + 1, 0);
        
        if (isComparison) {
          setComparisonDateRange({
            startDate: toLocalDateString(start),
            endDate: toLocalDateString(endOfLastMonth)
          });
        } else {
          setDateRange({
            startDate: toLocalDateString(start),
            endDate: toLocalDateString(endOfLastMonth)
          });
        }
        return;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        return;
    }
    
    if (isComparison) {
      setComparisonDateRange({
        startDate: toLocalDateString(start),
        endDate: toLocalDateString(today)
      });
    } else {
      setDateRange({
        startDate: toLocalDateString(start),
        endDate: toLocalDateString(today)
      });
    }
  };

  // ==================== REPORT GENERATION ====================
  
  const generateReport = async () => {
    if (!reportType) {
      setErrorMsg('Please select a report type');
      return;
    }

    // Validate comparison date ranges don't overlap
    if (filters.enableComparison) {
      if (dateRangesOverlap(
        dateRange.startDate, 
        dateRange.endDate, 
        comparisonDateRange.startDate, 
        comparisonDateRange.endDate
      )) {
        setErrorMsg('Primary and comparison date ranges cannot overlap. Please adjust the dates.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');
    setReportData(null);
    setComparisonData(null);
    setRawData([]);
    setComparisonRawData([]);
    setActiveVisualizationTab('primary');
    
    // Save the date ranges and filters being used for this report generation
    setGeneratedDateRange({ ...dateRange });
    setGeneratedComparisonDateRange({ ...comparisonDateRange });
    setGeneratedFilters({ ...filters });

    try {
      let params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };

      // Add filters based on report type
      if (reportType === 'sales') {
        params.category = filters.category;
        params.paymentMethod = filters.paymentMethod;
        params.topK = filters.topK;
        
        if (filters.category === 'tickets') {
          params.ticketType = filters.ticketType;
        } else if (filters.category === 'giftshop') {
          params.giftShopCategory = filters.giftShopCategory;
        } else if (filters.category === 'cafeteria') {
          params.cafeteriaCategory = filters.cafeteriaCategory;
          params.dietaryFilter = filters.dietaryFilter;
        }
      } else if (reportType === 'attendance') {
        params.ticketType = filters.ticketType;
      } else if (reportType === 'membership') {
        params.membershipType = filters.membershipType;
      }

      const response = await api.get(`/api/reports/${reportType}`, { params });
      setReportData(response.data);
      
      // Get raw data
      const rawResponse = await api.get(`/api/reports/${reportType}/raw-data`, { params });
      setRawData(rawResponse.data.data || []);

      // Load comparison data if enabled
      if (filters.enableComparison) {
        try {
          const compParams = {
            ...params,
            startDate: comparisonDateRange.startDate,
            endDate: comparisonDateRange.endDate
          };
          
          const compResponse = await api.get(`/api/reports/${reportType}`, { params: compParams });
          setComparisonData(compResponse.data);

          // Get comparison raw data
          const compRawResponse = await api.get(`/api/reports/${reportType}/raw-data`, { params: compParams });
          setComparisonRawData(compRawResponse.data.data || []);
        } catch (err) {
          console.error('Failed to load comparison data:', err);
          setErrorMsg('Warning: Failed to load comparison data. Showing primary data only.');
        }
      }

    } catch (error) {
      console.error('Report generation error:', error);
      setErrorMsg(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // ==================== FILTER OPTIONS RENDERING ====================
  
  const renderFilterOptions = () => {
    if (!reportType) return null;

    return (
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>
          3. Additional Filters
        </label>

        {reportType === 'sales' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {/* Category Selection */}
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

            {/* Dynamic Sub-category Filters */}
            {filters.category === 'tickets' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                  Ticket Type
                </label>
                <select
                  value={filters.ticketType}
                  onChange={(e) => setFilters({...filters, ticketType: e.target.value})}
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
                  {ticketTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            )}

            {filters.category === 'giftshop' && (
              <>
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
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                    Top Items to Show (0 = hide chart)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={filters.topK}
                    onChange={(e) => setFilters({...filters, topK: e.target.value})}
                    style={{ 
                      width: '100%',
                      padding: '0.6rem', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      background: 'white'
                    }}
                    placeholder="0 = hide, 5-20 recommended"
                  />
                </div>
              </>
            )}

            {filters.category === 'cafeteria' && (
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
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
                    Top Items to Show (0 = hide chart)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={filters.topK}
                    onChange={(e) => setFilters({...filters, topK: e.target.value})}
                    style={{ 
                      width: '100%',
                      padding: '0.6rem', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      background: 'white'
                    }}
                    placeholder="0 = hide, 5-20 recommended"
                  />
                </div>
              </>
            )}

            {/* Payment Method Filter (applies to all categories) */}
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
          </div>
        )}

        {reportType === 'attendance' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
              Ticket Type
            </label>
            <select
              value={filters.ticketType}
              onChange={(e) => setFilters({...filters, ticketType: e.target.value})}
              style={{ 
                maxWidth: '300px',
                padding: '0.6rem', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px',
                fontSize: '0.9rem',
                background: 'white'
              }}
            >
              <option value="all">All Types</option>
              {ticketTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}

        {reportType === 'membership' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
              Membership Type
            </label>
            <select
              value={filters.membershipType}
              onChange={(e) => setFilters({...filters, membershipType: e.target.value})}
              style={{ 
                maxWidth: '300px',
                padding: '0.6rem', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px',
                fontSize: '0.9rem',
                background: 'white'
              }}
            >
              <option value="all">All Types</option>
              {membershipTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  };

  // ==================== COMPARISON DATE RANGE SELECTOR ====================
  
  const renderComparisonDateSelector = () => {
    if (!filters.enableComparison) return null;

    const hasOverlap = dateRangesOverlap(
      dateRange.startDate, 
      dateRange.endDate, 
      comparisonDateRange.startDate, 
      comparisonDateRange.endDate
    );

    return (
      <div style={{ 
        marginTop: '1.5rem', 
        padding: '1.5rem', 
        background: '#f0fdfa', 
        border: `2px solid ${hasOverlap ? '#fecaca' : '#99f6e4'}`, 
        borderRadius: '12px' 
      }}>
        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>
          📊 Comparison Period
        </label>
        
        {hasOverlap && (
          <div style={{ 
            background: '#fee2e2', 
            border: '1px solid #fecaca', 
            padding: '0.75rem', 
            borderRadius: '8px', 
            marginBottom: '1rem',
            color: '#991b1b',
            fontSize: '0.9rem'
          }}>
            ⚠️ Warning: Date ranges overlap! Please adjust dates so they don't overlap.
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>
              Comparison Start Date
            </label>
            <input
              type="date"
              value={comparisonDateRange.startDate}
              onChange={(e) => setComparisonDateRange({...comparisonDateRange, startDate: e.target.value})}
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
              Comparison End Date
            </label>
            <input
              type="date"
              value={comparisonDateRange.endDate}
              onChange={(e) => setComparisonDateRange({...comparisonDateRange, endDate: e.target.value})}
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
            <button className="toggle-btn" onClick={() => handleQuickDateRange('last7', true)}>Last 7 days</button>
            <button className="toggle-btn" onClick={() => handleQuickDateRange('last30', true)}>Last 30 days</button>
            <button className="toggle-btn" onClick={() => handleQuickDateRange('lastMonth', true)}>Last month</button>
          </div>
        </div>
      </div>
    );
  };

  // ==================== VISUALIZATION RENDERING ====================
  
  const renderVisualization = () => {
    if (!reportData || !generatedDateRange) return null;

    // Determine which data to display based on active tab
    const activeData = activeVisualizationTab === 'primary' ? reportData : comparisonData;
    const activeDateRange = activeVisualizationTab === 'primary' ? generatedDateRange : generatedComparisonDateRange;

    if (!activeData) return null;

    const reportTitle = reportType === 'sales' ? 'Sales Analysis Report' :
                       reportType === 'attendance' ? 'Visitor Attendance Report' :
                       'Membership Analytics Report';

    const periodText = `${formatDate(activeDateRange.startDate)} - ${formatDate(activeDateRange.endDate)}`;

    if (reportType === 'sales') {
      return renderSalesVisualization(reportTitle, periodText, activeData);
    } else if (reportType === 'attendance') {
      return renderAttendanceVisualization(reportTitle, periodText, activeData);
    } else if (reportType === 'membership') {
      return renderMembershipVisualization(reportTitle, periodText, activeData);
    }
  };

  const renderSalesVisualization = (title, period, data) => {
    const { 
      totalSales = 0, 
      transactionCount = 0, 
      averageOrderValue = 0,
      categorySales = [],
      dailySales = [],
      topItems = [],
      paymentMethodBreakdown = [],
      categoryDetails = []
    } = data;

    const changeIndicator = (current, previous) => {
      if (!comparisonData || !previous) return null;
      const change = ((current - previous) / previous * 100).toFixed(1);
      const isPositive = change >= 0;
      const bgColor = isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      const textColor = isPositive ? '#059669' : '#dc2626';
      const arrow = isPositive ? '↑' : '↓';
      return (
        <span style={{ 
          color: textColor,
          backgroundColor: bgColor,
          fontSize: '0.85rem', 
          marginLeft: '0.5rem', 
          fontWeight: '700',
          padding: '0.25rem 0.5rem',
          borderRadius: '6px',
          display: 'inline-block'
        }}>
          {arrow} {Math.abs(change)}%
        </span>
      );
    };

    // Prepare bubble chart data
    const bubbleData = topItems.map((item, idx) => ({
      name: item.name,
      x: item.unitsSold,
      y: item.revenue,
      z: item.revenue,
      revenue: item.revenue,
      unitsSold: item.unitsSold,
      color: COLORS[idx % COLORS.length]
    }));

    return (
      <>
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.75rem' }}>{title}</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Primary: {formatDate(generatedDateRange.startDate)} - {formatDate(generatedDateRange.endDate)}
            {generatedFilters.enableComparison && comparisonData && generatedComparisonDateRange && (
              <> | Comparison: {formatDate(generatedComparisonDateRange.startDate)} - {formatDate(generatedComparisonDateRange.endDate)}</>
            )}
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #149ab8 0%, #0d7294 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Sales</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>
              ${(reportData?.totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {changeIndicator(reportData?.totalSales || 0, comparisonData?.totalSales)}
            </div>
            {generatedFilters.category !== 'all' && (
              <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.9 }}>
                Category: {generatedFilters.category === 'giftshop' ? 'Gift Shop' : generatedFilters.category === 'cafeteria' ? 'Cafeteria' : 'Tickets'}
              </div>
            )}
          </div>

          <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Transactions</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>
              {reportData?.transactionCount || 0}
              {changeIndicator(reportData?.transactionCount || 0, comparisonData?.transactionCount)}
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Avg Order Value</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>
              ${(reportData?.averageOrderValue || 0).toFixed(2)}
              {changeIndicator(reportData?.averageOrderValue || 0, comparisonData?.averageOrderValue)}
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>
              {generatedFilters.category === 'tickets' ? 'Top Ticket Type' : 'Top Item/Category'}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>
              {generatedFilters.category === 'tickets' ? 
                (categoryDetails[0]?.type || 'N/A') : 
                generatedFilters.category === 'all' ? 
                  (categorySales[0]?.category || 'N/A') : 
                  (topItems[0]?.name || 'N/A')
              }
            </div>
          </div>
        </div>

        {/* Period Toggle Tabs */}
        {generatedFilters.enableComparison && comparisonData && (
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginBottom: '2rem',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '1rem'
          }}>
            <button
              onClick={() => setActiveVisualizationTab('primary')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeVisualizationTab === 'primary' ? 'linear-gradient(135deg, #149ab8 0%, #0d7294 100%)' : 'white',
                color: activeVisualizationTab === 'primary' ? 'white' : '#475569',
                border: activeVisualizationTab === 'primary' ? 'none' : '2px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              📊 Primary Period
            </button>
            <button
              onClick={() => setActiveVisualizationTab('comparison')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeVisualizationTab === 'comparison' ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' : 'white',
                color: activeVisualizationTab === 'comparison' ? 'white' : '#475569',
                border: activeVisualizationTab === 'comparison' ? 'none' : '2px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              📈 Comparison Period
            </button>
          </div>
        )}

        {/* Current Period Label */}
        <div style={{ 
          background: '#f8fafc', 
          padding: '0.75rem 1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
            Viewing: 
          </span>
          <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '600', marginLeft: '0.5rem' }}>
            {period}
          </span>
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
          {/* Daily Sales Trend */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Daily Sales Trend</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Sales']}
                  labelFormatter={(date) => formatDate(date)}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke={activeVisualizationTab === 'primary' ? '#149ab8' : '#94a3b8'} 
                  strokeWidth={2} 
                  dot={{ r: 3 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Category Distribution - only for "all" categories */}
          {generatedFilters.category === 'all' && categorySales.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Sales by Category</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categorySales}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, value }) => `${category}: $${value.toFixed(0)}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categorySales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bubble Chart for Top Items - Only show if topK > 0 */}
          {(generatedFilters.category === 'giftshop' || generatedFilters.category === 'cafeteria') && 
           topItems.length > 0 && 
           parseInt(generatedFilters.topK) > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', gridColumn: '1 / -1' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>
                Top {generatedFilters.topK} {generatedFilters.category === 'giftshop' ? 'Gift Shop' : 'Cafeteria'} Items
              </h4>
              <ResponsiveContainer width="100%" height={Math.max(400, bubbleData.length * 35)}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Units Sold" 
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Units Sold', position: 'insideBottom', offset: -10, fontSize: 12 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Revenue" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                    label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <ZAxis type="number" dataKey="z" range={[400, 4000]} name="Revenue" />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div style={{ 
                            background: 'white', 
                            border: '2px solid #149ab8', 
                            padding: '0.75rem', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                          }}>
                            <p style={{ margin: 0, fontWeight: '600', color: '#0f172a', marginBottom: '0.5rem' }}>
                              {data.name}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                              Revenue: <strong>${data.revenue.toFixed(2)}</strong>
                            </p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                              Units Sold: <strong>{data.unitsSold}</strong>
                            </p>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                              Avg Price: <strong>${(data.revenue / data.unitsSold).toFixed(2)}</strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36}
                    content={({ payload }) => (
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '1rem', 
                        justifyContent: 'center',
                        marginBottom: '1rem'
                      }}>
                        {bubbleData.map((item, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ 
                              width: '12px', 
                              height: '12px', 
                              borderRadius: '50%', 
                              background: item.color 
                            }} />
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                              {item.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  <Scatter name="Items" data={bubbleData} fill="#149ab8">
                    {bubbleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category Details for Gift Shop */}
          {generatedFilters.category === 'giftshop' && (!generatedFilters.giftShopCategory || generatedFilters.giftShopCategory === 'all') && categoryDetails.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Gift Shop Category Breakdown</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryDetails}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#149ab8" name="Revenue ($)" />
                  <Bar dataKey="itemsSold" fill="#10b981" name="Items Sold" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category Details for Cafeteria */}
          {generatedFilters.category === 'cafeteria' && (!generatedFilters.cafeteriaCategory || generatedFilters.cafeteriaCategory === 'all') && categoryDetails.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Cafeteria Category Breakdown</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryDetails}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#149ab8" name="Revenue ($)" />
                  <Bar dataKey="itemsSold" fill="#10b981" name="Items Sold" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Ticket Type Details */}
          {generatedFilters.category === 'tickets' && categoryDetails.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Ticket Type Breakdown</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryDetails}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? `$${value}` : value,
                      name === 'revenue' ? 'Revenue' : name === 'visitors' ? 'Visitors' : 'Transactions'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="visitors" fill="#149ab8" name="Visitors" />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Payment Method Breakdown */}
          {paymentMethodBreakdown && paymentMethodBreakdown.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Payment Methods</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethodBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ method, total }) => `${method}: $${total.toFixed(0)}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {paymentMethodBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderAttendanceVisualization = (title, period, data) => {
    const { 
      totalVisitors = 0,
      averageDailyVisitors = 0,
      averageGroupSize = 0,
      dailyAttendance = [],
      ticketTypeBreakdown = [],
      ageDemographics = [],
      dayOfWeekDistribution = []
    } = data;

    const changeIndicator = (current, previous) => {
      if (!comparisonData || !previous) return null;
      const change = ((current - previous) / previous * 100).toFixed(1);
      const isPositive = change >= 0;
      const bgColor = isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      const textColor = isPositive ? '#059669' : '#dc2626';
      const arrow = isPositive ? '↑' : '↓';
      return (
        <span style={{ 
          color: textColor,
          backgroundColor: bgColor,
          fontSize: '0.85rem', 
          marginLeft: '0.5rem', 
          fontWeight: '700',
          padding: '0.25rem 0.5rem',
          borderRadius: '6px',
          display: 'inline-block'
        }}>
          {arrow} {Math.abs(change)}%
        </span>
      );
    };

    return (
      <>
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.75rem' }}>{title}</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Primary: {formatDate(generatedDateRange.startDate)} - {formatDate(generatedDateRange.endDate)}
            {generatedFilters.enableComparison && comparisonData && (
              <> | Comparison: {formatDate(generatedComparisonDateRange.startDate)} - {formatDate(generatedComparisonDateRange.endDate)}</>
            )}
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #149ab8 0%, #0d7294 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Visitors</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>
              {(reportData?.totalVisitors || 0).toLocaleString()}
              {changeIndicator(reportData?.totalVisitors || 0, comparisonData?.totalVisitors)}
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Average Daily</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>
              {(reportData?.averageDailyVisitors || 0).toFixed(0)}
              {changeIndicator(reportData?.averageDailyVisitors || 0, comparisonData?.averageDailyVisitors)}
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.9 }}>visitors per day</div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Avg Group Size</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>
              {(reportData?.averageGroupSize || 0).toFixed(1)}
              {changeIndicator(reportData?.averageGroupSize || 0, comparisonData?.averageGroupSize)}
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.9 }}>visitors per transaction</div>
          </div>
        </div>

        {/* Period Toggle Tabs */}
        {generatedFilters.enableComparison && comparisonData && (
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginBottom: '2rem',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '1rem'
          }}>
            <button
              onClick={() => setActiveVisualizationTab('primary')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeVisualizationTab === 'primary' ? 'linear-gradient(135deg, #149ab8 0%, #0d7294 100%)' : 'white',
                color: activeVisualizationTab === 'primary' ? 'white' : '#475569',
                border: activeVisualizationTab === 'primary' ? 'none' : '2px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              📊 Primary Period
            </button>
            <button
              onClick={() => setActiveVisualizationTab('comparison')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeVisualizationTab === 'comparison' ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' : 'white',
                color: activeVisualizationTab === 'comparison' ? 'white' : '#475569',
                border: activeVisualizationTab === 'comparison' ? 'none' : '2px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              📈 Comparison Period
            </button>
          </div>
        )}

        {/* Current Period Label */}
        <div style={{ 
          background: '#f8fafc', 
          padding: '0.75rem 1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
            Viewing: 
          </span>
          <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '600', marginLeft: '0.5rem' }}>
            {period}
          </span>
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Daily Attendance</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyAttendance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'visitors' ? 'Visitors' : 'Transactions']}
                  labelFormatter={(date) => formatDate(date)}
                />
                <Bar dataKey="visitors" fill={activeVisualizationTab === 'primary' ? '#149ab8' : '#94a3b8'} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {ticketTypeBreakdown.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Visitor Distribution by Ticket Type</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ticketTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, visitors }) => `${type}: ${visitors}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="visitors"
                  >
                    {ticketTypeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Demographics Section */}
        {(ageDemographics.length > 0 || dayOfWeekDistribution.length > 0) && (
          <>
            <div style={{ marginTop: '2rem', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: '600' }}>
                📊 Visitor Demographics & Patterns
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
              {/* Age Demographics */}
              {ageDemographics.length > 0 && (
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Age Group Distribution</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={ageDemographics}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ ageGroup, percentage }) => `${ageGroup}: ${percentage}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="visitors"
                      >
                        {ageDemographics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value} visitors (${props.payload.percentage}%)`,
                          'Count'
                        ]} 
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Day of Week Distribution */}
              {dayOfWeekDistribution.length > 0 && (
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Visitors by Day of Week</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dayOfWeekDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'visitors' ? `${value} total visitors` : `${value} avg per day`,
                          name === 'visitors' ? 'Total' : 'Average'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="visitors" fill={activeVisualizationTab === 'primary' ? '#149ab8' : '#94a3b8'} name="Total Visitors" />
                      <Bar dataKey="avgPerDay" fill={activeVisualizationTab === 'primary' ? '#10b981' : '#94a3b8'} name="Avg Per Day" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </>
    );
  };

  const renderMembershipVisualization = (title, period, data) => {
    const { 
      newMembers = 0,
      totalMembers = 0,
      renewalRate = '0',
      memberRetention = 0,
      membershipTypesDistribution = [],
      membershipTrend = []
    } = data;

    const changeIndicator = (current, previous) => {
      if (!comparisonData || !previous) return null;
      const change = ((current - previous) / previous * 100).toFixed(1);
      const isPositive = change >= 0;
      const bgColor = isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      const textColor = isPositive ? '#059669' : '#dc2626';
      const arrow = isPositive ? '↑' : '↓';
      return (
        <span style={{ 
          color: textColor,
          backgroundColor: bgColor,
          fontSize: '0.85rem', 
          marginLeft: '0.5rem', 
          fontWeight: '700',
          padding: '0.25rem 0.5rem',
          borderRadius: '6px',
          display: 'inline-block'
        }}>
          {arrow} {Math.abs(change)}%
        </span>
      );
    };

    return (
      <>
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.75rem' }}>{title}</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Primary: {formatDate(generatedDateRange.startDate)} - {formatDate(generatedDateRange.endDate)}
            {generatedFilters.enableComparison && comparisonData && (
              <> | Comparison: {formatDate(generatedComparisonDateRange.startDate)} - {formatDate(generatedComparisonDateRange.endDate)}</>
            )}
          </p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #149ab8 0%, #0d7294 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>New Members</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>
              {reportData?.newMembers || 0}
              {changeIndicator(reportData?.newMembers || 0, comparisonData?.newMembers)}
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.9 }}>New sign-ups in period</div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Members</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>
              {reportData?.totalMembers || 0}
              {changeIndicator(reportData?.totalMembers || 0, comparisonData?.totalMembers)}
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.9 }}>Active memberships</div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Renewal Rate</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>
              {reportData?.renewalRate || '0'}%
              {changeIndicator(parseFloat(reportData?.renewalRate || '0'), comparisonData ? parseFloat(comparisonData.renewalRate) : null)}
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.9 }}>Member retention</div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>Active Members</div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>
              {reportData?.memberRetention || 0}
              {changeIndicator(reportData?.memberRetention || 0, comparisonData?.memberRetention)}
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.9 }}>Currently active</div>
          </div>
        </div>

        {/* Period Toggle Tabs */}
        {generatedFilters.enableComparison && comparisonData && (
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginBottom: '2rem',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '1rem'
          }}>
            <button
              onClick={() => setActiveVisualizationTab('primary')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeVisualizationTab === 'primary' ? 'linear-gradient(135deg, #149ab8 0%, #0d7294 100%)' : 'white',
                color: activeVisualizationTab === 'primary' ? 'white' : '#475569',
                border: activeVisualizationTab === 'primary' ? 'none' : '2px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              📊 Primary Period
            </button>
            <button
              onClick={() => setActiveVisualizationTab('comparison')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeVisualizationTab === 'comparison' ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)' : 'white',
                color: activeVisualizationTab === 'comparison' ? 'white' : '#475569',
                border: activeVisualizationTab === 'comparison' ? 'none' : '2px solid #e2e8f0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              📈 Comparison Period
            </button>
          </div>
        )}

        {/* Current Period Label */}
        <div style={{ 
          background: '#f8fafc', 
          padding: '0.75rem 1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
            Viewing: 
          </span>
          <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '600', marginLeft: '0.5rem' }}>
            {period}
          </span>
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
          {membershipTrend.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Membership Activity Over Time</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={membershipTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => [value, name === 'newSignups' ? 'New Members' : 'Renewals']}
                    labelFormatter={(date) => formatDate(date)}
                  />
                  <Legend />
                  <Bar dataKey="newSignups" fill={activeVisualizationTab === 'primary' ? '#149ab8' : '#94a3b8'} name="New Members" />
                  <Bar dataKey="renewals" fill={activeVisualizationTab === 'primary' ? '#10b981' : '#86efac'} name="Renewals" />
                  <Line type="monotone" dataKey="newSignups" stroke={activeVisualizationTab === 'primary' ? '#0d7294' : '#64748b'} strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {membershipTypesDistribution.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>
                {filters.membershipType !== 'all' ? `${filters.membershipType} Memberships` : 'Membership Types Distribution'}
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={membershipTypesDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'count' ? value : `$${value}`,
                      name === 'count' ? 'Members' : 'Annual Fee'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="count" fill={activeVisualizationTab === 'primary' ? '#149ab8' : '#94a3b8'} name="Active Members" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </>
    );
  };

  // ==================== RAW DATA TABLE WITH TABS ====================
  
  const renderRawDataTable = () => {
    const currentData = activeRawDataTab === 'primary' ? rawData : comparisonRawData;
    
    if (!currentData || currentData.length === 0) return null;

    const exportToCSV = () => {
      const headers = Object.keys(currentData[0]).join(',');
      const rows = currentData.map(row => 
        Object.values(row).map(val => {
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
          return val;
        }).join(',')
      );
      
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const periodLabel = activeRawDataTab === 'primary' ? 'primary' : 'comparison';
      const periodDates = activeRawDataTab === 'primary' 
        ? `${dateRange.startDate}-to-${dateRange.endDate}`
        : `${comparisonDateRange.startDate}-to-${comparisonDateRange.endDate}`;
      a.download = `${reportType}-report-${periodLabel}-${periodDates}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    };

    const getTableHeaders = () => {
      if (reportType === 'sales') {
        return ['Transaction ID', 'Date', 'Item/Type', 'Category', 'Quantity', 'Unit Price', 'Line Total', 'Payment', 'Status'];
      } else if (reportType === 'attendance') {
        return ['Purchase ID', 'Transaction ID', 'Visit Date', 'Purchase Date', 'Ticket Type', 'Visitors', 'Base Price', 'Discount', 'Final Price', 'Line Total', 'Customer', 'Used'];
      } else if (reportType === 'membership') {
        return ['Purchase ID', 'Transaction ID', 'Purchase Date', 'Member Name', 'Email', 'Phone', 'Type', 'Start Date', 'Expiration', 'Amount', 'Renewal', 'Active'];
      }
      return Object.keys(currentData[0]);
    };

    const formatCellValue = (value, header) => {
      if (value === null || value === undefined) return 'N/A';
      
      if (header.toLowerCase().includes('date')) {
        return formatDate(value);
      }
      if (header.toLowerCase().includes('price') || header.toLowerCase().includes('total') || header.toLowerCase().includes('amount') || header.toLowerCase().includes('discount')) {
        return `$${Number(value).toFixed(2)}`;
      }
      if (typeof value === 'boolean' || header.toLowerCase() === 'used' || header.toLowerCase() === 'renewal' || header.toLowerCase() === 'active') {
        return value ? 'Yes' : 'No';
      }
      return value;
    };

    const headers = getTableHeaders();

    return (
      <div style={{ marginTop: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h4 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaTable />
              Raw Database Records ({currentData.length} records)
            </h4>
            
            {/* Tabs for Primary vs Comparison */}
            {filters.enableComparison && comparisonRawData.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setActiveRawDataTab('primary')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: activeRawDataTab === 'primary' ? '#149ab8' : 'white',
                    color: activeRawDataTab === 'primary' ? 'white' : '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}
                >
                  Primary Period
                </button>
                <button
                  onClick={() => setActiveRawDataTab('comparison')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: activeRawDataTab === 'comparison' ? '#94a3b8' : 'white',
                    color: activeRawDataTab === 'comparison' ? 'white' : '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}
                >
                  Comparison Period
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={exportToCSV}
            style={{
              background: '#10b981',
              color: 'white',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            <FaDownload />
            Export to CSV
          </button>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {headers.map((header, idx) => (
                  <th key={idx} style={{ 
                    padding: '0.75rem 1rem', 
                    textAlign: 'left', 
                    borderBottom: '2px solid #e2e8f0',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#475569',
                    whiteSpace: 'nowrap'
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.slice(0, 100).map((row, rowIdx) => (
                <tr key={rowIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {headers.map((header, colIdx) => {
                    const fieldMap = {
                      'Transaction ID': 'transaction_id',
                      'Date': 'transaction_date',
                      'Item/Type': 'item_type',
                      'Category': 'category',
                      'Quantity': 'quantity',
                      'Unit Price': 'unit_price',
                      'Line Total': 'line_total',
                      'Payment': 'payment_method',
                      'Status': 'status',
                      'Purchase ID': 'purchase_id',
                      'Visit Date': 'visit_date',
                      'Purchase Date': 'purchase_date',
                      'Ticket Type': 'ticket_type',
                      'Visitors': 'visitors',
                      'Base Price': 'base_price',
                      'Discount': 'discount_amount',
                      'Final Price': 'final_price',
                      'Customer': 'customer_name',
                      'Used': 'is_used',
                      'Member Name': 'member_name',
                      'Email': 'member_email',
                      'Phone': 'member_phone',
                      'Type': 'membership_type',
                      'Start Date': 'start_date',
                      'Expiration': 'expiration_date',
                      'Amount': 'amount',
                      'Renewal': 'is_renewal',
                      'Active': 'is_active'
                    };
                    
                    const field = fieldMap[header] || header.toLowerCase().replace(/\s/g, '_');
                    const value = row[field];
                    
                    return (
                      <td key={colIdx} style={{ 
                        padding: '0.75rem 1rem', 
                        fontSize: '0.85rem',
                        color: '#0f172a'
                      }}>
                        {formatCellValue(value, header)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {currentData.length > 100 && (
          <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
            Showing first 100 of {currentData.length} records. Export to CSV to see all records.
          </p>
        )}
      </div>
    );
  };

  // ==================== MAIN RENDER ====================
  
  return (
    <div className="reports-container" style={{padding: '1rem 2rem', minHeight: '100vh' }}>
      <div className="reports-header">
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: '700' }}>Analytics & Reports</h2>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
          Generate custom reports with advanced filters and database record export
        </p>
      </div>

      <div className="chart-container" style={{ marginBottom: '2rem', background: 'white', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #e2e8f0' }}>
          <FaFilter style={{ marginRight: '0.75rem', color: '#149ab8', fontSize: '1.25rem' }} />
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>Report Configuration</h3>
        </div>

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
                  background: reportType === type.id ? 'linear-gradient(135deg, #149ab8 0%, #0d7294 100%)' : 'white',
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

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>
            2. Primary Date Range
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
              <button className="toggle-btn" onClick={() => handleQuickDateRange('last7', false)}>Last 7 days</button>
              <button className="toggle-btn" onClick={() => handleQuickDateRange('last30', false)}>Last 30 days</button>
              <button className="toggle-btn" onClick={() => handleQuickDateRange('last90', false)}>Last 90 days</button>
              <button className="toggle-btn" onClick={() => handleQuickDateRange('thisMonth', false)}>This month</button>
              <button className="toggle-btn" onClick={() => handleQuickDateRange('lastMonth', false)}>Last month</button>
              <button className="toggle-btn" onClick={() => handleQuickDateRange('thisYear', false)}>This year</button>
            </div>
          </div>

          {/* Comparison Toggle */}
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filters.enableComparison}
                onChange={(e) => setFilters({...filters, enableComparison: e.target.checked})}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>
                📊 Compare with another time period
              </span>
            </label>
          </div>

          {renderComparisonDateSelector()}
        </div>

        {renderFilterOptions()}

        <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #e2e8f0' }}>
          <button
            onClick={generateReport}
            disabled={!reportType || loading}
            style={{
              background: reportType && !loading ? 'linear-gradient(135deg, #149ab8 0%, #0d7294 100%)' : '#cbd5e1',
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

      {reportData && (
        <div className="chart-container" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
          {renderVisualization()}
          {renderRawDataTable()}
        </div>
      )}
    </div>
  );
}

export default AnalystReports;