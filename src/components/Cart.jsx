import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, getCartTotal } = useCart()
  const navigate = useNavigate()

  const subtotal = getCartTotal()
  const taxRate = 0.0825 // 8.25% Texas tax
  const tax = subtotal * taxRate
  const total = subtotal + tax

  const handleCheckout = () => {
    if (cart.length > 0) {
      navigate('/checkout')
    }
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-brand text-white py-16 px-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-5xl font-bold">Shopping Cart</h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 py-16 text-center">
          <svg className="w-32 h-32 mx-auto text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-3xl font-bold text-black mb-4">Your cart is empty</h2>
          <p className="text-xl text-gray-600 mb-8">Browse our gift shop and add some items!</p>
          <Link
            to="/gift-shop"
            className="inline-block bg-brand text-white px-8 py-3 rounded-lg font-semibold hover:bg-brand-dark transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-brand text-white py-16 px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl font-bold">Shopping Cart</h1>
          <p className="text-xl mt-2">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Cart Items</h2>
              <button
                onClick={clearCart}
                className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Cart
              </button>
            </div>

            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.item_id} className="bg-white border-2 border-gray-200 rounded-lg p-4 flex gap-4">
                  {/* Image */}
                  <img
                    src={item.image_url}
                    alt={item.item_name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-black">{item.item_name}</h3>
                        <p className="text-sm text-gray-600">{item.category}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.item_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex justify-between items-center">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-brand hover:text-brand flex items-center justify-center font-bold"
                        >
                          −
                        </button>
                        <span className="text-lg font-semibold w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock_quantity}
                          className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-brand hover:text-brand flex items-center justify-center font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                        {item.quantity >= item.stock_quantity && (
                          <span className="text-sm text-orange-600 font-medium">Max stock reached</span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                        <p className="text-xl font-bold text-brand">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/gift-shop"
              className="inline-flex items-center gap-2 mt-6 text-brand hover:text-brand-dark font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Continue Shopping
            </Link>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 sticky top-24">
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-600">Tax (8.25%):</span>
                  <span className="font-semibold">${tax.toFixed(2)}</span>
                </div>
                <div className="border-t-2 border-gray-300 pt-3">
                  <div className="flex justify-between text-xl">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-brand">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-brand text-white py-3 rounded-lg font-bold text-lg hover:bg-brand-dark transition-colors mb-4"
              >
                Proceed to Checkout
              </button>

              <div className="border-t border-gray-300 pt-4">
                <h3 className="font-semibold mb-2">Promo Code</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand"
                  />
                  <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart