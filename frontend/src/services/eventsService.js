import api from './api'

export const getEventById = async (id) => {
  const { data } = await api.get(`/api/events/${id}`)
  return data
}

export const rsvpToEvent = async (id, payload) => {
  const { data } = await api.post(`/api/events/${id}/rsvp`, payload)
  return data
}

export default {
  getEventById,
  rsvpToEvent,
}
