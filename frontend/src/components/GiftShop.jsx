// File: src/components/GiftShop.jsx

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GiftShopCard from './GiftShopCard'
import { useCart } from '../context/CartContext'
import api from '../services/api'

const GiftShop = () => {
  const { getCartItemCount } = useCart()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [giftShopItems, setGiftShopItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch items from backend API on component mount
  useEffect(() => {
    const fetchGiftShopItems = async () => {
      try {
        setLoading(true)
        const response = await api.get('/api/giftshop')
        console.log('Gift shop items fetched:', response.data)
        setGiftShopItems(response.data)
        setError(null)
      } catch (err) {
        console.error('Error fetching gift shop items:', err)
        setError('Failed to load gift shop items. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchGiftShopItems()
  }, [])

  // Categories matching database enum
  const categories = ['All', 'Posters', 'Books', 'Postcards', 'Jewelry', 'Souvenirs', 'Toys', 'Stationery', 'Other']

  // Filter items by category (include out-of-stock items so they remain visible)
  const filteredItems = giftShopItems.filter(item => 
    (selectedCategory === 'All' || item.category === selectedCategory)
  )

  const sortedItems = [...filteredItems].sort((a, b) => {
    // Put available items first
    const aAvail = a.is_available ? 1 : 0
    const bAvail = b.is_available ? 1 : 0
    if (aAvail !== bAvail) return bAvail - aAvail
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price
      case 'price-high':
        return b.price - a.price
      case 'name':
      default:
        return a.item_name.localeCompare(b.item_name)
    }
  })

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-brand text-white py-16 px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl font-bold mb-4">Museum Gift Shop</h1>
          <p className="text-xl">Bring a piece of art home with you</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-brand text-white'
                    : 'bg-gray-200 text-black hover:bg-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Sort and Cart */}
          <div className="flex items-center gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-brand focus:outline-none"
            >
              <option value="name">Sort by Name</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>

            <Link
              to="/cart"
              className="relative bg-brand text-white px-6 py-2 rounded-lg font-semibold hover:bg-brand-dark transition-colors flex items-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Cart
              {getCartItemCount() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                  {getCartItemCount()}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
            <p className="text-xl text-gray-600 mt-4">Loading gift shop items...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xl text-red-800 font-semibold">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Items Grid */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedItems.map((item) => (
                <GiftShopCard key={item.item_id} item={item} />
              ))}
            </div>

            {/* Empty State */}
            {sortedItems.length === 0 && (
              <div className="text-center py-16">
                <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-xl text-gray-500">No items found in this category</p>
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="mt-4 bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand-dark"
                >
                  View All Items
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default GiftShop