import { useState } from 'react'
import { useCart } from '../context/CartContext'

const GiftShopCard = ({ item }) => {
  const { addToCart } = useCart()
  const [isAdding, setIsAdding] = useState(false)

  const handleAddToCart = () => {
    if (!item.is_available || item.stock_quantity < 1) return
    
    setIsAdding(true)
    addToCart(item)
    
    setTimeout(() => {
      setIsAdding(false)
    }, 500)
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-brand hover:shadow-xl transition-all group">
      {/* Image */}
      <div className="relative h-64 bg-gray-100 overflow-hidden">
        <img
          src={item.image_url}
          alt={item.item_name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 bg-brand text-white text-xs font-semibold rounded-full">
            {item.category}
          </span>
        </div>

        {/* Stock Badge */}
        {item.stock_quantity < 10 && item.stock_quantity > 0 && (
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full">
              Only {item.stock_quantity} left
            </span>
          </div>
        )}

        {/* Out of Stock Overlay */}
        {(!item.is_available || item.stock_quantity < 1) && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <span className="text-white text-xl font-bold">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-black mb-2 line-clamp-2 h-14">
          {item.item_name}
        </h3>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-10">
          {item.description}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-brand">
            ${item.price.toFixed(2)}
          </span>

          <button
            onClick={handleAddToCart}
            disabled={!item.is_available || item.stock_quantity < 1 || isAdding}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              !item.is_available || item.stock_quantity < 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isAdding
                ? 'bg-green-500 text-white'
                : 'bg-brand text-white hover:bg-brand-dark'
            }`}
          >
            {isAdding ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Added!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default GiftShopCard