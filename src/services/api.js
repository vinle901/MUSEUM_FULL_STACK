import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})


export const processGiftShopCheckout = async (checkoutData) => {
  const response = await api.post('/api/transactions/gift-shop-checkout', checkoutData)
  return response.data
}

// // Add access token to all requests
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('accessToken')
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`
//   }
//   return config
// })

// // Handle token refresh on 401 errors
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config

//     // If error is 401 and we haven't already tried to refresh
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true

//       try {
//         // Try to refresh the token
//         const { data } = await axios.post(
//           `${API_BASE_URL}/auth/refresh`,
//           {},
//           { withCredentials: true }
//         )

//         // Store new access token
//         localStorage.setItem('accessToken', data.accessToken)

//         // Retry original request with new token
//         originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
//         return api(originalRequest)
//       } catch (refreshError) {
//         // Refresh failed, clear tokens and redirect to login
//         localStorage.removeItem('accessToken')
//         localStorage.removeItem('user')
//         window.location.href = '/login'
//         return Promise.reject(refreshError)
//       }
//     }

//     return Promise.reject(error)
//   }
// )

export default api
