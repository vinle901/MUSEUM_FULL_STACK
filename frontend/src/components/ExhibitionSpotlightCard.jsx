import React from 'react'
import { getImageUrl } from '../utils/imageHelpers'

/**
 * ExhibitionSpotlightCard
 * Big visual card similar to museum hero tiles with an overlaid white info panel.
 * Props:
 *  - exhibition: { exhibition_name, picture_url, start_date, end_date, location, exhibition_type }
 *  - onDetails: function to invoke when user clicks Details
 *  - align: 'left' | 'right' (which side the overlay sits) default: 'left'
 */
const ExhibitionSpotlightCard = ({ exhibition, onDetails, align = 'left' }) => {
  if (!exhibition) return null

  const { exhibition_name, picture_url, exhibition_type } = exhibition

  // Position image and panel on opposite sides
  const imageSideClass = align === 'right' ? 'ml-auto' : 'mr-auto'
  const overlaySide = align === 'right' ? 'left-6 sm:left-10' : 'right-6 sm:right-10'

  return (
    <div className="relative w-full group">
      {/* Image (70% width, alternate side) */}
      <div className={`bg-gray-100 ${imageSideClass} w-[70%] h-[320px] sm:h-[380px] md:h-[440px] lg:h-[500px]`}>
        <img
          src={getImageUrl(picture_url)}
          alt={exhibition_name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Floating Info Panel */}
      <div
        className={`absolute -bottom-10 ${overlaySide} w-[60%] sm:w-[52%] md:w-[48%] lg:w-[46%] translate-y-0 transition-transform duration-300 group-hover:-translate-y-2`}
      >
  <div className="bg-white px-8 sm:px-10 py-10 sm:py-12 shadow-xl min-h-[200px] sm:min-h-[230px] md:min-h-[260px] lg:min-h-[280px] flex flex-col items-start justify-center text-left space-y-6">
          {exhibition_type && (
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              {exhibition_type}
            </div>
          )}
          <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-snug">
            {exhibition_name}
          </h3>
          <button
            type="button"
            onClick={onDetails}
            className="px-3 py-2 text-sm border border-gray-900 text-gray-900 bg-transparent hover:bg-gray-900 hover:text-white transition-colors"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExhibitionSpotlightCard
