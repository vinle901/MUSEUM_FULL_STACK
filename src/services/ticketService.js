import api from './api'

export const ticketService = {
  getTicketTypes: async () => {
    const response = await api.get('/ticket_types')
    return response.data
  },
}
