import type { LoginRequest, LoginResponse, User, ApiError } from "@utpost/shared";
import { defineStore } from "pinia"
import { ref, computed } from 'vue'
import { post } from "@/api";

export const useAuthStore = defineStore('session', () => {

    // State
    const user = ref<User | null>()
    const token = ref<string | null>(localStorage.getItem('token'))


    // Getter
    const isAuthenticated = computed(() => Boolean(token.value && user.value))

    // Actions
    async function login(credentials: LoginRequest):
    Promise<void> {
        const data = await post<LoginResponse | ApiError>('/auth/login', credentials)

        if('error' in data) {
            throw new Error(data.error)
        }

        user.value = data.user
        token.value = data.token

        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
    }

      function logout(): void {
        // Nollställ state
        user.value = null
        token.value = null
        // rensa localStorage
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }

    return {
        user,
        token,
        isAuthenticated,
        login,
        logout,
    }
});