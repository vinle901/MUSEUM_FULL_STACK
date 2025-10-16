import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const Artwork = () => {
  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        setLoading(true)
        const response = await axios.get('http://localhost:3000/artworks')
        setArtworks(response.data)
      } catch (error) {
        console.error('Error fetching artworks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArtworks()
  }, [])

  if (loading) {
    return <div className="p-5 text-center">Loading artworks...</div>
  }

  return (
    <div className="p-5">
      <h1 className="text-3xl font-bold mb-6">Artwork Gallery</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {artworks.map((artwork) => (
          <Link
            key={artwork.id}
            to={`/artworks/${artwork.id}`}
            className="border border-gray-300 rounded-lg p-4 transition-shadow hover:shadow-lg block"
          >
            <img
              src={artwork.picture_url}
              alt={artwork.title}
              className="w-full h-48 object-cover rounded"
            />
            <h3 className="mt-3 mb-2 text-lg font-semibold">{artwork.title}</h3>
            <p className="text-gray-500 text-sm">
              {artwork.artwork_type} • {artwork.creation_date || 'Unknown'}
            </p>
            {artwork.is_on_display && (
              <span className="inline-block mt-2 px-2 py-1 bg-green-500 text-white rounded text-xs">
                On Display
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Artwork