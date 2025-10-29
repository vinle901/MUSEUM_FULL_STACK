// Frontend authService
// Location: src/services/authService.js

import api from './api'

export const authService = {
  /**
   * Get current user - checks localStorage first, NO API call if not logged in
   * Returns null for guests instead of throwing errors
   */
  getCurrentUser: async () => {
    // First check if we have a token - if not, user is a guest
    const token = localStorage.getItem('accessToken')
    const userStr = localStorage.getItem('user')
    
    if (!token || !userStr) {
      // No token means guest - return null WITHOUT making API call
      return null
    }

    try {
      // Parse stored user data
      const user = JSON.parse(userStr)
      
      // Optionally verify token is still valid by making API call
      // But if this fails with 401, let it be caught by the caller
      try {
        const response = await api.get('/api/users/profile')
        return response.data
      } catch (error) {
        // If profile fetch fails, still return stored user data
        // The api interceptor will handle token refresh automatically
        if (error.response?.status === 401) {
          // Token invalid/expired - return null
          localStorage.removeItem('accessToken')
          localStorage.removeItem('user')
          return null
        }
        // For other errors, return stored user
        return user
      }
    } catch (parseError) {
      // If parsing fails, user data is corrupted - treat as guest
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
      return null
    }
  },

  /**
   * Login user
   */
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password })
    const { accessToken, user } = response.data
    
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('user', JSON.stringify(user))
    
    return { accessToken, user }
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      await api.post('/api/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage regardless of API call success
      localStorage.removeItem('accessToken')
      localStorage.removeItem('user')
    }
  },

  /**
   * Register new user
   */
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData)
    const { accessToken, user } = response.data
    
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('user', JSON.stringify(user))
    
    return { accessToken, user }
  },

  /**
   * Check if user is logged in (just checks localStorage, no API call)
   */
  isLoggedIn: () => {
    const token = localStorage.getItem('accessToken')
    const user = localStorage.getItem('user')
    return !!(token && user)
  }
}

export default authService