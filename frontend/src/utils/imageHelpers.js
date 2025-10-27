/**
 * Image utility functions for handling backend image URLs
 */

const BACKEND_URL = 'https://backend-a6hl.onrender.com'

/**
 * Get full image URL from relative path
 * @param {string} imagePath - The relative image path from backend
 * @returns {string} Full image URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return ''
  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  // Otherwise, prepend the backend URL
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${BACKEND_URL}${path}`
}

