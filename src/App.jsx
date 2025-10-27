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
import Cafeteria from './components/Cafeteria'
import Cart from './components/Cart'
import Ticket from './components/Ticket.jsx'
import Checkout from './components/Checkout'
import CheckoutMem from './components/CheckoutMem.jsx'
import Support from './components/Support' 
import Donate from './components/Donate'
import { CartProvider } from './context/CartContext'
import Login from "./components/Login.jsx"
import Register from "./components/Register.jsx"
import Membership from "./components/Membership.jsx"
import Membershipinfo from "./components/Membershipinfo"
import Profile from "./components/Profile.jsx"
import EventRSVP from './components/EventRSVP.jsx'

// Employee Portal Components
import EmployeePOS from "./components/employee/EmployeePOS"
import AdminPortal from "./components/employee/AdminPortal"
import AnalystReports from "./components/employee/AnalystReports"
import ProtectedEmployeeRoute from "./components/employee/ProtectedEmployeeRoute"

function App() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-white">
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/visit" element={<Visit />} />
          <Route path="/artworks" element={<Artwork />} />
          <Route path="/artworks/type/:typeName" element={<Artwork />} />
          <Route path="/artworks/:id" element={<ArtworkDetail />} />
          <Route path="/gift-shop" element={<GiftShop />} />
          <Route path="/tickets/checkout" element={<Ticket />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/events/:id/rsvp" element={<EventRSVP />} />
          <Route path="/support" element={<Support />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/membership" element={<Membershipinfo />} />
          {/* Dedicated membership checkout route */}
          <Route path="/checkout/membership" element={<CheckoutMem />} />
          <Route path="/membership-info" element={<Navigate to="/membership" replace />} />
          <Route path="/cafeteria" element={<Cafeteria />} />
          
          {/* Employee Portal Routes */}
          <Route path="/employee/pos" element={
            <ProtectedEmployeeRoute allowedTypes={['cafeteria']}>
              <EmployeePOS />
            </ProtectedEmployeeRoute>
          } />
          <Route path="/employee/admin" element={
            <ProtectedEmployeeRoute allowedTypes={['admin']}>
              <AdminPortal />
            </ProtectedEmployeeRoute>
          } />
          <Route path="/employee/reports" element={
            <ProtectedEmployeeRoute allowedTypes={['analyst']}>
              <AnalystReports />
            </ProtectedEmployeeRoute>
          } />
          <Route path="/employee" element={
            <ProtectedEmployeeRoute>
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <h1>Employee Portal</h1>
                <p>Welcome to the employee portal. Access your designated area from the navigation.</p>
              </div>
            </ProtectedEmployeeRoute>
          } />
        </Routes>
        <Footer />
      </div>
    </CartProvider>
  )
}

export default App