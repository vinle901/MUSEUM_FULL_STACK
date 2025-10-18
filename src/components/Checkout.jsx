import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

const Checkout = () => {
  const { cart, getCartTotal, clearCart } = useCart()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    paymentMethod: 'Credit Card',
    giftMessage: '',
    newsletterSubscribe: false
  })

  const [errors, setErrors] = useState({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)

  const subtotal = getCartTotal()
  const taxRate = 0.0825
  const tax = subtotal * taxRate
  const total = subtotal + tax

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) newErrors.email = 'Valid email is required'
    
    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Valid 10-digit phone number is required'
    }

    if (!formData.address.trim()) newErrors.address = 'Address is required'
    if (!formData.city.trim()) newErrors.city = 'City is required'
    if (!formData.state.trim()) newErrors.state = 'State is required'
    
    const zipRegex = /^\d{5}$/
    if (!zipRegex.test(formData.zipCode)) newErrors.zipCode = 'Valid 5-digit ZIP code is required'

    const cardRegex = /^\d{16}$/
    if (!cardRegex.test(formData.cardNumber.replace(/\s/g, ''))) {
      newErrors.cardNumber = 'Valid 16-digit card number is required'
    }

    if (!formData.cardName.trim()) newErrors.cardName = 'Name on card is required'

    if (!formData.expiryMonth || !formData.expiryYear) {
      newErrors.expiry = 'Card expiry date is required'
    }

    const cvvRegex = /^\d{3,4}$/
    if (!cvvRegex.test(formData.cvv)) newErrors.cvv = 'Valid CVV is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (cart.length === 0) {
      alert('Your cart is empty')
      return
    }

    setIsProcessing(true)

    const transactionData = {
      user_id: 1,
      total_price: total,
      total_items: cart.reduce((sum, item) => sum + item.quantity, 0),
      payment_method: formData.paymentMethod,
      transaction_status: 'Completed'
    }

    const purchaseRecords = cart.map(item => ({
      gift_item_id: item.item_id,
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.price,
      line_total: item.price * item.quantity
    }))

    setTimeout(() => {
      console.log('Transaction Data:', transactionData)
      console.log('Purchase Records:', purchaseRecords)
      
      setIsProcessing(false)
      setOrderComplete(true)
      clearCart()
    }, 2000)
  }

  if (cart.length === 0 && !orderComplete) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Your cart is empty</h2>
          <button
            onClick={() => navigate('/gift-shop')}
            className="bg-brand text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-dark"
          >
            Go to Gift Shop
          </button>
        </div>
      </div>
    )
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white border-2 border-green-500 rounded-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-green-600 mb-4">Order Confirmed!</h1>
          <p className="text-xl text-gray-700 mb-6">
            Thank you for your purchase. Your order has been successfully processed.
          </p>
          <p className="text-lg text-gray-600 mb-8">
            A confirmation email has been sent to <strong>{formData.email}</strong>
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/gift-shop')}
              className="bg-brand text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-dark"
            >
              Continue Shopping
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-200 text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-300"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-brand text-white py-16 px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl font-bold">Checkout</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6">Personal Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                        errors.firstName ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                      }`}
                    />
                    {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                        errors.lastName ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                      }`}
                    />
                    {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                        errors.email ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                      }`}
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(555) 123-4567"
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                        errors.phone ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                      }`}
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6">Shipping Address</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Street Address *</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                        errors.address ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                      }`}
                    />
                    {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">City *</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                          errors.city ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                        }`}
                      />
                      {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">State *</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="TX"
                        maxLength="2"
                        className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                          errors.state ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                        }`}
                      />
                      {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">ZIP Code *</label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        placeholder="77001"
                        maxLength="5"
                        className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                          errors.zipCode ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                        }`}
                      />
                      {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-2">Payment Information</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Card details are validated for format only and are NOT stored
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Payment Method *</label>
                  <div className="flex gap-4">
                    {['Credit Card', 'Debit Card', 'Mobile Payment'].map(method => (
                      <label key={method} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method}
                          checked={formData.paymentMethod === method}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        <span>{method}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Card Number *</label>
                    <input
                      type="text"
                      name="cardNumber"
                      value={formData.cardNumber}
                      onChange={handleInputChange}
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                        errors.cardNumber ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                      }`}
                    />
                    {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Name on Card *</label>
                    <input
                      type="text"
                      name="cardName"
                      value={formData.cardName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                        errors.cardName ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                      }`}
                    />
                    {errors.cardName && <p className="text-red-500 text-sm mt-1">{errors.cardName}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Expiry Date *</label>
                      <div className="flex gap-2">
                        <select
                          name="expiryMonth"
                          value={formData.expiryMonth}
                          onChange={handleInputChange}
                          className={`flex-1 px-4 py-2 border-2 rounded-lg focus:outline-none ${
                            errors.expiry ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                          }`}
                        >
                          <option value="">MM</option>
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                              {String(i + 1).padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                        <select
                          name="expiryYear"
                          value={formData.expiryYear}
                          onChange={handleInputChange}
                          className={`flex-1 px-4 py-2 border-2 rounded-lg focus:outline-none ${
                            errors.expiry ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                          }`}
                        >
                          <option value="">YYYY</option>
                          {Array.from({ length: 10 }, (_, i) => (
                            <option key={i} value={2025 + i}>
                              {2025 + i}
                            </option>
                          ))}
                        </select>
                      </div>
                      {errors.expiry && <p className="text-red-500 text-sm mt-1">{errors.expiry}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">CVV *</label>
                      <input
                        type="text"
                        name="cvv"
                        value={formData.cvv}
                        onChange={handleInputChange}
                        placeholder="123"
                        maxLength="4"
                        className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                          errors.cvv ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                        }`}
                      />
                      {errors.cvv && <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Options */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6">Additional Options</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Gift Message (Optional)</label>
                    <textarea
                      name="giftMessage"
                      value={formData.giftMessage}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand"
                      placeholder="Add a special message to your gift..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="newsletterSubscribe"
                      checked={formData.newsletterSubscribe}
                      onChange={handleInputChange}
                      className="w-5 h-5"
                    />
                    <label className="text-sm">Subscribe to newsletter for exclusive offers and updates</label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-brand text-white py-4 rounded-lg font-bold text-xl hover:bg-brand-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : `Complete Purchase - $${total.toFixed(2)}`}
              </button>
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 sticky top-24">
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {cart.map(item => (
                  <div key={item.item_id} className="flex gap-3">
                    <img src={item.image_url} alt={item.item_name} className="w-16 h-16 object-cover rounded" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.item_name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t-2 border-gray-300 pt-4">
                <div className="flex justify-between text-lg">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span>Tax (8.25%):</span>
                  <span className="font-semibold">${tax.toFixed(2)}</span>
                </div>
                <div className="border-t-2 border-gray-300 pt-3">
                  <div className="flex justify-between text-xl">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-brand">${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout