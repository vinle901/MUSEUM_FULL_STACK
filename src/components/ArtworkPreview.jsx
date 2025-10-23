import { Link } from 'react-router-dom'
import { getImageUrl } from '../utils/imageHelpers'
import { useEffect, useState } from 'react'

const ArtworkPreview = ({ artwork, onClose }) => {
  const [navbarHeight, setNavbarHeight] = useState(80)

  useEffect(() => {
    // Detect navbar height dynamically
    const navbar = document.querySelector('.navbar')
    if (navbar) {
      setNavbarHeight(navbar.offsetHeight)
    }

    // Update on resize
    const handleResize = () => {
      const navbar = document.querySelector('.navbar')
      if (navbar) {
        setNavbarHeight(navbar.offsetHeight)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!artwork) return null

  const topOffset = navbarHeight + 20 // navbar height + 20px spacing

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999]"
        onClick={onClose}
        style={{
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Modal Container - Centered Below Navbar */}
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
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-white hover:bg-gray-100 rounded-full p-2.5 shadow-lg transition-all duration-200"
          aria-label="Close preview"
        >
          <svg
            className="w-5 h-5 text-gray-600 hover:text-gray-900"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto" style={{ maxHeight: `calc(100vh - ${topOffset + 20}px)` }}>
          {/* Image Section */}
          <div className="relative bg-gradient-to-br from-gray-100 via-gray-50 to-white flex items-center justify-center p-6 sm:p-8 md:p-12 min-h-[200px] sm:min-h-[250px]">
            <img
              src={getImageUrl(artwork.picture_url)}
              alt={artwork.title}
              className="max-h-[35vh] sm:max-h-[40vh] md:max-h-[45vh] w-auto object-contain drop-shadow-2xl"
            />
          </div>

          {/* Content Section */}
          <div className="p-5 sm:p-6 md:p-8 bg-white">
            {/* Title & Artist */}
            <div className="mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1.5 sm:mb-2 font-['Playfair_Display']">
                {artwork.title}
              </h2>
              {artwork.artist_name && (
                <p className="text-base sm:text-lg md:text-xl text-[#19667C] font-semibold font-['Montserrat']">
                  by {artwork.artist_name}
                </p>
              )}
            </div>

            {/* Status Badge */}
            <div className="mb-4 sm:mb-5">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${
                  artwork.is_on_display
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${artwork.is_on_display ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                {artwork.is_on_display ? 'Currently on Display' : 'Not on Display'}
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5 sm:mb-6">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-1.5 font-['Montserrat']">Artwork Type</p>
                <p className="text-sm sm:text-base font-semibold text-gray-900">{artwork.artwork_type}</p>
              </div>

              {artwork.material && (
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-1.5 font-['Montserrat']">Material</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">{artwork.material}</p>
                </div>
              )}

              {artwork.creation_date && (
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-1.5 font-['Montserrat']">Date Created</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900">{artwork.creation_date}</p>
                </div>
              )}
            </div>

            {/* Description */}
            {artwork.description && (
              <div className="bg-gradient-to-br from-[#eaf2f4] to-white rounded-lg p-4 sm:p-5 border border-[#19667C]/20 mb-5 sm:mb-6">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-2.5 uppercase tracking-wide font-['Montserrat']">About This Artwork</h3>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                  {artwork.description}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to={`/artworks/${artwork.artwork_id}`}
                className="flex-1 bg-[#19667C] hover:bg-[#145261] text-white font-bold py-3.5 px-6 rounded-lg transition-all duration-200 text-center shadow-md hover:shadow-lg font-['Montserrat'] text-sm uppercase tracking-wide"
              >
                View Full Details
              </Link>
              <button
                onClick={onClose}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-bold py-3.5 px-6 rounded-lg transition-all duration-200 border-2 border-gray-300 hover:border-gray-400 font-['Montserrat'] text-sm uppercase tracking-wide"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </>
  )
}

export default ArtworkPreview
