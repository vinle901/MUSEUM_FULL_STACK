// File: src/App.jsx

import Artwork from './components/Artwork'
import ArtworkDetail from './components/ArtworkDetail'
import { Route, Routes, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './components/Home'
import Footer from './components/Footer'
import Visit from './components/Visit'
import Calendar from './components/Calendar'
import GiftShop from './components/GiftShop'
import Cart from './components/Cart'
import Checkout from './components/Checkout'
import CheckoutMem from './components/CheckoutMem'
import Support from './components/Support' 
import { CartProvider } from './context/CartContext'
import Login from "./components/Login.jsx"
import Register from "./components/Register.jsx"
import Membership from "./components/Membership.jsx"
import Membershipinfo from "./components/Membershipinfo"
import Profile from "./components/Profile.jsx"
import Cafeteria from "./components/Cafeteria"

// Employee Components
import EmployeePOS from "./components/employee/EmployeePOS"
import AdminPortal from "./components/employee/AdminPortal"
import AnalystReports from "./components/employee/AnalystReports"

function App() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-white">
        <NavBar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/visit" element={<Visit />} />
          <Route path="/artworks" element={<Artwork />} />
          <Route path="/artworks/type/:typeName" element={<Artwork />} />
          <Route path="/artworks/:id" element={<ArtworkDetail />} />
          <Route path="/gift-shop" element={<GiftShop />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/checkout-membership" element={<CheckoutMem />} />
          <Route path="/support" element={<Support />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/membershipinfo" element={<Membershipinfo />} />
          <Route path="/membership/join" element={<Membership />} />
          <Route path="/membership" element={<Navigate to="/membershipinfo" replace />} />
          <Route path="/cafeteria" element={<Cafeteria />} />
          
          {/* Employee Routes - Open to All for Development */}
          <Route path="/employee/pos" element={<EmployeePOS />} />
          <Route path="/employee/admin" element={<AdminPortal />} />
          <Route path="/employee/reports" element={<AnalystReports />} />
          <Route path="/employee" element={
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <h1>Employee Portal</h1>
              <p>Welcome to the employee portal. Choose a specific portal from the navigation bar.</p>
              <div style={{ marginTop: '30px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
                <a href="/employee/pos" style={{ 
                  padding: '15px 30px', 
                  backgroundColor: '#059669', 
                  color: 'white', 
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold'
                }}>POS System</a>
                <a href="/employee/admin" style={{ 
                  padding: '15px 30px', 
                  backgroundColor: '#7c3aed', 
                  color: 'white', 
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold'
                }}>Admin Portal</a>
                <a href="/employee/reports" style={{ 
                  padding: '15px 30px', 
                  backgroundColor: '#0891b2', 
                  color: 'white', 
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold'
                }}>Analytics</a>
              </div>
            </div>
          } />
        </Routes>
        <Footer />
      </div>
    </CartProvider>
  )
}

export default App