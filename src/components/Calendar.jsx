import { useState, useEffect } from 'react'
import EventCard from './EventCard'
import api from '../services/api'

const Calendar = () => {
  const [events, setEvents] = useState([])
  const [exhibitions, setExhibitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const categories = ['All', 'Event', 'Exhibition']

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const eventsRes = await api.get('/api/events')
        const exhibitionsRes = await api.get('/api/exhibitions')
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

  const filteredExhibitions = exhibitions
    .filter(ex => filterByDate(ex, 'start_date'))
    .filter(() => filterByCategory('Exhibition'))

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
        {filteredExhibitions.length > 0 && (
          <>
            <h2 className="text-4xl font-semibold mt-12 mb-10">Exhibitions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredExhibitions.map((ex) => (
                <EventCard
                  key={ex.exhibition_id}
                  name={ex.exhibition_name}
                  startDate={ex.start_date}
                  endDate={ex.end_date}
                  location={ex.location}
                  isMemberOnly={!!ex.is_members_only}
                  type="Exhibition"
                  pictureUrl={ex.picture_url}
                />
              ))}
            </div>
          </>
        )}

        {/* Events */}
        {filteredEvents.length > 0 && (
          <>
            <h2 className="text-4xl font-semibold mb-10 mt-15">Events</h2>
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
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Calendar
