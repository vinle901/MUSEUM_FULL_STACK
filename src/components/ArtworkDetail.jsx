import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const ArtworkDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [artwork, setArtwork] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchArtwork = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`http://localhost:3000/artworks/${id}`)
        setArtwork(response.data)
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
    <div className="p-5 max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/artworks')}
        className="mb-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
      >
        ← Back to Gallery
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <img
            src={artwork.picture_url}
            alt={artwork.title}
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-4">{artwork.title}</h1>

          <div className="space-y-3">
            <p>
              <strong>Type:</strong> {artwork.artwork_type}
            </p>
            <p>
              <strong>Material:</strong> {artwork.material}
            </p>
            {artwork.creation_date && (
              <p>
                <strong>Created:</strong> {artwork.creation_date}
              </p>
            )}
            {artwork.acquisition_date && (
              <p>
                <strong>Acquired:</strong> {artwork.acquisition_date}
              </p>
            )}
            <p>
              <strong>Status:</strong>{' '}
              <span className={artwork.is_on_display ? 'text-green-500' : 'text-gray-400'}>
                {artwork.is_on_display ? 'On Display' : 'Not on Display'}
              </span>
            </p>
            {artwork.is_on_display && (
              <span className="inline-block px-3 py-1 bg-green-500 text-white rounded text-sm">
                Currently on Display
              </span>
            )}
          </div>

          <div className="mt-6">
            <strong className="text-lg">Description:</strong>
            <p className="mt-2 leading-relaxed text-gray-700">{artwork.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArtworkDetail
