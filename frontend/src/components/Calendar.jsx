import { useState, useEffect } from 'react'
import EventCard from './EventCard'
import EventPreview from './EventPreview'
import api from '../services/api'

const Calendar = () => {
  const [events, setEvents] = useState([])
  const [exhibitions, setExhibitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [exhibitionFilter, setExhibitionFilter] = useState('Current') // Current | Past | Upcoming
  const [previewItem, setPreviewItem] = useState(null)
  const [previewType, setPreviewType] = useState(null)

  const openPreview = (item, type) => {
    setPreviewItem(item)
    setPreviewType(type)
  }
  const closePreview = () => {
    setPreviewItem(null)
    setPreviewType(null)
  }

  const categories = ['All', 'Event', 'Exhibition']

  useEffect(() => {
        const fetchData = async () => {
      try {
        setLoading(true)
        const eventsRes = await api.get('/api/events')
        // Request inactive exhibitions as well so we can show past, inactive items
        const exhibitionsRes = await api.get('/api/exhibitions?include_inactive=true')
        setEvents(eventsRes.data)
        setExhibitions(exhibitionsRes.data)
        setError(null)
      } catch (err) {
        console.error(err)
        setError('Failed to load events or exhibitions.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const resetFilters = () => {
    setStartDate('')
    setEndDate('')
    setSelectedCategory('All')
  }

  const filterByDate = (item, dateField) => {
    if (!startDate && !endDate) return true
    const itemDate = new Date(item[dateField])
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null
    if (start && itemDate < start) return false
    if (end && itemDate > end) return false
    return true
  }

  const filterByCategory = (itemType) => {
    if (selectedCategory === 'All') return true
    return selectedCategory === itemType
  }

  const filteredEvents = events
    .filter(ev => filterByDate(ev, 'event_date'))
    .filter(() => filterByCategory('Event'))

  const isDate = (d) => {
    if (!d) return null
    const t = new Date(d)
    if (isNaN(t)) return null
    // normalize to date only
    return new Date(t.getFullYear(), t.getMonth(), t.getDate())
  }

  const isCurrentExhibition = (ex) => {
    const today = new Date()
    const start = isDate(ex.start_date) || isDate(ex.startDate)
    const end = isDate(ex.end_date) || isDate(ex.endDate)
    // active exhibitions with start <= today and (no end or end >= today)
    if (!ex.is_active && ex.is_active !== true) {
      // treat missing is_active as true fallback
    }
    const active = (ex.is_active === undefined || ex.is_active === null) ? true : !!ex.is_active
    if (!active) return false
    if (start && end) return start <= today && end >= today
    if (start && !end) return start <= today
    // if no start date, consider it not current
    return false
  }

  const isPastExhibition = (ex) => {
    const today = new Date()
    const end = isDate(ex.end_date) || isDate(ex.endDate)
    if (!end) return false
    return end < today
  }

  const isUpcomingExhibition = (ex) => {
    const today = new Date()
    const start = isDate(ex.start_date) || isDate(ex.startDate)
    const active = (ex.is_active === undefined || ex.is_active === null) ? true : !!ex.is_active
    if (!start) return false
    return start > today && active
  }

  const filterByExhibitionTime = (ex) => {
    if (exhibitionFilter === 'All') return true
    if (exhibitionFilter === 'Current') return isCurrentExhibition(ex)
    if (exhibitionFilter === 'Past') return isPastExhibition(ex)
    if (exhibitionFilter === 'Upcoming') return isUpcomingExhibition(ex)
    return true
  }

  const filteredExhibitions = exhibitions
    .filter(ex => filterByDate(ex, 'start_date'))
    .filter(() => filterByCategory('Exhibition'))
    .filter(ex => filterByExhibitionTime(ex))

  if (loading) return <p className="text-center py-16">Loading...</p>
  if (error) return <p className="text-center py-16 text-red-600">{error}</p>

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="bg-brand text-white py-16 px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl font-bold mb-4">Calendar</h1>
          <p className="text-xl">Explore upcoming events and exhibitions</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          {/* Dropdown */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:border-brand"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:border-brand"
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:border-brand"
            />
          </div>

          {/* Reset Button */}
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark self-end"
          >
            Reset Filters
          </button>
        </div>

        {/* Exhibitions */}
        {selectedCategory !== 'Event' && (
          <div className="mt-10">
            <h2 className="text-4xl font-semibold mt-12 mb-4">Exhibitions</h2>

            {/* Time filters: Current / Past / Upcoming (default: Current) */}
            <div className="flex gap-3 mb-6">
              {['Current', 'Past', 'Upcoming'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setExhibitionFilter(opt)}
                  className={`px-3 py-1.5 rounded-md border ${exhibitionFilter === opt ? 'bg-brand text-white' : 'bg-white text-gray-700 border-gray-200'}`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {exhibitionFilter === 'Upcoming' && filteredExhibitions.length === 0 ? (
              <p className="text-gray-500 mt-12">No upcoming exhibitions at this time.</p>
            ) : (
              filteredExhibitions.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {filteredExhibitions.map((ex) => (
                    <EventCard
                      key={ex.exhibition_id || ex.id}
                      name={ex.exhibition_name}
                      startDate={ex.start_date}
                      endDate={ex.end_date}
                      location={ex.location}
                      isMemberOnly={!!ex.is_members_only}
                      type="Exhibition"
                      pictureUrl={ex.picture_url}
                      item={ex}
                      onPreview={openPreview}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* Events */}
        {filteredEvents.length > 0 && (
          <>
            <h2 className="text-4xl font-semibold mt-15">Events</h2>
            <p className="text-gray-600 mb-8 mt-5">Our museum hosts a wide range of engaging events open to all visitors — from educational programs and workshops to family-friendly activities and community gatherings. Our events require RSVPs to ensure a spot, so be sure to register in advance and join us for a fun and memorable expericence.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((ev) => (
                <EventCard
                  key={ev.event_id}
                  name={ev.event_name}
                  startDate={ev.event_date}
                  time={ev.event_time}
                  location={ev.location}
                  isMemberOnly={!!ev.is_members_only}
                  type="Event"
                  pictureUrl={ev.picture_url}
                  item={ev}
                  onPreview={openPreview}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {/* Preview Modal */}
      {previewItem && (
        <EventPreview item={previewItem} type={previewType} onClose={closePreview} />
      )}
    </div>
  )
}

export default Calendar
