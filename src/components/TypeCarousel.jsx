import { useState, useEffect } from 'react'
import TypeCard from './TypeCard'
import { getItemsPerPage } from '../utils/artworkHelpers'

const TypeCarousel = ({ artworkTypes }) => {
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage())

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(getItemsPerPage())
      setCarouselIndex(0) // Reset to first page on resize
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const totalPages = Math.ceil(artworkTypes.length / itemsPerPage)
  const currentPageTypes = artworkTypes.slice(
    carouselIndex * itemsPerPage,
    (carouselIndex + 1) * itemsPerPage
  )

  const handlePrev = () => {
    setCarouselIndex(prev => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCarouselIndex(prev => Math.min(totalPages - 1, prev + 1))
  }

  return (
    <div className="mt-16 pt-12 border-t-2 border-gray-200">
      <h2 className="text-3xl font-bold text-black mb-6">Explore by Type</h2>

      <div className="relative">
        {/* Navigation arrows and counter */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={handlePrev}
            disabled={carouselIndex === 0}
            className="p-2 rounded-lg border-2 border-gray-300 hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Previous types"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-lg font-semibold text-black">
            {carouselIndex + 1} of {totalPages}
          </div>

          <button
            onClick={handleNext}
            disabled={carouselIndex === totalPages - 1}
            className="p-2 rounded-lg border-2 border-gray-300 hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Next types"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Type cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {currentPageTypes.map((type) => (
            <TypeCard key={type.name} type={type} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TypeCarousel
