import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import { FaSignInAlt, FaShoppingCart, FaSignOutAlt, FaUser, FaUserCircle, FaCogs, FaCashRegister, FaChartBar } from 'react-icons/fa';
import { authService } from '../services/authService';

function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Read user from localStorage synchronously to avoid flicker
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) setUser(JSON.parse(userStr));
    } catch { /* ignore */ }
  }, []);

  const isLoggedIn = !!(user && localStorage.getItem('accessToken'));
  const role = user?.role || 'guest';
  const employeeType = user?.employeeType || null;

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
    window.location.reload();
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
        <li><Link to="/membership">Membership</Link></li>
        {/* Cart icon aligned with nav links, on the right */}
        <li>
          <Link to="/cart" className="cart-button" aria-label="Cart">
            <FaShoppingCart className="cart-icon" />
          </Link>
        </li>
      </ul>
      <div className="navbar-right-section">
        {/* Employee portal quick links when logged in as employee/admin */}
        {isLoggedIn && (role === 'admin' || role === 'employee') && (
          <div className="employee-portals">
            {role === 'admin' && (
              <Link to="/employee/admin" className="employee-portal-link admin-link" title="Admin Portal">
                <FaCogs /> <span>Admin</span>
              </Link>
            )}
            {employeeType === 'cafeteria' && (
              <Link to="/employee/pos" className="employee-portal-link pos-link" title="Cafeteria POS">
                <FaCashRegister /> <span>POS</span>
              </Link>
            )}
            {employeeType === 'analyst' && (
              <Link to="/employee/reports" className="employee-portal-link reports-link" title="Reports">
                <FaChartBar /> <span>Reports</span>
              </Link>
            )}
            {/* Fallback generic portal link for other employees */}
            {role === 'employee' && !['cafeteria','analyst'].includes(employeeType || '') && (
              <Link to="/employee" className="employee-portal-link reports-link" title="Employee Portal">
                <FaUser /> <span>Employee</span>
              </Link>
            )}
          </div>
        )}

        {!isLoggedIn ? (
          <Link to="/login" className="login-button">
            <FaSignInAlt className="login-icon" />
            <span>Login</span>
          </Link>
        ) : (
          <div className="navbar-user-section">
            <Link to="/profile" className="user-name" aria-label="Profile">
              <FaUserCircle className="user-profile-icon" />
              <span>{user?.first_name || user?.email}</span>
            </Link>
            <button className="login-button logout-btn" onClick={handleLogout} title="Log out">
              <FaSignOutAlt />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
