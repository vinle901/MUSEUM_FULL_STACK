import api from './api'

export const ticketService = {
  getTicketTypes: async () => {
    const response = await api.get('/api/ticket_types')
    return response.data
  },
}
