import api from './api'

export const authService = {
  /**
   * Register a new user
   */
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData)
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken)
      localStorage.setItem('user', JSON.stringify(response.data.user))
    }
    return response.data
  },

  /**
   * Login user
   */
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password })
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken)
      localStorage.setItem('user', JSON.stringify(response.data.user))
    }
    return response.data
  },

  /**
   * Logout user
   */
  logout: async () => {
    await api.post('/api/auth/logout')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('user')
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser: async () => {
    const response = await api.get('/api/users/profile')
    return response.data || null
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken')
  },

  /**
   * Refresh access token
   */
  refreshToken: async () => {
    const response = await api.post('/api/auth/refresh')
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken)
    }
    return response.data
  },
}
