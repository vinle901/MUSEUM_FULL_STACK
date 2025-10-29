import api from './api'

export const artworkService = {
  getAll: async () => {
    const response = await api.get('/api/artworks')
    return response.data
  },
  getById: async (id) => {
    const response = await api.get(`/api/artworks/${id}`)
    return response.data
  },
  uploadImage: async (imageFile) => {
    const formData = new FormData()
    formData.append('artwork_image', imageFile)

    const response = await api.post('/api/artworks/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
}
