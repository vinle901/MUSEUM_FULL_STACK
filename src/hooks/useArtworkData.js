import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../utils/artworkConstants'

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
        const [artworksResponse, artistsResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/artworks`),
          axios.get(`${API_BASE_URL}/artists`)
        ])
        setArtworks(artworksResponse.data)
        setArtists(artistsResponse.data)
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
