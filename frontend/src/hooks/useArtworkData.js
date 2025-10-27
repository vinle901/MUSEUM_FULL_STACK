import { useState, useEffect } from 'react'
import { artworkService } from '../services/artworkService'
import { artistService } from '../services/artistService'

/**
 * Custom hook to fetch artwork and artist data
 * @returns {Object} { artworks, artists, loading, error }
 */
export const useArtworkData = () => {
  const [artworks, setArtworks] = useState([])
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [artworksData, artistsData] = await Promise.all([
          artworkService.getAll(),
          artistService.getAll()
        ])
        setArtworks(artworksData)
        setArtists(artistsData)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return { artworks, artists, loading, error }
}
