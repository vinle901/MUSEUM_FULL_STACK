import api from './api'

export const cafeteriaService = {
  // Get all available cafeteria items
  getAllItems: async () => {
    const response = await api.get('/api/cafeteria')
    return response.data
  },

  // Get item by ID
  getItemById: async (id) => {
    const response = await api.get(`/api/cafeteria/${id}`)
    return response.data
  },

  // Get items by category
  getItemsByCategory: async (category) => {
    const response = await api.get(`/api/cafeteria/category/${category}`)
    return response.data
  },

  // Get items by dietary preference (vegetarian/vegan)
  getItemsByDietary: async (type) => {
    const response = await api.get(`/api/cafeteria/dietary/${type}`)
    return response.data
  },

  // Admin/Employee: Create new item
  createItem: async (itemData) => {
    const response = await api.post('/api/cafeteria', itemData)
    return response.data
  },

  // Admin/Employee: Update item
  updateItem: async (id, itemData) => {
    const response = await api.put(`/api/cafeteria/${id}`, itemData)
    return response.data
  },
}

export default cafeteriaService
