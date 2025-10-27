import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ticketService } from '../services/ticketService'
import { authService } from '../services/authService'
import { useCart } from '../context/CartContext'
import { FaArrowLeft } from 'react-icons/fa'

const Ticket = () => {
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([]) // ticket types from DB
  const [quantities, setQuantities] = useState({})
  const [visitDate, setVisitDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Removed success state; success should only occur at Checkout confirmation
  const [currentUser, setCurrentUser] = useState(null)
  const [membership, setMembership] = useState(null)
  const { addToCart } = useCart()
  const isLoggedIn = Boolean(
    typeof window !== 'undefined' &&
    localStorage.getItem('accessToken') &&
    localStorage.getItem('user')
  )

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const [types, user] = await Promise.all([
          ticketService.getTicketTypes(),
          authService.getCurrentUser().catch(() => null),
        ])
        setTickets(types || [])
        setCurrentUser(user)

        // If logged in, try to fetch membership details
        if (user?.user_id) {
          try {
            const res = await ticketService.getUserMembership(user.user_id)
            if (res && res.length > 0) setMembership(res[0])
          } catch (e) {
            // no active membership is fine
          }
        }
      } catch (e) {
        setError('Failed to load ticket types. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const isMemberFree = Boolean(membership?.unlimited_visits)

  const rows = useMemo(() => {
    // Always show original/base prices here; member discounts apply at final checkout only
    return tickets.map(t => {
      const qty = quantities[t.ticket_type_id] || 0
      const price = Number(t.base_price)
      const lineTotal = price * qty
      return {
        id: t.ticket_type_id,
        name: t.ticket_name,
        price, // base price (no discount here)
        qty,
        lineTotal,
      }
    })
  }, [tickets, quantities])

  const subtotal = rows.reduce((s, r) => s + r.lineTotal, 0)
  const totalQty = rows.reduce((s, r) => s + r.qty, 0)
  const hasMemberTicketType = useMemo(() => tickets.some(t => /member/i.test(t.ticket_name)), [tickets])

  const todayISO = new Date().toISOString().split('T')[0]

  const updateQty = (id, val) => {
    const num = Math.max(0, Math.min(20, Number(val) || 0))
    setQuantities(prev => ({ ...prev, [id]: num }))
  }

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/visit')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!visitDate) {
      setError('Please select a visit date.')
      return
    }
    if (totalQty === 0) {
      setError('Please select at least one ticket.')
      return
    }

    // If not logged in and trying to buy any member ticket, force login first
    const selectedRows = rows.filter(r => r.qty > 0)
    const isBuyingMemberTicket = selectedRows.some(r => /member/i.test(r.name))
    if (!isLoggedIn && isBuyingMemberTicket) {
      setError('Member tickets require login. Please log in to purchase member tickets.')
      navigate('/login')
      return
    }

    setSubmitting(true)
    try {
      // Add each selected ticket type to cart as a separate cart line
      selectedRows.forEach(r => {
        const itemId = `ticket:${r.id}:${visitDate}`
        addToCart({
          cart_type: 'ticket',
          item_id: itemId,
          ticket_type_id: r.id,
          item_name: `Ticket — ${r.name}`,
          visit_date: visitDate,
          price: r.price, // add base price; member discounts apply at final checkout
          quantity: r.qty,
          category: 'Tickets',
          image_url: '/museum.png'
        })
      })

  // Navigate straight to cart after adding items; confirmation happens at checkout
  navigate('/cart')
    } catch (err) {
      const msg = err?.message || 'Failed to add tickets to cart.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Removed intermediate success screen; user proceeds to cart and then to checkout

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-brand text-white py-16 px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl font-bold">Add Tickets to Cart</h1>
          {/* Member-specific free admission is handled via dedicated member ticket types, not checkout discounts */}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-gray-700 hover:text-black px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
          aria-label="Go back"
        >
          <FaArrowLeft />
          <span>Back</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-4">
        {loading ? (
          <p>Loading ticket types...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {!isLoggedIn && hasMemberTicketType && (
              <div className="bg-yellow-50 border-2 border-yellow-200 text-yellow-900 rounded-lg p-4">
                Members: Please log in first to purchase tickets and get full discount. 
              </div>
            )}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Choose Visit Date</h2>
              <input
                type="date"
                min={todayISO}
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand"
              />
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Select Tickets</h2>
              <div className="divide-y divide-gray-200">
                {rows.map(r => (
                  <div key={r.id} className="py-4 flex items-center justify-between gap-6">
                    <div>
                      <p className="font-semibold text-lg text-black">{r.name}</p>
                      <p className="text-gray-600">${r.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={r.qty}
                        onChange={(e) => updateQty(r.id, e.target.value)}
                        className="w-24 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand"
                      />
                      <div className="text-right w-24">
                        <p className="text-sm text-gray-600">Line</p>
                        <p className="text-lg font-bold">${r.lineTotal.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-800 rounded-lg p-4">{error}</div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-xl">
                <span className="font-semibold">Total ({totalQty}): </span>
                <span className="font-bold text-brand">${subtotal.toFixed(2)}</span>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-brand text-white px-8 py-3 rounded-lg font-semibold hover:bg-brand-dark disabled:opacity-60"
              >
                {submitting ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default Ticket
