import api from './api'

export const ticketService = {
  getTicketTypes: async () => {
    const response = await api.get('/api/ticket_types')
    return response.data
  },
  checkoutTickets: async (payload) => {
    const response = await api.post('/api/transactions/ticket-checkout', payload)
    return response.data
  },
  getUserMembership: async (userId) => {
    const response = await api.get(`/api/memberships/user/${userId}`)
    return response.data
  }
}
