import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/api'

interface AuthUser {
  id: number
  email: string
  fullName: string | null
  avatarUrl: string | null
  oauthProvider: string | null
}

export interface LastLogin {
  method: string
  email: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function saveLastLogin(method: string, email: string) {
    localStorage.setItem('last_login_method', method)
    localStorage.setItem('last_login_email', email)
  }

  function getLastLogin(): LastLogin | null {
    const method = localStorage.getItem('last_login_method')
    const email = localStorage.getItem('last_login_email')
    if (!method || !email) return null
    return { method, email }
  }

  async function register(email: string, password: string, fullName?: string) {
    const { data } = await api.post('/api/auth/register', { email, password, fullName })
    token.value = data.token
    user.value = data.user
    localStorage.setItem('auth_token', data.token)
    saveLastLogin('email', email)
  }

  async function login(email: string, password: string) {
    const { data } = await api.post('/api/auth/login', { email, password })
    token.value = data.token
    user.value = data.user
    localStorage.setItem('auth_token', data.token)
    saveLastLogin('email', email)
  }

  async function logout() {
    try {
      await api.delete('/api/auth/logout')
    } catch {
      // ignore
    }
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const { data } = await api.get('/api/auth/me')
      user.value = data
      // Update last login method from server (covers OAuth flow)
      if (data.oauthProvider) {
        saveLastLogin(data.oauthProvider, data.email)
      }
    } catch {
      token.value = null
      user.value = null
      localStorage.removeItem('auth_token')
    }
  }

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('auth_token', newToken)
  }

  return { user, token, isAuthenticated, register, login, logout, fetchMe, setToken, getLastLogin }
})
