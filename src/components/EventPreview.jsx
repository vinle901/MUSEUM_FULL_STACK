import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getImageUrl } from '../utils/imageHelpers'

const EventPreview = ({ item, type, onClose }) => {
  const [navbarHeight, setNavbarHeight] = useState(80)

  useEffect(() => {
    const navbar = document.querySelector('.navbar')
    if (navbar) setNavbarHeight(navbar.offsetHeight)
    const handleResize = () => {
      const nav = document.querySelector('.navbar')
      if (nav) setNavbarHeight(nav.offsetHeight)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!item) return null

  const title = item.event_name || item.exhibition_name || item.name || item.title
  const description = item.description || 'No description available.'
  const location = item.location || ''
  const pictureUrl = item.picture_url || item.pictureUrl || ''

  // Dates
  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return d }
  }
  // For exhibitions that are permanent (exhibition_type === 'permanent'), show a friendly text
  const isPermanentExhibition = type !== 'Event' && item.exhibition_type && String(item.exhibition_type).toLowerCase() === 'permanent'

  const when = type === 'Event'
    ? `${formatDate(item.event_date || item.date)}${item.event_time ? ` at ${String(item.event_time).slice(0,5)}` : ''}`
    : isPermanentExhibition
      ? 'Permanent exhibition — ongoing'
      : `${formatDate(item.start_date || item.startDate)}${(item.end_date || item.endDate) ? ` - ${formatDate(item.end_date || item.endDate)}` : ''}`

  const topOffset = navbarHeight + 20

  // Helpers to determine exhibition timing (local versions so preview is self-contained)
  const toDateOnly = (d) => {
    if (!d) return null
    const t = new Date(d)
    if (isNaN(t)) return null
    return new Date(t.getFullYear(), t.getMonth(), t.getDate())
  }

  const isActiveFlag = (it) => (it.is_active === undefined || it.is_active === null) ? true : !!it.is_active

  const isCurrentExhibitionLocal = (it) => {
    if (!it) return false
    if (isPermanentExhibition) return true
    const today = new Date()
    const start = toDateOnly(it.start_date || it.startDate)
    const end = toDateOnly(it.end_date || it.endDate)
    const active = isActiveFlag(it)
    if (!active) return false
    if (start && end) return start <= today && end >= today
    if (start && !end) return start <= today
    return false
  }

  const isPastExhibitionLocal = (it) => {
    if (!it) return false
    const end = toDateOnly(it.end_date || it.endDate)
    if (!end) return false
    const today = new Date()
    return end < today
  }

  const isUpcomingExhibitionLocal = (it) => {
    if (!it) return false
    const start = toDateOnly(it.start_date || it.startDate)
    const active = isActiveFlag(it)
    if (!start) return false
    const today = new Date()
    return start > today && active
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999]"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 z-[10000] w-[calc(100%-1.5rem)] sm:w-[85vw] md:w-[75vw] lg:w-[65vw] xl:w-[55vw] max-w-[900px] bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          top: `${topOffset}px`,
          transform: 'translateX(-50%)',
          maxHeight: `calc(100vh - ${topOffset + 20}px)`,
          animation: 'slideUp 0.25s ease-out'
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-white hover:bg-gray-100 rounded-full p-2.5 shadow-lg transition-all duration-200"
          aria-label="Close preview"
        >
          <svg className="w-5 h-5 text-gray-600 hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto" style={{ maxHeight: `calc(100vh - ${topOffset + 20}px)` }}>
          {/* Image */}
          <div className="relative bg-gray-50 flex items-center justify-center p-6 sm:p-8 md:p-12 min-h-[200px] sm:min-h-[250px]">
            {pictureUrl && (
              <img
                src={getImageUrl(pictureUrl)}
                alt={title}
                className="max-h-[35vh] sm:max-h-[40vh] md:max-h-[45vh] w-auto object-contain drop-shadow-2xl"
              />
            )}
          </div>

          {/* Content */}
          <div className="p-5 sm:p-6 md:p-8 bg-white">
            <div className="mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 font-['Playfair_Display']">{title}</h2>
              {location && (
                <p className="text-base sm:text-lg text-[#19667C] font-semibold font-['Montserrat']">{location}</p>
              )}
              {type === 'Event' && item.is_members_only ? (
                <span className="inline-block mt-3 mb-3 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                  Member Exclusive
                </span>
              ) : null}
              <p className="text-sm text-gray-600 mt-1">{when}</p>
            </div>

            <div className="bg-gradient-to-br from-[#eaf2f4] to-white rounded-lg p-4 sm:p-5 border border-[#19667C]/20 mb-5 sm:mb-6">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide font-['Montserrat']">About</h3>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{description}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              {type === 'Event' ? (
                <Link
                  to="/login"
                  className="bg-[#19667C] hover:bg-[#145261] text-white font-bold py-3 px-5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-['Montserrat'] text-sm"
                >
                  RSVP
                </Link>
              ) : (
                // For exhibitions: only show Buy Ticket if the exhibition is current/ongoing (including permanent)
                isCurrentExhibitionLocal(item) ? (
                  <Link
                    to="/visit#ticket-section"
                    className="bg-[#19667C] hover:bg-[#145261] text-white font-bold py-3 px-5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-['Montserrat'] text-sm"
                  >
                    Buy Ticket
                  </Link>
                ) : null
              )}

              <button
                onClick={onClose}
                className="bg-white hover:bg-gray-50 text-gray-700 font-bold py-3 px-5 rounded-lg transition-all duration-200 border-2 border-gray-300 hover:border-gray-400 font-['Montserrat'] text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </>
  )
}

export default EventPreview
