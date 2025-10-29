import api from './api'

export const artistService = {
  getAll: async () => {
    const response = await api.get('/api/artists')
    return response.data
  },
  getById: async (id) => {
    const response = await api.get(`/api/artists/${id}`)
    return response.data
  },
}
