import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getEventById, rsvpToEvent } from '../services/eventsService'
import { FaArrowLeft } from 'react-icons/fa'
import { ticketService } from '../services/ticketService'

const EventRSVP = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [attendees, setAttendees] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [membership, setMembership] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await getEventById(id)
        setEvent(data)
      } catch (e) {
        setError(e?.response?.data?.error || 'Failed to load event.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Determine logged in user and membership if needed
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      const token = localStorage.getItem('accessToken')
      if (userStr && token) {
        const u = JSON.parse(userStr)
        setCurrentUser(u)
        // Fetch membership only if event is members-only
        if (event?.is_members_only && u?.id) {
          ticketService.getUserMembership(u.id)
            .then((res) => {
              if (Array.isArray(res) && res.length > 0) setMembership(res[0])
              else setMembership(null)
            })
            .catch(() => setMembership(null))
        }
      } else {
        setCurrentUser(null)
      }
    } catch { /* ignore */ }
  }, [event])

  const isLoggedIn = useMemo(() => Boolean(currentUser && localStorage.getItem('accessToken')), [currentUser])
  const isMembersOnly = useMemo(() => Boolean(event?.is_members_only), [event])
  const hasActiveMembership = useMemo(() => {
    if (!membership) return false
    const activeVal = membership.is_active
    const isActive = (activeVal === 1 || activeVal === true || activeVal === '1')
    if (!isActive) return false
    // Require non-expired membership; treat NULL expiration as non-expiring (active)
    if (!membership.expiration_date) return true
    const exp = new Date(membership.expiration_date)
    const today = new Date(); today.setHours(0,0,0,0)
    return exp >= today
  }, [membership])

  const remainingSpots = (() => {
    if (!event) return null
    if (event.max_capacity == null) return null
    const max = Number(event.max_capacity)
    const cur = Number(event.current_attendees || 0)
    return Math.max(0, max - cur)
  })()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) navigate(-1)
    else navigate('/calendar')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    // Gate members-only
    if (isMembersOnly) {
      if (!isLoggedIn) {
        setError('This event is for members only. Please log in to RSVP.')
        navigate('/login')
        return
      }
      if (!hasActiveMembership) {
        setError('Active membership required to RSVP for this event.')
        return
      }
    }
    if (!name || name.trim().length < 2) {
      setError('Please enter your full name (min 2 characters).')
      return
    }
    const count = Number(attendees)
    if (!Number.isFinite(count) || count <= 0 || count > 20) {
      setError('Please enter a valid number of attendees (1-20).')
      return
    }
    setSubmitting(true)
    try {
      const res = await rsvpToEvent(id, { name: name.trim(), attendees: count })
      setSuccess(res)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to RSVP.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-brand text-white py-14 px-8"><div className="max-w-4xl mx-auto"><h1 className="text-4xl font-bold">Event RSVP</h1></div></div>
        <div className="max-w-3xl mx-auto px-8 py-10">Loading...</div>
      </div>
    )
  }

  if (success) {
    const updated = success?.event
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-brand text-white py-14 px-8"><div className="max-w-4xl mx-auto"><h1 className="text-4xl font-bold">RSVP Confirmed</h1></div></div>
        <div className="max-w-3xl mx-auto px-8 py-10">
          <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6 mb-6">
            <p className="text-green-800 font-semibold">Thanks, {success.name}! You reserved {success.added} spot(s).</p>
            {updated && (
              <p className="text-green-800 mt-1">Current attendees: {updated.current_attendees}{updated.max_capacity != null ? ` / ${updated.max_capacity}` : ''}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/calendar')} className="bg-brand text-white px-5 py-3 rounded-lg font-semibold hover:bg-brand-dark">Back to Calendar</button>
            <Link to="/" className="px-5 py-3 rounded-lg border-2 border-gray-300 font-semibold hover:bg-gray-50">Home</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-brand text-white py-14 px-8"><div className="max-w-4xl mx-auto"><h1 className="text-4xl font-bold">Event RSVP</h1></div></div>
        <div className="max-w-3xl mx-auto px-8 py-10">
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">{error || 'Event not found.'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-brand text-white py-14 px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold">RSVP for {event.event_name}</h1>
          <p className="opacity-90">{new Date(event.event_date).toLocaleDateString()} at {String(event.event_time).slice(0,5)} • {event.location}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8">
        <button type="button" onClick={handleBack} className="inline-flex items-center gap-2 text-gray-700 hover:text-black px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition mb-6">
          <FaArrowLeft /><span>Back</span>
        </button>

        {Boolean(event.is_cancelled) && (
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 mb-6 text-red-800 font-semibold">This event has been cancelled.</div>
        )}

        {isMembersOnly && !isLoggedIn && (
          <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 mb-6 text-yellow-900 font-semibold">
            Members-only event: please log in to RSVP.
          </div>
        )}

        {isMembersOnly && isLoggedIn && !hasActiveMembership && (
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 mb-6 text-red-800 font-semibold">
            This event is for members only. An active membership is required to RSVP.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6 max-w-xl">
          {error && <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}

          <div>
            <label className="block font-semibold mb-2">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand" placeholder="Jane Doe" />
          </div>

          <div>
            <label className="block font-semibold mb-2">Number of Attendees</label>
            <input type="number" min={1} max={20} value={attendees} onChange={(e) => setAttendees(e.target.value)} className="w-40 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand" />
            {remainingSpots != null && (
              <p className="text-sm text-gray-600 mt-1">Remaining spots: {remainingSpots}</p>
            )}
          </div>

          <button type="submit" disabled={submitting || event.is_cancelled || (isMembersOnly && (!isLoggedIn || !hasActiveMembership))} className="bg-brand text-white px-8 py-3 rounded-lg font-semibold hover:bg-brand-dark disabled:opacity-60">
            {submitting ? 'Submitting...' : 'Confirm RSVP'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default EventRSVP
