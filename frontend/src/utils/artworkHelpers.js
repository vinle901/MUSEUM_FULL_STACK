// Re-export image utilities for convenience
export { getImageUrl } from './imageHelpers'

/**
 * Convert artwork type to URL-safe slug
 * @param {string} type - The artwork type
 * @returns {string} URL-safe slug
 */
export const typeToSlug = (type) => {
  return type.toLowerCase().replace(/\s+/g, '-')
}

/**
 * Get the actual type name from filtered artworks
 * @param {Array} artworks - Array of artworks
 * @returns {string|null} The actual type name or null
 */
export const getActualTypeName = (artworks) => {
  if (!artworks || artworks.length === 0) return null
  return artworks[0].artwork_type
}

/**
 * Get artist name by ID from artists array
 * @param {number} artistId - The artist ID
 * @param {Array} artists - Array of artists
 * @returns {string} Artist name or 'Unknown Artist'
 */
export const getArtistName = (artistId, artists) => {
  const artist = artists.find(a => a.artist_id == artistId)
  return artist ? artist.name : 'Unknown Artist'
}

/**
 * Calculate items per page based on window width
 * @returns {number} Number of items per page
 */
export const getItemsPerPage = () => {
  if (typeof window === 'undefined') return 6
  const width = window.innerWidth
  if (width < 640) return 2 // mobile
  if (width < 1024) return 3 // tablet
  if (width < 1280) return 4 // small desktop
  if (width < 1536) return 6 // large desktop
  return 6 // xl desktop
}
