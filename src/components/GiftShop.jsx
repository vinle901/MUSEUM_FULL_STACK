import { useState } from 'react'
import { Link } from 'react-router-dom'
import GiftShopCard from './GiftShopCard'
import { useCart } from '../context/CartContext'

const GiftShop = () => {
  const { getCartItemCount } = useCart()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('name')

  // Mock data matching database schema
  const mockGiftShopItems = [
    {
      item_id: 1,
      item_name: "Starry Night Poster",
      category: "Posters",
      price: 24.99,
      stock_quantity: 50,
      description: "Beautiful reproduction of Van Gogh's masterpiece",
      artist_id: 1,
      image_url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500",
      is_available: true
    },
    {
      item_id: 2,
      item_name: "Museum Art Book",
      category: "Books",
      price: 34.99,
      stock_quantity: 25,
      description: "Comprehensive guide to our collection",
      artist_id: null,
      image_url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500",
      is_available: true
    },
    {
      item_id: 3,
      item_name: "Mona Lisa Postcard Set",
      category: "Postcards",
      price: 12.99,
      stock_quantity: 100,
      description: "Set of 10 postcards featuring famous artworks",
      artist_id: 3,
      image_url: "https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=500",
      is_available: true
    },
    {
      item_id: 4,
      item_name: "Pearl Earrings Replica",
      category: "Jewelry",
      price: 49.99,
      stock_quantity: 15,
      description: "Inspired by Vermeer's painting",
      artist_id: 5,
      image_url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500",
      is_available: true
    },
    {
      item_id: 5,
      item_name: "Museum Tote Bag",
      category: "Souvenirs",
      price: 18.99,
      stock_quantity: 75,
      description: "Canvas tote with museum logo",
      artist_id: null,
      image_url: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500",
      is_available: true
    },
    {
      item_id: 6,
      item_name: "Art History for Kids",
      category: "Toys",
      price: 29.99,
      stock_quantity: 30,
      description: "Educational toy set",
      artist_id: null,
      image_url: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=500",
      is_available: true
    },
    {
      item_id: 7,
      item_name: "Watercolor Notebook",
      category: "Stationery",
      price: 15.99,
      stock_quantity: 60,
      description: "Premium quality art journal",
      artist_id: null,
      image_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500",
      is_available: true
    },
    {
      item_id: 8,
      item_name: "Limited Edition Print",
      category: "Other",
      price: 89.99,
      stock_quantity: 5,
      description: "Exclusive signed print",
      artist_id: 7,
      image_url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=500",
      is_available: true
    }
  ]

  // Categories matching database enum
  const categories = ['All', 'Posters', 'Books', 'Postcards', 'Jewelry', 'Souvenirs', 'Toys', 'Stationery', 'Other']

  // Filter and sort items
  const filteredItems = mockGiftShopItems.filter(item => 
    selectedCategory === 'All' || item.category === selectedCategory
  )

  const sortedItems = [...filteredItems].sort((a, b) => {
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

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedItems.map((item) => (
            <GiftShopCard key={item.item_id} item={item} />
          ))}
        </div>

        {/* Empty State */}
        {sortedItems.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-gray-500">No items found in this category</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default GiftShop