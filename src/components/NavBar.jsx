import { Link } from "react-router-dom";
import { FaSignInAlt } from 'react-icons/fa';

function Navbar() {
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
      </ul>
      <Link to="/login" className="login-button">
        <FaSignInAlt className="login-icon" />
        <span>Login</span>
      </Link>
    </nav>
  );
}

export default Navbar;
