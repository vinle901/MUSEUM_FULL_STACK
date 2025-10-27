import { useState, useEffect } from 'react'

/**
 * Custom hook to track scroll position
 * @returns {number} Current scroll Y position
 */
export const useScrollPosition = () => {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return scrollY
}
