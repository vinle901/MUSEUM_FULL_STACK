import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import donationService from '../services/donationService'
import authService from '../services/authService'

function Donate() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const thisYear = new Date().getFullYear()
  const [form, setForm] = useState({
    name: '',
    email: '',
    amount: '',
    donation_type: 'General Fund',
    is_anonymous: false,
    dedication_message: '',
    payment_method: 'Credit Card',
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  })

  useEffect(() => {
    // Require login for donations (per requirement: require login if user_id is null)
    (async () => {
      const u = await authService.getCurrentUser()
      if (!u) {
        // Redirect to login and then back to /donate
        navigate('/login', { replace: true, state: { from: '/donate' } })
        return
      }
      setUser(u)
      setForm(f => ({
        ...f,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        email: u.email || ''
      }))
      setLoading(false)
    })()
  }, [navigate])

  const isValidCard = useMemo(() => {
    // simple format checks only
    const digits = form.cardNumber.replace(/\s+/g, '')
    const mmOk = /^\d{2}$/.test(form.expiryMonth)
    const yyOk = /^\d{4}$/.test(String(form.expiryYear))
    const cvvOk = /^\d{3,4}$/.test(form.cvv)
    const amountOk = Number(form.amount) > 0
    return digits.length >= 12 && digits.length <= 19 && mmOk && yyOk && cvvOk && amountOk
  }, [form])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!user) return
    if (!isValidCard) {
      setError('Please enter a valid payment and amount')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        user_id: user.user_id || user.id || user.userId, // be resilient to stored shapes
        amount: parseFloat(form.amount),
        donation_type: form.donation_type,
        is_anonymous: !!form.is_anonymous,
        dedication_message: form.dedication_message?.trim() || null,
        payment_method: 'Credit Card',
      }
  const resp = await donationService.createDonation(payload)
  // Success: go back to Support donors section with a toast-like alert
  alert('Thank you for your donation!')
  navigate('/support#donors-section')
    } catch (err) {
      console.error('Donation failed', err)
      setError(err.response?.data?.error || 'Donation failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-brand text-white py-16 px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl font-bold">Donate</h1>
          <p className="text-lg mt-2">Support exhibitions, education, and preservation</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Donation Details */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6">Donation</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Amount (USD) *</label>
                    <input
                      type="number"
                      name="amount"
                      min="1"
                      step="0.01"
                      placeholder="50.00"
                      value={form.amount}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Donation Type</label>
                    <select
                      name="donation_type"
                      value={form.donation_type}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand"
                    >
                      <option>General Fund</option>
                      <option>Exhibition Support</option>
                      <option>Education Programs</option>
                      <option>Artwork Acquisition</option>
                      <option>Building Maintenance</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input type="checkbox" id="is_anonymous" name="is_anonymous" checked={form.is_anonymous} onChange={handleChange} className="w-5 h-5" />
                  <label htmlFor="is_anonymous" className="text-sm">Donate anonymously</label>
                </div>

                {!form.is_anonymous && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Name</label>
                      <input type="text" name="name" value={form.name} disabled className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Email</label>
                      <input type="email" name="email" value={form.email} disabled className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg bg-gray-50" />
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-semibold mb-2">Dedication Message (optional)</label>
                  <textarea name="dedication_message" value={form.dedication_message} onChange={handleChange} rows="3" className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand" placeholder="In honor of..." />
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-2">Payment Information</h2>
                <p className="text-sm text-gray-600 mb-6">Card details are validated for format only and are NOT stored</p>

                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Payment Method *</label>
                  <div className="flex gap-4">
                    {['Credit Card', 'Debit Card', 'Mobile Payment'].map(method => (
                      <label key={method} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="payment_method"
                          value={method}
                          checked={form.payment_method === method}
                          onChange={(e) => setForm(prev => ({ ...prev, payment_method: e.target.value }))}
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
                      value={form.cardNumber}
                      onChange={handleChange}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Name on Card *</label>
                    <input
                      type="text"
                      name="cardName"
                      value={form.cardName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Expiry Date *</label>
                      <div className="flex gap-2">
                        <select
                          name="expiryMonth"
                          value={form.expiryMonth}
                          onChange={handleChange}
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand"
                          required
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
                          value={form.expiryYear}
                          onChange={handleChange}
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand"
                          required
                        >
                          <option value="">YYYY</option>
                          {Array.from({ length: 10 }, (_, i) => (
                            <option key={i} value={thisYear + i}>
                              {thisYear + i}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">CVV *</label>
                      <input
                        type="text"
                        name="cvv"
                        value={form.cvv}
                        onChange={handleChange}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {error && <div className="text-red-600">{error}</div>}

              <button
                type="submit"
                className="w-full bg-brand text-white py-4 rounded-lg font-bold text-xl hover:bg-brand-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={submitting || !isValidCard}
              >
                {submitting ? 'Processing...' : 'Donate Now'}
              </button>
            </form>
          </div>

          {/* Right column: small summary/help */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 sticky top-24">
              <h2 className="text-2xl font-bold mb-4">Your Impact</h2>
              <p className="text-gray-700 text-sm">
                Your donation directly supports exhibitions, education programs, and preservation efforts.
              </p>
              <ul className="list-disc text-sm ml-5 mt-4 space-y-1 text-gray-700">
                <li>Secure processing</li>
                <li>Tax-deductible contribution</li>
                <li>Optional anonymous giving</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Donate
