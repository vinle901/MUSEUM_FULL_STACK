import Artwork from './components/Artwork'
import ArtworkDetail from './components/ArtworkDetail'
import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './components/Home'
import Footer from './components/Footer'
import Visit from './components/Visit'
import GiftShop from './components/GiftShop'
import Cart from './components/Cart'
import Checkout from './components/Checkout'
import { CartProvider } from './context/CartContext'

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
        </Routes>
        <Footer />
      </div>
    </CartProvider>
  )
}

export default App