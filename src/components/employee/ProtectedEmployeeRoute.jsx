// File: src/components/employee/ProtectedEmployeeRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedEmployeeRoute({ children, allowedTypes = [] }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('accessToken');

  // Check if user is logged in
  if (!token || !user.id) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is an employee or admin
  if (user.role !== 'employee' && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Check if employee has the right type for this route
  if (allowedTypes.length > 0 && !allowedTypes.includes(user.employeeType)) {
    // Redirect to appropriate portal based on their type
    switch (user.employeeType) {
      case 'cafeteria':
        return <Navigate to="/employee/pos" replace />;
      case 'admin':
        return <Navigate to="/employee/admin" replace />;
      case 'analyst':
        return <Navigate to="/employee/reports" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default ProtectedEmployeeRoute;