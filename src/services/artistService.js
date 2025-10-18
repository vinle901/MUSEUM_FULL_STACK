import api from './api'

export const artistService = {
  getAll: async () => {
    const response = await api.get('/artists')
    return response.data
  },
  getById: async (id) => {
    const response = await api.get(`/artists/${id}`)
    return response.data
  },
}
