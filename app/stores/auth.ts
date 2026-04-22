import { defineStore } from 'pinia'

interface User {
  id: number
  username: string
}

interface AuthState {
  accessToken: string | null
  user: User | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    user: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    authHeader: (state) => state.accessToken ? `Bearer ${state.accessToken}` : null,
  },

  actions: {
    setAuth(token: string, user: User) {
      this.accessToken = token
      this.user = user
      if (import.meta.client) {
        localStorage.setItem('uhours-token', token)
        localStorage.setItem('uhours-user', JSON.stringify(user))
      }
    },

    updateAccessToken(token: string) {
      this.accessToken = token
      if (import.meta.client) {
        localStorage.setItem('uhours-token', token)
      }
    },

    clearAuth() {
      this.accessToken = null
      this.user = null
      if (import.meta.client) {
        localStorage.removeItem('uhours-token')
        localStorage.removeItem('uhours-user')
      }
    },

    rehydrate() {
      if (!import.meta.client) return
      const token = localStorage.getItem('uhours-token')
      const userRaw = localStorage.getItem('uhours-user')
      if (token && userRaw) {
        try {
          this.accessToken = token
          this.user = JSON.parse(userRaw)
        } catch {
          this.clearAuth()
        }
      }
    },
  },
})
