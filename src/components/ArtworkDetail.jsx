import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const ArtworkDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [artwork, setArtwork] = useState(null)
  const [artist, setArtist] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchArtwork = async () => {
      try {
        setLoading(true)
        const artworkResponse = await axios.get(`http://localhost:3000/artworks/${id}`)
        setArtwork(artworkResponse.data)

        // Fetch artist data
        if (artworkResponse.data.artist_id) {
          const artistResponse = await axios.get(`http://localhost:3000/artists/${artworkResponse.data.artist_id}`)
          setArtist(artistResponse.data)
        }
      } catch (error) {
        console.error('Error fetching artwork:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArtwork()
  }, [id])

  if (loading) {
    return <div className="p-5 text-center">Loading artwork...</div>
  }

  if (!artwork) {
    return <div className="p-5 text-center">Artwork not found</div>
  }

  return (
    <div className="p-5 max-w-7xl mx-auto">
      <button
        onClick={() => navigate('/artworks')}
        className="mb-6 px-4 py-2 rounded transition-all flex items-center gap-2 border-2 border-brand font-semibold text-black bg-white hover:bg-brand hover:text-white"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Gallery
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Image Section */}
        <div className="lg:col-span-2">
          <div className="bg-gray-100 rounded-lg overflow-hidden shadow-xl">
            <img
              src={artwork.picture_url}
              alt={artwork.title}
              className="w-full h-auto object-contain max-h-[600px] mx-auto bg-white"
            />
          </div>

          {/* Description Section */}
          {artwork.description && (
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                About This Artwork
              </h2>
              <p className="leading-relaxed text-black">{artwork.description}</p>
            </div>
          )}
        </div>

        {/* Details Sidebar */}
        <div className="space-y-6">
          {/* Title and Status Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-3xl font-bold mb-4 text-black">{artwork.title}</h1>

            <div className="mb-4">
              <span
                className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                  artwork.is_on_display
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-100 text-black border border-gray-300'
                }`}
              >
                {artwork.is_on_display ? '✓ Currently on Display' : 'Not on Display'}
              </span>
            </div>
          </div>

          {/* Artwork Details Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold mb-4 text-black flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Artwork Information
            </h2>

            <div className="space-y-4">
              {artist && (
                <div className="border-b pb-3">
                  <p className="text-sm text-black mb-1">Artist</p>
                  <p className="font-semibold text-black">{artist.name}</p>
                  {artist.nationality && (
                    <p className="text-sm text-black mt-1">{artist.nationality}</p>
                  )}
                  {(artist.birth_year || artist.death_year) && (
                    <p className="text-sm text-black">
                      {artist.birth_year && `${artist.birth_year}`}
                      {artist.death_year && ` - ${artist.death_year}`}
                      {artist.birth_year && !artist.death_year && ' - Present'}
                    </p>
                  )}
                </div>
              )}

              <div className="border-b pb-3">
                <p className="text-sm text-black mb-1">Type</p>
                <p className="font-semibold text-black">{artwork.artwork_type}</p>
              </div>

              {artwork.material && (
                <div className="border-b pb-3">
                  <p className="text-sm text-black mb-1">Material</p>
                  <p className="font-semibold text-black">{artwork.material}</p>
                </div>
              )}

              {artwork.creation_date && (
                <div className="border-b pb-3">
                  <p className="text-sm text-black mb-1">Date Created</p>
                  <p className="font-semibold text-black">{artwork.creation_date}</p>
                </div>
              )}

              {artwork.acquisition_date && (
                <div className="border-b pb-3">
                  <p className="text-sm text-black mb-1">Date Acquired</p>
                  <p className="font-semibold text-black">{artwork.acquisition_date}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-black mb-1">Artwork ID</p>
                <p className="font-mono text-sm text-black">#{artwork.id}</p>
              </div>
            </div>
          </div>

          {/* Additional Information Card */}
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-6">
            <h3 className="font-bold text-black mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Visitor Information
            </h3>
            <p className="text-sm text-black">
              {artwork.is_on_display
                ? 'This artwork is currently available for viewing in our gallery.'
                : 'This artwork is currently in storage. Check back later or contact us for more information.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-black mb-3">Share This Artwork</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                alert('Link copied to clipboard!')
              }}
              className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArtworkDetail
