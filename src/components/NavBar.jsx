// File: src/components/NavBar.jsx

import { Link, useNavigate } from "react-router-dom";
import { FaSignInAlt, FaUser, FaSignOutAlt, FaBriefcase, FaStore, FaChartBar, FaCog } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');

    if (token && user) {
      setIsLoggedIn(true);
      try {
        const userData = JSON.parse(user);
        setUserName(userData.first_name || 'User');
      } catch (e) {
        setUserName('User');
      }
    } else {
      setIsLoggedIn(false);
    }

    // Listen for storage changes (e.g., login/logout in another tab)
    const handleStorageChange = () => {
      const token = localStorage.getItem('accessToken');
      const user = localStorage.getItem('user');

      if (token && user) {
        setIsLoggedIn(true);
        try {
          const userData = JSON.parse(user);
          setUserName(userData.first_name || 'User');
        } catch (e) {
          setUserName('User');
        }
      } else {
        setIsLoggedIn(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsLoggedIn(false);
      navigate('/');
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      setIsLoggedIn(false);
      navigate('/');
      window.location.reload();
    }
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">THE MUSEUM</Link>
      <ul className="navbar-links">
        <li><Link to="/visit">Visit</Link></li>
        <li><Link to="/artworks">Art</Link></li>
        <li><Link to="/cafeteria">Cafeteria</Link></li>
        <li><Link to="/gift-shop">Gift Shop</Link></li>
        <li><Link to="/calendar">Calendar</Link></li>
        <li><Link to="/support">Support</Link></li>
        <li><Link to="/membershipinfo">Membership</Link></li>
      </ul>

      <div className="navbar-right-section" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Employee Portal Links - Visible to Everyone for Development */}
        <div className="employee-portals" style={{ display: 'flex', gap: '8px' }}>
          <Link 
            to="/employee/pos" 
            className="employee-portal-link"
            title="POS System"
            style={{
              padding: '8px 12px',
              backgroundColor: '#059669',
              color: 'white',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#047857'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#059669'}
          >
            <FaStore size={16} />
            <span>POS</span>
          </Link>
          
          <Link 
            to="/employee/admin" 
            className="employee-portal-link"
            title="Admin Portal"
            style={{
              padding: '8px 12px',
              backgroundColor: '#7c3aed',
              color: 'white',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
          >
            <FaCog size={16} />
            <span>Admin</span>
          </Link>
          
          <Link 
            to="/employee/reports" 
            className="employee-portal-link"
            title="Analytics & Reports"
            style={{
              padding: '8px 12px',
              backgroundColor: '#0891b2',
              color: 'white',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0e7490'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0891b2'}
          >
            <FaChartBar size={16} />
            <span>Reports</span>
          </Link>
        </div>

        {/* User Account Section */}
        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <Link to="/profile" className="login-button">
              <FaUser className="login-icon" />
              <span>{userName}</span>
            </Link>
            
            <button
              onClick={handleLogout}
              className="login-button bg-transparent border border-gray-600 cursor-pointer"
              title="Logout"
            >
              <FaSignOutAlt className="login-icon" />
            </button>
          </div>
        ) : (
          <Link to="/login" className="login-button">
            <FaSignInAlt className="login-icon" />
            <span>Login</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;