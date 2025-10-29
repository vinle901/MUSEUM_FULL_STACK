import { useMemo } from 'react'
import { typeToSlug, getActualTypeName } from '../utils/artworkHelpers'

/**
 * Custom hook to filter artworks by type
 * @param {Array} artworks - Array of all artworks
 * @param {string} typeName - Type slug from URL params
 * @returns {Object} { filteredArtworks, actualTypeName, artworkTypes }
 */
export const useArtworkFilters = (artworks, typeName) => {
  // Filter artworks by type if typeName is provided
  const filteredArtworks = useMemo(() => {
    if (!typeName) return artworks
    // Compare URLs directly by converting artwork type to URL slug format
    return artworks.filter(artwork => {
      const artworkSlug = typeToSlug(artwork.artwork_type)
      return artworkSlug === typeName.toLowerCase()
    })
  }, [artworks, typeName])

  // Get the actual type name from filtered artworks (for proper display)
  const actualTypeName = useMemo(() => {
    if (!typeName) return null
    return getActualTypeName(filteredArtworks)
  }, [typeName, filteredArtworks])

  // Get unique artwork types with counts and sample image
  const artworkTypes = useMemo(() => {
    const typeCounts = {}
    const typeImages = {}

    artworks.forEach(artwork => {
      const type = artwork.artwork_type
      typeCounts[type] = (typeCounts[type] || 0) + 1

      // Store first artwork image for this type
      if (!typeImages[type]) {
        typeImages[type] = artwork.picture_url
      }
    })

    return Object.entries(typeCounts).map(([type, count]) => ({
      name: type,
      count,
      urlSlug: typeToSlug(type),
      imageUrl: typeImages[type]
    }))
  }, [artworks])

  return { filteredArtworks, actualTypeName, artworkTypes }
}
