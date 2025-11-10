/* eslint-disable indent */
/* eslint-disable react/jsx-one-expression-per-line */
/* eslint-disable max-len */
/* eslint-disable react/button-has-type */
/* eslint-disable comma-dangle */
/* eslint-disable no-trailing-spaces */
/* eslint-disable prettier/prettier */
/* eslint-disable react/function-component-definition */
/* eslint-disable jsx-a11y/label-has-associated-control */
// File: src/components/CheckoutMem.jsx

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import api from '../services/api'
import { getImageUrl } from '../utils/imageHelpers'
import { authService } from '../services/authService'
import { ticketService } from '../services/ticketService'

const Checkout = () => {
  const { cart, getCartTotal, clearCart } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Check if this is a membership checkout
  const isMembershipCheckout = location.state?.checkoutType === 'membership'
  const isRenewal = location.state?.isRenewal || false
  const membershipData = location.state?.membershipData

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
  const [orderDetails, setOrderDetails] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [membership, setMembership] = useState(null)
  const [membershipLoading, setMembershipLoading] = useState(true)

  // Calculate totals based on checkout type
  const subtotal = isMembershipCheckout 
    ? parseFloat(membershipData?.plan?.annual_fee || 0) 
    : getCartTotal()
  const taxRate = 0.0825 // 8.25% tax
  const tax = subtotal * taxRate
  const total = subtotal + tax

  // Pre-fill form with user data if available
  useEffect(() => {
    if (membershipData?.user) {
      setFormData(prev => ({
        ...prev,
        email: membershipData.user.email || '',
        firstName: membershipData.user.first_name || '',
        lastName: membershipData.user.last_name || '',
        phone: membershipData.user.phone_number || '',
      }))
    }
  }, [membershipData])

  // Load current user and membership (to block active members from repurchasing)
  useEffect(() => {
    const loadUserAndMembership = async () => {
      try {
        const user = await authService.getCurrentUser()
        setCurrentUser(user)
        const uid = user?.user_id || user?.id
        if (uid) {
          try {
            const res = await ticketService.getUserMembership(uid)
            if (Array.isArray(res) && res.length > 0) setMembership(res[0])
            else setMembership(null)
          } catch {
            setMembership(null)
          }
        } else {
          setMembership(null)
        }
      } catch {
        setCurrentUser(null)
        setMembership(null)
      } finally {
        setMembershipLoading(false)
      }
    }
    // Only need membership check when doing membership checkout
    if (isMembershipCheckout) {
      loadUserAndMembership()
    } else {
      setMembershipLoading(false)
    }
  }, [isMembershipCheckout])

  const hasActiveMembership = (() => {
    if (!membership) return false
    const activeVal = membership.is_active
    const isActive = (activeVal === 1 || activeVal === true || activeVal === '1')
    if (!isActive) return false
    // null expiration means non-expiring, else must be in the future
    if (!membership.expiration_date) return true
    const exp = new Date(membership.expiration_date)
    const today = new Date(); today.setHours(0,0,0,0)
    return exp >= today
  })()

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

    if (!formData.expiryMonth) {
      newErrors.expiryMonth = 'Month is required'
    }
    if (!formData.expiryYear) {
      newErrors.expiryYear = 'Year is required'
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

    if (!isMembershipCheckout && cart.length === 0) {
      alert('Your cart is empty')
      return
    }

    // Prevent purchasing a membership when already active (but allow renewals)
    if (isMembershipCheckout && hasActiveMembership && !isRenewal) {
      alert('You already have an active membership and cannot purchase another at this time.')
      return
    }

    setIsProcessing(true)

    try {
      let response
      let userForTx = null

      // Get current user for both membership and gift shop purchases
      try {
        userForTx = await authService.getCurrentUser()
      } catch (error) {
        console.log('User not logged in')
      }

      if (isMembershipCheckout) {
        // Process membership purchase
        if (!userForTx) {
          alert('Please log in to purchase a membership')
          navigate('/login')
          return
        }

        const membershipTransactionData = {
          user_id: (userForTx.user_id || userForTx.id),
          payment_method: formData.paymentMethod,
          membership_type: membershipData.plan.membership_type,
          total_paid: parseFloat(total.toFixed(2)), // Include tax
        }

        response = await api.post('/api/transactions/membership-checkout', membershipTransactionData)

        
        console.log('Membership transaction successful:', response.data)
        
        setOrderDetails({
          type: 'membership',
          ...response.data,
        })
      } else {
        // Process gift shop purchase
        const transactionData = {
          user_id: (userForTx?.user_id || userForTx?.id || 1),
          payment_method: formData.paymentMethod,
          total_price: parseFloat(total.toFixed(2)),
          cart_items: cart.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
          })),
          customer_info: {
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
          },
        }

        response = await api.post('/api/transactions/gift-shop-checkout', transactionData)
        
        console.log('Transaction successful:', response.data)
        
        setOrderDetails({
          type: 'gift-shop',
          ...response.data,
        })
        clearCart()
      }

      setIsProcessing(false)
      setOrderComplete(true)
    } catch (error) {
      console.error('Transaction failed:', error)
      setIsProcessing(false)
      
      const errorMessage = error.response?.data?.error || 'Payment processing failed. Please try again.'
      alert(errorMessage)
    }
  }

  if (!isMembershipCheckout && cart.length === 0 && !orderComplete) {
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
    const isMembership = orderDetails?.type === 'membership'
    
    return (
      <div className="min-h-screen bg-white">
        {/* Header matching site theme */}
        <div className="bg-brand text-white py-16 px-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-5xl font-bold">
              {isMembership ? 'Membership Activated!' : 'Order Confirmed'}
            </h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-8 py-12">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-brand rounded-full mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-black mb-3">
              {isMembership ? 'Welcome to Our Museum Family!' : 'Thank You for Your Purchase!'}
            </h2>
            <p className="text-xl text-gray-600">
              {isMembership 
                ? 'Your membership has been successfully activated.' 
                : 'Your order has been successfully processed.'}
            </p>
          </div>

          {/* Order Details Card */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-8 mb-6">
            <h3 className="text-2xl font-bold mb-6 pb-4 border-b-2 border-gray-200">
              {isMembership ? 'Membership Information' : 'Order Information'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Customer</p>
                <p className="text-lg font-semibold">{formData.firstName} {formData.lastName}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Email</p>
                <p className="text-lg font-semibold">{formData.email}</p>
              </div>
              
              {isMembership && orderDetails && (
                <>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Membership Type</p>
                    <p className="text-lg font-semibold">{orderDetails.membership_type}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Membership Status</p>
                    <p className="text-lg font-semibold text-green-600">
                      {orderDetails.is_renewal ? 'Renewed' : 'New'} - Active
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Start Date</p>
                    <p className="text-lg font-semibold">{orderDetails.start_date}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Expiration Date</p>
                    <p className="text-lg font-semibold">{orderDetails.expiration_date}</p>
                  </div>
                </>
              )}
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                <p className="text-lg font-semibold">{formData.paymentMethod}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                <p className="text-lg font-semibold text-brand">
                  ${isMembership && orderDetails ? orderDetails.total_paid.toFixed(2) : total.toFixed(2)}
                </p>
              </div>
            </div>

            {!isMembership && (
              <div className="bg-gray-50 rounded-lg p-4 mt-6">
                <p className="text-sm text-gray-700">
                  <strong>Shipping Address:</strong><br />
                  {formData.address}<br />
                  {formData.city}, {formData.state} {formData.zipCode}
                </p>
              </div>
            )}
          </div>

          {/* Information Notice */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-blue-900 mb-1">
                  {isMembership ? 'Your membership is now active' : 'Your order details have been recorded'}
                </p>
                <p className="text-sm text-blue-800">
                  {isMembership 
                    ? 'You can now enjoy all the benefits of your membership. Visit your profile to view your membership details.' 
                    : 'You can pick up your items at the museum gift shop. Please bring a valid ID and your order reference.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isMembership ? (
              <>
                <button
                  onClick={() => navigate('/profile')}
                  className="bg-brand text-white px-8 py-3 rounded-lg font-semibold hover:bg-brand-dark transition-colors"
                >
                  View Profile
                </button>
                <button
                  onClick={() => navigate('/membershipinfo')}
                  className="bg-white text-black border-2 border-gray-300 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Membership Benefits
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/gift-shop')}
                  className="bg-brand text-white px-8 py-3 rounded-lg font-semibold hover:bg-brand-dark transition-colors"
                >
                  Continue Shopping
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="bg-white text-black border-2 border-gray-300 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back to Home
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-brand text-white py-16 px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl font-bold">
            {isMembershipCheckout ? (isRenewal ? 'Renew Your Membership' : 'Complete Your Membership') : 'Checkout'}
          </h1>
          {isMembershipCheckout && membershipData && (
            <p className="text-xl mt-2 opacity-90">
              {isRenewal && '🔄 Renewal: '}{membershipData.plan.membership_type} Membership - ${parseFloat(membershipData.plan.annual_fee).toFixed(2)}/year
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {isMembershipCheckout && !orderComplete && isRenewal && (
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                  <p className="text-blue-800 font-semibold">
                    🔄 You are renewing your {membershipData?.plan?.membership_type || 'membership'}. Your membership will be extended by 1 year from your current expiration date.
                  </p>
                </div>
              )}
              {isMembershipCheckout && !orderComplete && hasActiveMembership && !isRenewal && (
                <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                  <p className="text-red-800 font-semibold">
                    You already have an active membership{membership?.membership_type ? ` (${membership.membership_type})` : ''}. Purchasing another is disabled.
                  </p>
                </div>
              )}
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
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <select
                            name="expiryMonth"
                            value={formData.expiryMonth}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                              errors.expiryMonth ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                            }`}
                          >
                            <option value="">MM</option>
                            {Array.from({ length: 12 }, (_, i) => (
                              <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                                {String(i + 1).padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                          {errors.expiryMonth && <p className="text-red-500 text-sm mt-1">{errors.expiryMonth}</p>}
                        </div>
                        <div>
                          <select
                            name="expiryYear"
                            value={formData.expiryYear}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                              errors.expiryYear ? 'border-red-500' : 'border-gray-300 focus:border-brand'
                            }`}
                          >
                            <option value="">YYYY</option>
                            {Array.from({ length: 10 }, (_, i) => (
                              <option key={i} value={2025 + i}>
                                {2025 + i}
                              </option>
                            ))}
                          </select>
                          {errors.expiryYear && <p className="text-red-500 text-sm mt-1">{errors.expiryYear}</p>}
                        </div>
                      </div>
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
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing || (isMembershipCheckout && hasActiveMembership && !isRenewal)}
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
              
              {/* Membership Summary */}
              {isMembershipCheckout && membershipData ? (
                <div className="space-y-4 mb-6">
                  <div className="bg-white rounded-lg p-4 border-2 border-brand">
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Membership Type</p>
                      <p className="font-bold text-lg">{membershipData.plan.membership_type}</p>
                    </div>
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Annual Fee</p>
                      <p className="font-semibold text-brand">${parseFloat(membershipData.plan.annual_fee).toFixed(2)}</p>
                    </div>
                    {hasActiveMembership && !isRenewal && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-800 font-semibold">Active membership detected. Checkout is disabled.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Gift Shop Items */
                <div className="space-y-4 mb-6">
                  {cart.map(item => (
                    <div key={item.item_id} className="flex gap-3">
                      <img src={getImageUrl(item.image_url)} alt={item.item_name} className="w-16 h-16 object-cover rounded" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.item_name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        <p className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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