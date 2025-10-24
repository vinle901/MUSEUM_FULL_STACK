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
import Checkout from './components/Checkout'
import Support from './components/Support' 
import { CartProvider } from './context/CartContext'
import Login from "./components/Login.jsx"
import Membership from "./components/Membership.jsx"
import Membershipinfo from "./components/Membershipinfo"

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
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/support" element={<Support />} />
          <Route path="/login" element={<Login />} />
          <Route path="/membership" element={<Membershipinfo />} />
          <Route path="/membership/join" element={<Membership />} />
          <Route path="/membership-info" element={<Navigate to="/membership" replace />} />
          <Route path="/cafeteria" element={<Cafeteria />} />
        </Routes>
        <Footer />
      </div>
    </CartProvider>
  )
}

export default App