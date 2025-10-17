import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ArtworkPreview from './ArtworkPreview'
import ArtworkCard from './ArtworkCard'
import HeroBanner from './HeroBanner'
import TypeCarousel from './TypeCarousel'
import { useArtworkData } from '../hooks/useArtworkData'
import { useArtworkFilters } from '../hooks/useArtworkFilters'
import { useScrollPosition } from '../hooks/useScrollPosition'
import { getArtistName } from '../utils/artworkHelpers'
import { INITIAL_DISPLAY_LIMIT, MAX_DISPLAY_LIMIT } from '../utils/artworkConstants'

const Artwork = () => {
  const { typeName } = useParams()
  const scrollY = useScrollPosition()
  const { artworks, artists, loading } = useArtworkData()
  const { filteredArtworks, actualTypeName, artworkTypes } = useArtworkFilters(artworks, typeName)

  const [previewArtwork, setPreviewArtwork] = useState(null)
  const [visibleCount, setVisibleCount] = useState(INITIAL_DISPLAY_LIMIT)

  // Reset visible count when type changes and scroll to top
  useEffect(() => {
    setVisibleCount(INITIAL_DISPLAY_LIMIT)
    if (typeName) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [typeName])

  const displayedArtworks = filteredArtworks.slice(0, Math.min(visibleCount, MAX_DISPLAY_LIMIT))
  const hasMore = visibleCount < Math.min(filteredArtworks.length, MAX_DISPLAY_LIMIT)

  const handleShowMore = () => {
    setVisibleCount(Math.min(filteredArtworks.length, MAX_DISPLAY_LIMIT))
  }

  const handleArtworkClick = (artwork) => {
    setPreviewArtwork({
      ...artwork,
      artist_name: getArtistName(artwork.artist_id, artists)
    })
  }

  if (loading) {
    return <div className="p-5 text-center">Loading artworks...</div>
  }

  const bannerTitle = actualTypeName || 'Artworks'
  const bannerDescription = typeName
    ? `Discover ${filteredArtworks.length} ${actualTypeName || typeName.replace(/-/g, ' ')} artworks in our collection.`
    : 'Explore our collection of nearly 160,000 works spanning the history of World art from the Middle Ages to today.'

  const sectionTitle = actualTypeName ? `${actualTypeName} Collection` : 'A few of our favorites'

  return (
    <div>
      {/* Header Banner */}
      <HeroBanner
        scrollY={scrollY}
        title={bannerTitle}
        description={bannerDescription}
      />

      <div className="px-8 py-8 bg-white relative z-40">
        {/* Artwork Preview Modal */}
        {previewArtwork && (
          <ArtworkPreview
            artwork={previewArtwork}
            onClose={() => setPreviewArtwork(null)}
          />
        )}

        {/* Back button for filtered views */}
        {typeName && (
          <div className="mb-8">
            <Link
              to="/artworks"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to All Artworks
            </Link>
          </div>
        )}

        {/* Section Title */}
        <h1 className="text-3xl font-bold text-black mb-8">
          {sectionTitle}
        </h1>

        {/* Artwork Grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-6 space-y-6">
          {displayedArtworks.map((artwork) => (
            <ArtworkCard
              key={artwork.id}
              artwork={artwork}
              artistName={getArtistName(artwork.artist_id, artists)}
              onClick={() => handleArtworkClick(artwork)}
            />
          ))}
        </div>

        {/* Show More Button */}
        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleShowMore}
              className="relative px-6 py-3 border-2 border-gray-300 font-semibold rounded-lg overflow-hidden group"
            >
              <span
                className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out"
                style={{ backgroundColor: '#181A1B' }}
              ></span>
              <span className="relative z-10 text-black group-hover:text-white transition-colors duration-300">
                Show More Artworks +
              </span>
            </button>
          </div>
        )}

        {/* Type Carousel - only show on main artworks page */}
        {!typeName && artworkTypes.length > 0 && (
          <TypeCarousel artworkTypes={artworkTypes} />
        )}
      </div>
    </div>
  )
}

export default Artwork
