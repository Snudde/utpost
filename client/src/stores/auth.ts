import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ApiError, LoginRequest, LoginResponse, User } from '@utpost/shared'
import { post } from '../api'
import { getToken, setToken } from '../lib/token'

// M8: inloggat läge som en Pinia-store (M2:s DoD – nu finns den). Storen vet vem som är
// inloggad; själva token ligger i lib/token.ts och går bara till API-modulen.
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => user.value !== null && getToken() !== null)

  // Fel uppgifter → API:et svarar 401 med { error }. Vi kastar det vidare som ett Error
  // så att vyn kan visa texten – och inget token sparas.
  const login = async (credentials: LoginRequest) => {
    const svar = await post<LoginResponse | ApiError>('/auth/login', credentials)
    if ('error' in svar) throw new Error(svar.error)
    setToken(svar.token)
    user.value = svar.user
  }

  const logout = () => {
    setToken(null)
    user.value = null
  }

  return { user, isLoggedIn, login, logout }
})