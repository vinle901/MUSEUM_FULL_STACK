import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";
import { FaSignInAlt } from 'react-icons/fa';

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">THE MUSEUM</Link>
      <ul className="navbar-links">
        <li><Link to="/visit">Visit</Link></li>
        <li><a href="/cafeteria">Cafeteria</a></li>
        <li><a href="/gift-shop">Gift Shop</a></li>
        <li><Link to="/artworks">Art</Link></li>
        <li><a href="/calendar">Calendar</a></li>
        <li><a href="/support">Support</a></li>
        <li><a href="/membership">Membership</a></li>
      </ul>
      <button className="login-button" type="button">
        <FaSignInAlt className="login-icon" />
        <span>Login</span>
      </button>
    </nav>
  );
}

export default Navbar;