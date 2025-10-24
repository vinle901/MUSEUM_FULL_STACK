// File: src/components/EventCard.jsx

import React from 'react'
import { getImageUrl } from '../utils/imageHelpers'

// Placeholder image for events/exhibitions without a picture
const PLACEHOLDER_IMAGE = '/placeholder-event.jpg' // Put this file in your public folder

const EventCard = ({
  name,
  startDate,
  endDate,
  time,
  location,
  isMemberOnly,
  pictureUrl,
  type,
  item,
  onPreview,
}) => {
  const formatDate = (dateStr) => {
    const dateObj = new Date(dateStr)
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateStr, timeStr) => {
    const formattedDate = formatDate(dateStr)
    if (timeStr) {
      const formattedTime = timeStr.slice(0, 5) // HH:MM
      return `${formattedDate} at ${formattedTime}`
    }
    return formattedDate
  }

  const formatExhibitionDate = (start, end) => {
    const startFormatted = formatDate(start)
    if (end) {
      const endFormatted = formatDate(end)
      return `${startFormatted} - ${endFormatted}`
    }
    return startFormatted
  }

  const imageSrc = getImageUrl(pictureUrl) || PLACEHOLDER_IMAGE

  return (
    <div className="bg-white border-2 border-gray-200 hover:border-brand rounded-xl overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 relative mb-6 group">
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand/0 via-brand/30 to-brand/0 translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 group-hover:ease-in-out z-10 pointer-events-none"></div>

      {/* Image section */}
      <div className="relative overflow-hidden bg-gray-100 z-0">
        <img
          src={imageSrc}
          alt={name}
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Content section */}
      <div className="p-4 relative z-0">
        <h3 className="text-lg font-bold text-black mb-2 flex items-center">
          {name}
          {isMemberOnly && (
            <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
              Member Only
            </span>
          )}
        </h3>
        {time ? (
          <p className="text-gray-600 mb-1">{formatDateTime(startDate, time)}</p>
        ) : (
          // For exhibitions that are permanent (no end date), show friendly text instead of dates
          (item && item.exhibition_type && String(item.exhibition_type).toLowerCase() === 'permanent') ? (
            <p className="text-gray-600 mb-1">Permanent exhibition — ongoing</p>
          ) : (
            <p className="text-gray-600 mb-1">{formatExhibitionDate(startDate, endDate)}</p>
          )
        )}
        <p className="text-gray-500 text-sm">{location}</p>

        {/* Learn more button inside card */}
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onPreview && onPreview(item, type)}
            className="px-3 py-1.5 bg-brand text-white rounded-md text-sm hover:bg-brand-dark transition-colors"
          >
            Learn more
          </button>
        </div>
      </div>
    </div>
  )
}

export default EventCard
