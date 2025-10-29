import { Link, useNavigate } from "react-router-dom";
import { FaSignInAlt, FaUser, FaSignOutAlt, FaStore, FaChartBar, FaCog, FaBars, FaTimes, FaShoppingCart } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('customer');
  const [employeeType, setEmployeeType] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Check if user is logged in and get their role
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');

    if (token && user) {
      setIsLoggedIn(true);
      try {
        const userData = JSON.parse(user);
        setUserName(userData.first_name || 'User');
        setUserRole(userData.role || 'customer');
        setEmployeeType(userData.employeeType || null);
      } catch (e) {
        setUserName('User');
        setUserRole('customer');
        setEmployeeType(null);
      }
    } else {
      setIsLoggedIn(false);
      setUserRole('customer');
      setEmployeeType(null);
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
          setUserRole(userData.role || 'customer');
          setEmployeeType(userData.employeeType || null);
        } catch (e) {
          setUserName('User');
          setUserRole('customer');
          setEmployeeType(null);
        }
      } else {
        setIsLoggedIn(false);
        setUserRole('customer');
        setEmployeeType(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsLoggedIn(false);
      setIsMobileMenuOpen(false);
      navigate('/');
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      setIsLoggedIn(false);
      setIsMobileMenuOpen(false);
      navigate('/');
      window.location.reload();
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Helper functions to determine what portals the user can access
  const canAccessPOS = () => {
    return userRole === 'admin' || employeeType === 'admin' || employeeType === 'cafeteria';
  };

  const canAccessAdmin = () => {
    return userRole === 'admin' || employeeType === 'admin';
  };

  const canAccessReports = () => {
    return userRole === 'admin' || employeeType === 'admin' || employeeType === 'analyst';
  };

  // Determine if current user is an admin
  const isAdmin = userRole === 'admin' || employeeType === 'admin';

  return (
    <nav className={`navbar ${isLoggedIn ? 'is-authenticated' : ''} ${isAdmin ? 'is-admin' : ''}`}>
      {/* Logo */}
      <Link to="/" className="navbar-logo">THE MUSEUM</Link>

  {/* Desktop Navigation Links (hidden for admin) */}
  <ul className="navbar-links">
        <li><Link to="/visit">Visit</Link></li>
        <li><Link to="/artworks">Art</Link></li>
        <li><Link to="/cafeteria">Cafeteria</Link></li>
        <li><Link to="/gift-shop">Gift Shop</Link></li>
        <li><Link to="/calendar">Calendar</Link></li>
        <li><Link to="/support">Support</Link></li>
        <li><Link to="/membershipinfo">Membership</Link></li>
      </ul>

  {/* Desktop Right Section */}
  <div className="navbar-right-section">
        {/* Employee Portal Links + Cart grouped for alignment */}
        {(isLoggedIn && (canAccessPOS() || canAccessAdmin() || canAccessReports())) ? (
          <div className="employee-portals">
            {/* Cart hidden for admins on the navbar */}
            {!isAdmin && (
              <Link to="/cart" className="cart-button" aria-label="Cart">
                <FaShoppingCart className="cart-icon" />
              </Link>
            )}
            {canAccessPOS() && (
              <Link to="/employee/pos" className="employee-portal-link pos-link" title="POS System">
                <FaStore size={16} />
                <span>POS</span>
              </Link>
            )}

            {canAccessAdmin() && (
              <Link to="/employee/admin" className="employee-portal-link admin-link" title="Admin Portal">
                <FaCog size={16} />
                <span>Admin</span>
              </Link>
            )}

            {canAccessReports() && (
              <Link to="/employee/reports" className="employee-portal-link reports-link" title="Analytics & Reports">
                <FaChartBar size={16} />
                <span>Reports</span>
              </Link>
            )}
          </div>
        ) : (
          // If not showing employee portals, show Cart unless admin
          !isAdmin && (
            <Link to="/cart" className="cart-button" aria-label="Cart">
              <FaShoppingCart className="cart-icon" />
            </Link>
          )
        )}

        {/* User Account Section */}
        {isLoggedIn ? (
          <div className="navbar-user-section">
            <Link to="/profile" className="login-button">
              <FaUser className="login-icon" />
              <span className="user-name">{userName}</span>
            </Link>

            <button onClick={handleLogout} className="login-button logout-btn" title="Logout">
              <FaSignOutAlt className="login-icon" />
            </button>
          </div>
        ) : (
          <Link to="/login" className="login-button">
            <FaSignInAlt className="login-icon" />
            <span>Login</span>
          </Link>
        )}

        {/* Hamburger toggle lives in the right cluster so it always stays right-aligned */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <>
          {/* Backdrop for closing on outside click */}
          <div className="mobile-menu-backdrop" onClick={closeMobileMenu} />
          {/* Mobile Menu Panel */}
          <div className="mobile-menu">
            {/* Close button pinned at the top (X icon) */}
            <button className="menu-close-top" onClick={closeMobileMenu} aria-label="Close menu">
              <FaTimes size={20} />
            </button>
            <div className="mobile-menu-content">
              {/* Top bar with logo aligned to the right */}
              <div className="mobile-menu-topbar">
                <span className="menu-title">THE MUSEUM</span>
              </div>
              {/* Navigation Links */}
              <div className="mobile-menu-section">
                <Link to="/visit" className="mobile-menu-link" onClick={closeMobileMenu}>Visit</Link>
                <Link to="/artworks" className="mobile-menu-link" onClick={closeMobileMenu}>Art</Link>
                <Link to="/cafeteria" className="mobile-menu-link" onClick={closeMobileMenu}>Cafeteria</Link>
                <Link to="/gift-shop" className="mobile-menu-link" onClick={closeMobileMenu}>Gift Shop</Link>
                <Link to="/calendar" className="mobile-menu-link" onClick={closeMobileMenu}>Calendar</Link>
                <Link to="/support" className="mobile-menu-link" onClick={closeMobileMenu}>Support</Link>
                <Link to="/membershipinfo" className="mobile-menu-link" onClick={closeMobileMenu}>Membership</Link>
                {/* Retain new feature: Cart link in mobile menu */}
                <Link to="/cart" className="mobile-menu-link" onClick={closeMobileMenu}>Cart</Link>
              </div>

              {/* Employee Portals */}
              {isLoggedIn && (canAccessPOS() || canAccessAdmin() || canAccessReports()) && (
                <div className="mobile-menu-section employee-section">
                  <div className="mobile-menu-heading">Employee Portals</div>
                  {canAccessPOS() && (
                    <Link to="/employee/pos" className="mobile-menu-link portal-link" onClick={closeMobileMenu}>
                      <FaStore size={16} /> POS System
                    </Link>
                  )}
                  {canAccessAdmin() && (
                    <Link to="/employee/admin" className="mobile-menu-link portal-link" onClick={closeMobileMenu}>
                      <FaCog size={16} /> Admin Portal
                    </Link>
                  )}
                  {canAccessReports() && (
                    <Link to="/employee/reports" className="mobile-menu-link portal-link" onClick={closeMobileMenu}>
                      <FaChartBar size={16} /> Reports
                    </Link>
                  )}
                </div>
              )}

              {/* User Section */}
              <div className="mobile-menu-section user-section">
                {isLoggedIn ? (
                  <>
                    <Link to="/profile" className="mobile-menu-link user-link" onClick={closeMobileMenu}>
                      <FaUser size={16} />
                    </Link>
                    <button onClick={handleLogout} className="mobile-menu-link logout-link">
                      <FaSignOutAlt size={16} /> Logout
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="mobile-menu-link login-link" onClick={closeMobileMenu}>
                    <FaSignInAlt size={16} /> Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}

export default Navbar;
