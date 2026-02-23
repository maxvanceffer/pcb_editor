import axios from 'axios'
import { useAppUpdate } from '@/lib/useAppUpdate'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    const serverVersion = response.headers['x-app-version']
    const clientVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown'
    if (serverVersion && clientVersion !== 'unknown' && serverVersion !== clientVersion) {
      useAppUpdate().markUpdateAvailable()
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
