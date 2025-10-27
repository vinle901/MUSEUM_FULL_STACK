// File: src/services/donationService.js
import api from './api'

export const donationService = {
  getTopDonors: async ({ year, limit } = {}) => {
    const params = {}
    if (year) params.year = year
    if (limit) params.limit = limit
    const { data } = await api.get('/api/donations/top', { params })
    return data
  },

  createDonation: async (payload) => {
    // payload: { user_id, amount, donation_type, is_anonymous, dedication_message, payment_method }
    const { data } = await api.post('/api/donations/checkout', payload)
    return data
  }
}

export default donationService
