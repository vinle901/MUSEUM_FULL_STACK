import { Link, useNavigate } from "react-router-dom";
import { FaSignInAlt, FaUser, FaSignOutAlt } from 'react-icons/fa';
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
    </nav>
  );
}

export default Navbar;
