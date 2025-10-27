import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { artworkService } from '../services/artworkService'
import { artistService } from '../services/artistService'
import { getImageUrl } from '../utils/imageHelpers'

const ArtworkDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [artwork, setArtwork] = useState(null)
  const [artist, setArtist] = useState(null)
  const [loading, setLoading] = useState(true)

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  useEffect(() => {
    const fetchArtwork = async () => {
      try {
        setLoading(true)
        const artworkData = await artworkService.getById(id)
        setArtwork(artworkData)

        // Fetch artist data
        if (artworkData.artist_id) {
          const artistData = await artistService.getById(artworkData.artist_id)
          setArtist(artistData)
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading artwork...</p>
        </div>
      </div>
    )
  }

  if (!artwork) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12">
          <svg className="w-24 h-24 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-2xl font-bold text-gray-700">Artwork not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="p-6 max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/artworks')}
          className="mb-8 px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 bg-white hover:bg-brand text-gray-700 hover:text-white font-semibold shadow-md hover:shadow-xl transform hover:-translate-x-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Gallery
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Image Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-300 p-6">
              <img
                src={getImageUrl(artwork.picture_url)}
                alt={artwork.title}
                className="w-full h-auto object-contain max-h-[800px] mx-auto bg-white rounded-xl"
              />
              {console.log(getImageUrl(artwork.picture_url))}
            </div>

            {/* Description Section */}
            {artwork.description && (
              <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 text-gray-800">
                  <div className="bg-brand/10 p-2 rounded-lg">
                    <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                  </div>
                  About This Artwork
                </h2>
                <p className="leading-relaxed text-gray-700 text-lg">{artwork.description}</p>
              </div>
            )}
          </div>

          {/* Details Sidebar */}
          <div className="space-y-6">
            {/* Title and Status Card */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-8 border border-gray-200 hover:shadow-2xl transition-all duration-300">
              <h1 className="text-4xl font-bold mb-6 text-gray-900 leading-tight">{artwork.title}</h1>

              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow-md transition-all duration-300 ${
                    artwork.is_on_display
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:scale-105'
                      : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                  }`}
                >
                  {artwork.is_on_display ? (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Currently on Display
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Not on Display
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Artwork Details Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 hover:shadow-2xl transition-all duration-300">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                <div className="bg-brand/10 p-2 rounded-lg">
                  <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Artwork Information
              </h2>

              <div className="space-y-5">
                {artist && (
                  <div className="border-b-2 border-gray-100 pb-4 hover:bg-gray-50 -mx-4 px-4 rounded-lg transition-colors">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Artist</p>
                    <p className="font-bold text-gray-900 text-lg">{artist.name}</p>
                    {artist.nationality && (
                      <p className="text-sm text-gray-600 mt-1.5 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {artist.nationality}
                      </p>
                    )}
                    {(artist.birth_year || artist.death_year) && (
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {artist.birth_year && `${artist.birth_year}`}
                        {artist.death_year && ` - ${artist.death_year}`}
                        {artist.birth_year && !artist.death_year && ' - Present'}
                      </p>
                    )}
                  </div>
                )}

                <div className="border-b-2 border-gray-100 pb-4 hover:bg-gray-50 -mx-4 px-4 rounded-lg transition-colors">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Type</p>
                  <p className="font-bold text-gray-900 text-lg">{artwork.artwork_type}</p>
                </div>

                {artwork.material && (
                  <div className="border-b-2 border-gray-100 pb-4 hover:bg-gray-50 -mx-4 px-4 rounded-lg transition-colors">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Material</p>
                    <p className="font-bold text-gray-900 text-lg">{artwork.material}</p>
                  </div>
                )}

                {artwork.creation_date && (
                  <div className="border-b-2 border-gray-100 pb-4 hover:bg-gray-50 -mx-4 px-4 rounded-lg transition-colors">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Date Created</p>
                    <p className="font-bold text-gray-900 text-lg">{artwork.creation_date}</p>
                  </div>
                )}

                {artwork.acquisition_date && (
                  <div className="border-b-2 border-gray-100 pb-4 hover:bg-gray-50 -mx-4 px-4 rounded-lg transition-colors">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Date Acquired</p>
                    <p className="font-bold text-gray-900 text-lg">{formatDate(artwork.acquisition_date)}</p>
                  </div>
                )}

                <div className="hover:bg-gray-50 -mx-4 px-4 py-2 rounded-lg transition-colors">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Artwork ID</p>
                  <p className="font-mono text-sm bg-gray-100 text-brand px-3 py-1.5 rounded-lg inline-block font-semibold">#{artwork.artwork_id}</p>
                </div>
              </div>
            </div>

            {/* Additional Information Card */}
            <div className={`rounded-2xl p-6 border-2 ${
              artwork.is_on_display
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
            } shadow-lg hover:shadow-xl transition-all duration-300`}>
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
                <div className={`p-2 rounded-lg ${artwork.is_on_display ? 'bg-green-100' : 'bg-gray-200'}`}>
                  <svg className={`w-5 h-5 ${artwork.is_on_display ? 'text-green-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Visitor Information
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {artwork.is_on_display
                  ? 'This artwork is currently available for viewing in our gallery. Come visit us to experience it in person!'
                  : 'This artwork is currently in storage. Check back later or contact us for more information.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-6 border border-gray-200 hover:shadow-2xl transition-all duration-300">
              <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share This Artwork
              </h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  alert('Link copied to clipboard!')
                }}
                className="w-full bg-gradient-to-r from-brand to-gray-800 hover:from-gray-800 hover:to-brand text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Link to Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArtworkDetail
